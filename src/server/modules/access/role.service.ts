import "server-only";
import { Op, type Model, type Transaction } from "sequelize";
import { MembershipRole, Permission, Role, RolePermission, sequelize } from "@server/core/db/models";
import { authorize } from "@server/core/authorization/policy";
import { recordAudit } from "@server/core/audit/audit.service";
import { Errors } from "@server/core/http/errors";
import type { TenantContext } from "@server/core/tenancy/context";
import {
  PERMISSION_GROUPS,
  type CreateRoleInput,
  type PermissionDto,
  type RoleDto,
  type UpdateRoleInput,
} from "@shared/contracts/access";

const LABELS = new Map(PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => [i.key, { ...i, group: g.group }])));

/** Roles visible to an organization: shared system roles + its own custom roles. */
const visibleTo = (organizationId: string) => ({ [Op.or]: [{ organizationId: null }, { organizationId }] });

async function memberCounts(organizationId: string, roleIds: string[]) {
  if (!roleIds.length) return new Map<string, number>();
  const [rows] = await sequelize.query(
    `SELECT mr.role_id, COUNT(*)::int AS n
       FROM membership_roles mr
       JOIN organization_memberships m ON m.id = mr.membership_id
      WHERE m.organization_id = :organizationId AND m.status <> 'removed' AND mr.role_id IN (:roleIds)
      GROUP BY mr.role_id`,
    { replacements: { organizationId, roleIds } },
  );
  return new Map((rows as { role_id: string; n: number }[]).map((r) => [r.role_id, r.n]));
}

function toRoleDto(role: Model, counts: Map<string, number>): RoleDto {
  const perms = (role.get("permissions") as Model[] | undefined) ?? [];
  const id = role.get("id") as string;
  return {
    id,
    key: role.get("key") as string,
    name: role.get("name") as string,
    system: role.get("organizationId") === null,
    permissions: perms.map((p) => p.get("key") as string).sort(),
    member_count: counts.get(id) ?? 0,
  };
}

async function permissionIds(keys: string[], transaction: Transaction) {
  const unique = [...new Set(keys)];
  const rows = await Permission.findAll({ where: { key: unique }, transaction });
  if (rows.length !== unique.length) {
    const known = new Set(rows.map((r) => r.get("key")));
    throw Errors.validation({ permissions: [`Unknown permission: ${unique.filter((k) => !known.has(k)).join(", ")}`] });
  }
  return rows.map((r) => r.get("id") as string);
}

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40) || "role";

async function findOrgRole(ctx: TenantContext, id: string, transaction?: Transaction) {
  const role = await Role.findOne({
    where: { id, ...visibleTo(ctx.organizationId) },
    include: [{ model: Permission, as: "permissions", through: { attributes: [] } }],
    transaction,
  });
  if (!role) throw Errors.notFound("Role");
  return role;
}

export const roleService = {
  listPermissions(ctx: TenantContext): PermissionDto[] {
    authorize(ctx, "team.manage");
    return [...LABELS.values()];
  },

  async list(ctx: TenantContext): Promise<RoleDto[]> {
    authorize(ctx, "team.manage");
    const roles = await Role.findAll({
      where: visibleTo(ctx.organizationId),
      include: [{ model: Permission, as: "permissions", through: { attributes: [] } }],
      order: [
        ["organizationId", "ASC NULLS FIRST"],
        ["name", "ASC"],
      ],
    });
    const counts = await memberCounts(
      ctx.organizationId,
      roles.map((r) => r.get("id") as string),
    );
    return roles.map((r) => toRoleDto(r, counts));
  },

  async get(ctx: TenantContext, id: string): Promise<RoleDto> {
    authorize(ctx, "team.manage");
    const role = await findOrgRole(ctx, id);
    return toRoleDto(role, await memberCounts(ctx.organizationId, [id]));
  },

  async create(ctx: TenantContext, input: CreateRoleInput): Promise<RoleDto> {
    authorize(ctx, "team.manage");
    const id = await sequelize.transaction(async (transaction) => {
      const taken = await Role.findOne({ where: { name: input.name, ...visibleTo(ctx.organizationId) }, transaction });
      if (taken) throw Errors.validation({ name: ["A role with this name already exists."] });
      const base = slug(input.name);
      const existingKeys = new Set(
        (await Role.findAll({ where: visibleTo(ctx.organizationId), attributes: ["key"], transaction })).map((r) =>
          r.get("key"),
        ),
      );
      let key = base;
      for (let i = 2; existingKeys.has(key); i++) key = `${base}_${i}`;

      const role = await Role.create({ organizationId: ctx.organizationId, key, name: input.name }, { transaction });
      const roleId = role.get("id") as string;
      const ids = await permissionIds(input.permissions, transaction);
      await RolePermission.bulkCreate(
        ids.map((permissionId) => ({ roleId, permissionId })),
        { transaction },
      );
      return roleId;
    });
    await recordAudit(ctx, { action: "role.created", entityType: "role", entityId: id, after: input });
    return this.get(ctx, id);
  },

  async update(ctx: TenantContext, id: string, input: UpdateRoleInput): Promise<RoleDto> {
    authorize(ctx, "team.manage");
    const before = await this.get(ctx, id);
    if (before.system) throw Errors.conflict("System roles can't be changed. Create a custom role instead.");

    await sequelize.transaction(async (transaction) => {
      if (input.name && input.name !== before.name) {
        const taken = await Role.findOne({
          where: { name: input.name, id: { [Op.ne]: id }, ...visibleTo(ctx.organizationId) },
          transaction,
        });
        if (taken) throw Errors.validation({ name: ["A role with this name already exists."] });
        await Role.update({ name: input.name }, { where: { id }, transaction });
      }
      if (input.permissions) {
        const ids = await permissionIds(input.permissions, transaction);
        await RolePermission.destroy({ where: { roleId: id }, transaction });
        await RolePermission.bulkCreate(
          ids.map((permissionId) => ({ roleId: id, permissionId })),
          { transaction },
        );
      }
    });
    const after = await this.get(ctx, id);
    await recordAudit(ctx, { action: "role.updated", entityType: "role", entityId: id, before, after });
    return after;
  },

  async remove(ctx: TenantContext, id: string): Promise<void> {
    authorize(ctx, "team.manage");
    const role = await this.get(ctx, id);
    if (role.system) throw Errors.conflict("System roles can't be deleted.");
    if (role.member_count > 0)
      throw Errors.conflict(`This role is assigned to ${role.member_count} user(s). Reassign them first.`);
    await sequelize.transaction(async (transaction) => {
      await MembershipRole.destroy({ where: { roleId: id }, transaction });
      await RolePermission.destroy({ where: { roleId: id }, transaction });
      await Role.destroy({ where: { id, organizationId: ctx.organizationId }, transaction });
    });
    await recordAudit(ctx, { action: "role.deleted", entityType: "role", entityId: id, before: role });
  },

  /** Throws unless every id is a role this organization may assign. */
  async assertAssignable(ctx: TenantContext, roleIds: string[], transaction?: Transaction) {
    const unique = [...new Set(roleIds)];
    const n = await Role.count({ where: { id: unique, ...visibleTo(ctx.organizationId) }, transaction });
    if (n !== unique.length) throw Errors.validation({ role_ids: ["One or more roles are invalid."] });
    return unique;
  },
};
