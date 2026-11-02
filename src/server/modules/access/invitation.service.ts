import "server-only";
import { Op, type Model, type Transaction } from "sequelize";
import {
  Invitation,
  InvitationRole,
  MembershipRole,
  Organization,
  OrganizationMembership,
  Role,
  User,
  sequelize,
} from "@server/core/db/models";
import { authorize } from "@server/core/authorization/policy";
import { recordAudit } from "@server/core/audit/audit.service";
import { hashPassword, randomToken, sha256, verifyPassword } from "@server/core/auth/crypto";
import { createSession } from "@server/core/auth/session";
import { env } from "@server/core/config/env";
import { logger } from "@server/core/logger";
import { AppError, Errors } from "@server/core/http/errors";
import type { TenantContext } from "@server/core/tenancy/context";
import {
  INVITE_TTL_DAYS,
  type AcceptInvitationInput,
  type InvitationDto,
  type InvitationPreview,
  type InvitationWithLink,
} from "@shared/contracts/access";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalidInvite = () => new AppError("invalid_invitation", "This invitation is invalid or has expired", 400);

const include = [
  { model: Role, as: "roles", through: { attributes: [] } },
  { model: User, as: "invitedBy", attributes: ["name"] },
];

function toDto(inv: Model): InvitationDto {
  const role = ((inv.get("roles") as Model[]) ?? [])[0];
  const by = inv.get("invitedBy") as Model | null;
  const expires = inv.get("expiresAt") as Date;
  return {
    id: inv.get("id") as string,
    email: inv.get("email") as string,
    role: role ? { id: role.get("id") as string, name: role.get("name") as string } : null,
    invited_by: (by?.get("name") as string | undefined) ?? null,
    expires_at: expires.toISOString(),
    expired: expires < new Date(),
    created_at: (inv.get("createdAt") as Date).toISOString(),
  };
}

const inviteUrl = (token: string) => `${env.APP_URL}/invite/${token}`;

async function sendInviteEmail(email: string, url: string) {
  // TODO: enqueue transactional email job once the mailer integration exists.
  if (env.NODE_ENV !== "production") logger.info({ email, url }, "invitation link (dev only)");
}

/** Issues a fresh token on an invitation row; returns the raw token (only ever seen here). */
async function issueToken(inv: Model, transaction: Transaction) {
  const token = randomToken();
  await inv.update(
    { tokenHash: sha256(token), expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000) },
    { transaction },
  );
  return token;
}

/** Valid = not accepted, not revoked, not expired. Lock it when accepting so it can't be used twice. */
async function findByToken(token: string, transaction?: Transaction) {
  return Invitation.findOne({
    where: { tokenHash: sha256(token), acceptedAt: null, revokedAt: null, expiresAt: { [Op.gt]: new Date() } },
    include,
    transaction,
    ...(transaction && { lock: transaction.LOCK.UPDATE, include: undefined }),
  });
}

export const invitationService = {
  /**
   * Sends (or re-sends) the invite link for a user already added as "Invited".
   * Each call issues a new 7-day link; earlier links stop working.
   */
  async inviteMember(ctx: TenantContext, membershipId: string): Promise<InvitationWithLink> {
    authorize(ctx, "team.manage");
    const { id, token } = await sequelize.transaction(async (transaction) => {
      const m = UUID.test(membershipId)
        ? await OrganizationMembership.findOne({
            where: { id: membershipId, organizationId: ctx.organizationId },
            include: [{ model: User, as: "user", attributes: ["email"] }],
            transaction,
          })
        : null;
      if (!m || m.get("status") === "removed") throw Errors.notFound("User");
      if (m.get("status") !== "invited") throw Errors.conflict("Only invited users can be sent an invite link.");
      const email = (m.get("user") as Model).get("email") as string;

      await Invitation.update(
        { revokedAt: new Date() },
        { where: { organizationId: ctx.organizationId, email, acceptedAt: null, revokedAt: null }, transaction },
      );
      const inv = await Invitation.create(
        {
          organizationId: ctx.organizationId,
          email,
          tokenHash: sha256(randomToken()), // replaced by issueToken
          invitedByUserId: ctx.userId,
          expiresAt: new Date(),
        },
        { transaction },
      );
      // Snapshot the role for the invite preview; the membership's own roles stay the source of truth.
      const roles = await MembershipRole.findAll({ where: { membershipId }, transaction });
      await InvitationRole.bulkCreate(
        roles.map((r) => ({ invitationId: inv.get("id"), roleId: r.get("roleId") })),
        { transaction },
      );
      return { id: inv.get("id") as string, token: await issueToken(inv, transaction) };
    });
    const inv = await Invitation.findByPk(id, { include });
    const dto = toDto(inv!);
    await sendInviteEmail(dto.email, inviteUrl(token));
    await recordAudit(ctx, { action: "invitation.sent", entityType: "membership", entityId: membershipId, after: dto });
    return { ...dto, invite_url: inviteUrl(token) };
  },

  // ------------------------------------------------------------ public (token holder)

  async preview(token: string): Promise<InvitationPreview> {
    const inv = await findByToken(token);
    if (!inv) throw invalidInvite();
    const org = await Organization.findByPk(inv.get("organizationId") as string, { attributes: ["name"] });
    const dto = toDto(inv);
    return {
      email: dto.email,
      organization_name: (org?.get("name") as string) ?? "",
      role_name: dto.role?.name ?? null,
      invited_by: dto.invited_by,
      expires_at: dto.expires_at,
      account_exists: !!(await User.count({ where: { email: dto.email, passwordHash: { [Op.ne]: null } } })),
    };
  },

  /** Creates the account (or verifies an existing one), joins the company and signs the person in. */
  async accept(input: AcceptInvitationInput): Promise<{ redirect: string }> {
    const { userId, organizationId, invitationId } = await sequelize.transaction(async (transaction) => {
      const inv = await findByToken(input.token, transaction);
      if (!inv) throw invalidInvite();
      const organizationId = inv.get("organizationId") as string;
      const email = inv.get("email") as string;

      let user = await User.findOne({ where: { email }, transaction });
      if (user && !user.get("passwordHash")) {
        // Added by an admin without a password: this link is how they set it.
        if (input.password.length < 10) throw Errors.validation({ password: ["Use at least 10 characters."] });
        const name = input.name?.trim();
        await user.update(
          {
            ...(name && name.length >= 2 && { name }),
            passwordHash: await hashPassword(input.password),
            passwordChangedAt: new Date(),
            status: "active",
            emailVerifiedAt: new Date(),
          },
          { transaction },
        );
      } else if (user) {
        if (!(await verifyPassword(input.password, user.get("passwordHash") as string | null)))
          throw Errors.validation({ password: ["Password is incorrect."] });
        if (user.get("status") === "disabled") throw new AppError("account_disabled", "This account has been disabled", 403);
      } else {
        const name = input.name?.trim() ?? "";
        if (name.length < 2) throw Errors.validation({ name: ["Enter your full name."] });
        if (input.password.length < 10) throw Errors.validation({ password: ["Use at least 10 characters."] });
        user = await User.create(
          {
            email,
            name,
            passwordHash: await hashPassword(input.password),
            passwordChangedAt: new Date(),
            status: "active",
            emailVerifiedAt: new Date(), // the link reached their inbox
          },
          { transaction },
        );
      }
      const userId = user.get("id") as string;

      // Invites are only sent to users an admin already added, so the "invited" membership must exist.
      const m = await OrganizationMembership.findOne({ where: { organizationId, userId }, transaction });
      if (!m || m.get("status") !== "invited") throw invalidInvite();
      await m.update({ status: "active", joinedAt: new Date() }, { transaction });
      await inv.update({ acceptedAt: new Date() }, { transaction });
      return { userId, organizationId, invitationId: inv.get("id") as string };
    });

    await createSession(userId, organizationId, false);
    logger.info({ invitationId, userId, organizationId }, "invitation accepted");
    return { redirect: "/dashboard" };
  },
};
