import "server-only";
import { Op, type Model, type Transaction } from "sequelize";
import { MembershipRole, OrganizationMembership, Role, User, sequelize } from "@server/core/db/models";
import { authorize } from "@server/core/authorization/policy";
import { recordAudit } from "@server/core/audit/audit.service";
import { hashPassword } from "@server/core/auth/crypto";
import { revokeUserSessions } from "@server/core/auth/session";
import { Errors } from "@server/core/http/errors";
import type { TenantContext } from "@server/core/tenancy/context";
import type { CreateMemberInput, MemberDto, MemberStatus, UpdateMemberInput } from "@shared/contracts/access";
import { roleService } from "./role.service";

const include = [
  { model: User, as: "user" },
  { model: Role, as: "roles", through: { attributes: [] } },
];

function toMemberDto(m: Model, ctx: TenantContext): MemberDto {
  const user = m.get("user") as Model;
  const roles = (m.get("roles") as Model[]) ?? [];
  const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : null);
  return {
    id: m.get("id") as string,
    user_id: user.get("id") as string,
    name: user.get("name") as string,
    email: user.get("email") as string,
    status: m.get("status") as MemberStatus,
    job_title: (m.get("jobTitle") as string | null) ?? null,
    role: roles[0] ? { id: roles[0].get("id") as string, name: roles[0].get("name") as string } : null,
    last_login_at: iso(user.get("lastLoginAt")),
    joined_at: iso(m.get("joinedAt")),
    is_self: user.get("id") === ctx.userId,
  };
}

async function findMember(ctx: TenantContext, id: string, transaction?: Transaction) {
  const m = await OrganizationMembership.findOne({
    where: { id, organizationId: ctx.organizationId, status: { [Op.ne]: "removed" } },
    include,
    transaction,
  });
  if (!m) throw Errors.notFound("User");
  return m;
}

/** Keeps at least one active Owner so a company can never lock itself out. */
async function assertOwnerRemains(ctx: TenantContext, excludingMembershipId: string, transaction: Transaction) {
  const owner = await Role.findOne({ where: { organizationId: null, key: "owner" }, transaction });
  if (!owner) return;
  const others = await OrganizationMembership.count({
    where: { organizationId: ctx.organizationId, status: "active", id: { [Op.ne]: excludingMembershipId } },
    include: [{ model: Role, as: "roles", where: { id: owner.get("id") }, through: { attributes: [] } }],
    transaction,
  });
  if (others === 0) throw Errors.conflict("The company needs at least one active Owner.");
}

const isOwner = (m: Model) => ((m.get("roles") as Model[]) ?? []).some((r) => r.get("key") === "owner");

export const memberService = {
  async list(ctx: TenantContext): Promise<MemberDto[]> {
    authorize(ctx, "team.manage");
    const rows = await OrganizationMembership.findAll({
      where: { organizationId: ctx.organizationId, status: { [Op.ne]: "removed" } },
      include,
      order: [[{ model: User, as: "user" }, "name", "ASC"]],
    });
    return rows.map((m) => toMemberDto(m, ctx));
  },

  async get(ctx: TenantContext, id: string): Promise<MemberDto> {
    authorize(ctx, "team.manage");
    return toMemberDto(await findMember(ctx, id), ctx);
  },

  /** Adds a user to the company. Reuses the account if the email already exists. */
  async create(ctx: TenantContext, input: CreateMemberInput): Promise<MemberDto> {
    authorize(ctx, "team.manage");
    const id = await sequelize.transaction(async (transaction) => {
      const roleIds = await roleService.assertAssignable(ctx, [input.role_id], transaction);
      let user = await User.findOne({ where: { email: input.email }, transaction });
      if (!user) {
        user = await User.create(
          {
            email: input.email,
            name: input.name,
            status: "active",
            passwordHash: await hashPassword(input.password),
            passwordChangedAt: new Date(),
          },
          { transaction },
        );
      }
      const userId = user.get("id") as string;

      let membership = await OrganizationMembership.findOne({
        where: { organizationId: ctx.organizationId, userId },
        transaction,
      });
      if (membership && membership.get("status") !== "removed")
        throw Errors.validation({ email: ["This person is already a user in your company."] });
      if (membership) {
        await membership.update(
          { status: "active", jobTitle: input.job_title ?? null, joinedAt: new Date() },
          { transaction },
        );
        await MembershipRole.destroy({ where: { membershipId: membership.get("id") }, transaction });
      } else {
        membership = await OrganizationMembership.create(
          {
            organizationId: ctx.organizationId,
            userId,
            status: "active",
            jobTitle: input.job_title ?? null,
            joinedAt: new Date(),
          },
          { transaction },
        );
      }
      const membershipId = membership.get("id") as string;
      await MembershipRole.bulkCreate(
        roleIds.map((roleId) => ({ membershipId, roleId })),
        { transaction },
      );
      return membershipId;
    });
    const created = await this.get(ctx, id);
    await recordAudit(ctx, { action: "member.created", entityType: "membership", entityId: id, after: created });
    return created;
  },

  async update(ctx: TenantContext, id: string, input: UpdateMemberInput): Promise<MemberDto> {
    authorize(ctx, "team.manage");
    const before = await this.get(ctx, id);
    if (before.is_self && (input.status || input.role_id))
      throw Errors.conflict("You can't change your own roles or status. Ask another admin.");

    await sequelize.transaction(async (transaction) => {
      const m = await findMember(ctx, id, transaction);
      const losesOwner =
        isOwner(m) &&
        (input.status === "suspended" ||
          (input.role_id &&
            !(await Role.count({ where: { id: input.role_id, key: "owner", organizationId: null }, transaction }))));
      if (losesOwner) await assertOwnerRemains(ctx, id, transaction);

      if (input.name !== undefined)
        await User.update({ name: input.name }, { where: { id: before.user_id }, transaction });
      const patch: Record<string, unknown> = {};
      if (input.job_title !== undefined) patch.jobTitle = input.job_title;
      if (input.status) patch.status = input.status;
      if (Object.keys(patch).length) await m.update(patch, { transaction });
      if (input.role_id) {
        const roleIds = await roleService.assertAssignable(ctx, [input.role_id], transaction);
        await MembershipRole.destroy({ where: { membershipId: id }, transaction });
        await MembershipRole.bulkCreate(
          roleIds.map((roleId) => ({ membershipId: id, roleId })),
          { transaction },
        );
      }
    });
    if (input.status === "suspended") await revokeUserSessions(before.user_id);
    const after = await this.get(ctx, id);
    await recordAudit(ctx, { action: "member.updated", entityType: "membership", entityId: id, before, after });
    return after;
  },

  /** Removes the user from this company (the account itself is kept). */
  async remove(ctx: TenantContext, id: string): Promise<void> {
    authorize(ctx, "team.manage");
    const before = await this.get(ctx, id);
    if (before.is_self) throw Errors.conflict("You can't remove yourself.");
    await sequelize.transaction(async (transaction) => {
      const m = await findMember(ctx, id, transaction);
      if (isOwner(m)) await assertOwnerRemains(ctx, id, transaction);
      await MembershipRole.destroy({ where: { membershipId: id }, transaction });
      await m.update({ status: "removed" }, { transaction });
    });
    await recordAudit(ctx, { action: "member.removed", entityType: "membership", entityId: id, before });
  },
};
