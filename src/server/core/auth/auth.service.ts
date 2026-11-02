import "server-only";
import { timingSafeEqual } from "node:crypto";
import { Op, type Model } from "sequelize";
import { AuthOtp, MembershipRole, Organization, OrganizationMembership, Role, sequelize, User } from "@server/core/db/models";
import { env } from "@server/core/config/env";
import { logger } from "@server/core/logger";
import { AppError, Errors } from "@server/core/http/errors";
import { consumeRateLimit, RATE_LIMITS } from "@server/core/rate-limit/rate-limit";
import type {
  AuthUser,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SignupInput,
  VerifyOtpInput,
  VerifyOtpResult,
} from "@shared/contracts/auth";
import { burnPasswordCheck, generateOtp, hashPassword, randomToken, sha256, verifyPassword } from "./crypto";
import { assertLoginAllowed, recordLoginAttempt } from "./login-log.service";
import { createSession, destroySession, getSession, revokeUserSessions, type Session } from "./session";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const invalidCredentials = () => new AppError("invalid_credentials", "Email or password is incorrect", 401);
const invalidCode = () => new AppError("invalid_code", "That code is invalid or has expired", 400);
const invalidResetToken = () => new AppError("invalid_token", "This reset link is invalid or has expired", 400);

function toAuthUser(user: Model, activeOrganizationId: string | null): AuthUser {
  const changed = user.get("passwordChangedAt") as Date | null;
  return {
    id: user.get("id") as string,
    email: user.get("email") as string,
    name: user.get("name") as string,
    phone: (user.get("phone") as string | null) ?? null,
    isSuperAdmin: !!user.get("isSuperAdmin"),
    emailVerified: !!user.get("emailVerifiedAt"),
    activeOrganizationId,
    passwordChangedAt: changed ? changed.toISOString() : null,
  };
}

const sameHash = (a: string, b: string) => timingSafeEqual(Buffer.from(a), Buffer.from(b));

async function sendOtpEmail(email: string, code: string) {
  // TODO: enqueue transactional email job once the mailer integration exists.
  if (env.NODE_ENV !== "production") logger.info({ email, otp: code }, "password reset OTP (dev only)");
}

export const authService = {
  async login(input: LoginInput): Promise<AuthUser> {
    await assertLoginAllowed(input.email);
    const user = await User.findOne({ where: { email: input.email } });
    if (!user) {
      await burnPasswordCheck(input.password);
      await recordLoginAttempt({ email: input.email, success: false, failureReason: "unknown_email" });
      throw invalidCredentials();
    }
    const userId = user.get("id") as string;
    if (!(await verifyPassword(input.password, user.get("passwordHash") as string | null))) {
      await recordLoginAttempt({ email: input.email, userId, success: false, failureReason: "invalid_credentials" });
      throw invalidCredentials();
    }
    if (user.get("status") === "disabled") {
      await recordLoginAttempt({ email: input.email, userId, success: false, failureReason: "account_disabled" });
      throw new AppError("account_disabled", "This account has been disabled", 403);
    }

    const membership = await OrganizationMembership.findOne({
      where: { userId, status: "active" },
      order: [["joinedAt", "ASC NULLS LAST"]],
    });
    const orgId = (membership?.get("organizationId") as string | undefined) ?? null;
    await createSession(userId, orgId, input.remember);
    await recordLoginAttempt({ email: input.email, userId, success: true });
    return toAuthUser(user, orgId);
  },

  /** Self-serve trial signup: new user becomes owner of a new organization and is signed in. */
  async signup(input: SignupInput): Promise<AuthUser> {
    if (await User.findOne({ where: { email: input.email } })) {
      throw Errors.validation({ email: ["An account with this email already exists. Try signing in."] });
    }
    const passwordHash = await hashPassword(input.password);
    const base = input.company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "company";
    const slug = `${base}-${randomToken().slice(0, 6).toLowerCase()}`;

    const { user, orgId } = await sequelize.transaction(async (transaction) => {
      const ownerRole = await Role.findOne({ where: { organizationId: null, key: "owner" }, transaction });
      if (!ownerRole) throw new Error("System roles missing; run db:seed");
      const user = await User.create(
        { email: input.email, name: input.name, passwordHash, passwordChangedAt: new Date(), status: "active" },
        { transaction },
      );
      const org = await Organization.create({ name: input.company, slug, status: "trial", timezone: "UTC" }, { transaction });
      const membership = await OrganizationMembership.create(
        { organizationId: org.get("id"), userId: user.get("id"), status: "active", joinedAt: new Date() },
        { transaction },
      );
      await MembershipRole.create({ membershipId: membership.get("id"), roleId: ownerRole.get("id") }, { transaction });
      return { user, orgId: org.get("id") as string };
    });

    await createSession(user.get("id") as string, orgId, true);
    return toAuthUser(user, orgId);
  },

  logout: () => destroySession(),

  async me(): Promise<AuthUser> {
    const session = await getSession();
    if (!session) throw Errors.unauthenticated();
    const user = await User.findByPk(session.userId);
    if (!user || user.get("status") === "disabled") throw Errors.unauthenticated();
    return toAuthUser(user, session.activeOrganizationId);
  },

  async updateProfile(session: Session, input: { name: string; phone: string | null }): Promise<AuthUser> {
    const user = await User.findByPk(session.userId);
    if (!user) throw Errors.unauthenticated();
    await user.update(input);
    return toAuthUser(user, session.activeOrganizationId);
  },

  /** Always succeeds from the caller's view so the endpoint can't be used to probe for accounts. */
  async forgotPassword({ email }: ForgotPasswordInput): Promise<void> {
    const rl = await consumeRateLimit(RATE_LIMITS.otpEmail, email);
    if (!rl.allowed) throw Errors.rateLimited();

    const user = await User.findOne({ where: { email } });
    if (!user || user.get("status") === "disabled") return;
    const userId = user.get("id") as string;

    const code = generateOtp();
    await sequelize.transaction(async (transaction) => {
      // Only the newest code is usable.
      await AuthOtp.update(
        { consumedAt: new Date() },
        { where: { userId, purpose: "password_reset", consumedAt: null }, transaction },
      );
      await AuthOtp.create(
        { userId, purpose: "password_reset", codeHash: sha256(code), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
        { transaction },
      );
    });
    await sendOtpEmail(email, code);
  },

  async verifyOtp({ email, code }: VerifyOtpInput): Promise<VerifyOtpResult> {
    const user = await User.findOne({ where: { email } });
    if (!user) throw invalidCode();
    const otp = await AuthOtp.findOne({
      where: {
        userId: user.get("id"),
        purpose: "password_reset",
        consumedAt: null,
        verifiedAt: null,
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [["createdAt", "DESC"]],
    });
    if (!otp || (otp.get("attempts") as number) >= OTP_MAX_ATTEMPTS) throw invalidCode();

    if (!sameHash(sha256(code), otp.get("codeHash") as string)) {
      await otp.increment("attempts");
      throw invalidCode();
    }

    const resetToken = randomToken();
    await otp.update({
      verifiedAt: new Date(),
      resetTokenHash: sha256(resetToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });
    return { resetToken };
  },

  async resetPassword({ resetToken, password }: ResetPasswordInput): Promise<void> {
    const otp = await AuthOtp.findOne({
      where: {
        resetTokenHash: sha256(resetToken),
        purpose: "password_reset",
        verifiedAt: { [Op.ne]: null },
        consumedAt: null,
        expiresAt: { [Op.gt]: new Date() },
      },
    });
    if (!otp) throw invalidResetToken();
    const userId = otp.get("userId") as string;
    const passwordHash = await hashPassword(password);

    await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user) throw invalidResetToken();
      // Receiving the code proves ownership of the inbox.
      await user.update(
        {
          passwordHash,
          passwordChangedAt: new Date(),
          ...(!user.get("emailVerifiedAt") && { emailVerifiedAt: new Date() }),
        },
        { transaction },
      );
      await otp.update({ consumedAt: new Date() }, { transaction });
    });
    await revokeUserSessions(userId);
  },

  async changePassword(session: Session, input: ChangePasswordInput): Promise<void> {
    const user = await User.findByPk(session.userId);
    if (!user) throw Errors.unauthenticated();
    if (!(await verifyPassword(input.currentPassword, user.get("passwordHash") as string | null))) {
      throw Errors.validation({ currentPassword: ["Current password is incorrect."] });
    }
    await user.update({ passwordHash: await hashPassword(input.newPassword), passwordChangedAt: new Date() });
    await revokeUserSessions(session.userId, session.id);
  },
};
