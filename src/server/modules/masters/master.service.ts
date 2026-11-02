import "server-only";
import { Op, type Model, type ModelStatic, type WhereOptions } from "sequelize";
import { Industry, MasterItem, User, sequelize } from "@server/core/db/models";
import { Errors } from "@server/core/http/errors";
import type { Session } from "@server/core/auth/session";
import {
  MASTER_TYPES,
  type MasterItemDto,
  type MasterItemInput,
  type MasterOption,
  type MasterType,
  type UpdateMasterItemInput,
} from "@shared/contracts/masters";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Where each master lives and which organization column points at it.
 * Industry keeps its own table (FK by id); the rest share master_items (referenced by code).
 */
type Source = { model: ModelStatic<Model>; scope: WhereOptions; usedIn: { table: string; column: string }; byCode: boolean };
const item = (type: string, table: string, column: string): Source => ({
  model: MasterItem,
  scope: { type },
  usedIn: { table, column },
  byCode: true,
});
const SOURCES: Record<MasterType, Source> = {
  industry: { model: Industry, scope: {}, usedIn: { table: "organizations", column: "industry_id" }, byCode: false },
  company_size: item("company_size", "organizations", "company_size"),
  time_zone: item("time_zone", "organizations", "timezone"),
  expense_category: item("expense_category", "project_expenses", "category"),
  payment_method: item("payment_method", "project_expenses", "payment_method"),
};

const valueOf = (type: MasterType, row: Model) =>
  (SOURCES[type].byCode ? row.get("code") : row.get("id")) as string;

/** How many records reference each value. Table/column names come from SOURCES, never from input. */
async function usage(type: MasterType, values: string[]) {
  if (!values.length) return new Map<string, number>();
  const { table, column: col } = SOURCES[type].usedIn;
  const [rows] = await sequelize.query(
    `SELECT ${col}::text AS v, COUNT(*)::int AS n FROM ${table} WHERE ${col}::text IN (:values) GROUP BY ${col}`,
    { replacements: { values } },
  );
  return new Map((rows as { v: string; n: number }[]).map((r) => [r.v, r.n]));
}

function toDto(type: MasterType, row: Model, counts: Map<string, number>): MasterItemDto {
  const value = valueOf(type, row);
  return {
    id: row.get("id") as string,
    value,
    code: SOURCES[type].byCode ? (row.get("code") as string) : null,
    name: row.get("name") as string,
    sort_order: row.get("sortOrder") as number,
    is_active: row.get("isActive") as boolean,
    in_use: counts.get(value) ?? 0,
  };
}

/** Masters are platform-wide; only super admins may change them. */
async function assertSuperAdmin(session: Session) {
  const user = await User.findByPk(session.userId, { attributes: ["isSuperAdmin"] });
  if (!user?.get("isSuperAdmin")) throw Errors.forbidden();
}

async function findOr404(type: MasterType, id: string) {
  const { model, scope } = SOURCES[type];
  const row = UUID.test(id) ? await model.findOne({ where: { id, ...scope } }) : null;
  if (!row) throw Errors.notFound(MASTER_TYPES[type].singular);
  return row;
}

async function assertUnique(type: MasterType, field: "name" | "code", value: string, exceptId?: string) {
  const { model, scope } = SOURCES[type];
  const dup = await model.findOne({
    where: { ...scope, [field]: { [Op.iLike]: value.replace(/[\\%_]/g, (m) => `\\${m}`) }, ...(exceptId && { id: { [Op.ne]: exceptId } }) },
    attributes: ["id"],
  });
  if (dup) throw Errors.validation({ [field]: [`This ${field} already exists.`] });
}

const order: [string, string][] = [["sortOrder", "ASC"], ["name", "ASC"]];

export const masterService = {
  /** Active options for menus (any signed-in user). */
  async options(type: MasterType): Promise<MasterOption[]> {
    const { model, scope } = SOURCES[type];
    const rows = await model.findAll({ where: { ...scope, isActive: true }, order });
    return rows.map((r) => ({ value: valueOf(type, r), label: r.get("name") as string }));
  },

  /** True if `value` is an active item of this master (used to validate submitted choices). */
  async isActiveValue(type: MasterType, value: string): Promise<boolean> {
    const { model, scope, byCode } = SOURCES[type];
    if (!byCode && !UUID.test(value)) return false;
    return !!(await model.count({ where: { ...scope, isActive: true, [byCode ? "code" : "id"]: value } }));
  },

  async labelOf(type: MasterType, value: string | null): Promise<string | null> {
    if (!value) return null;
    const { model, scope, byCode } = SOURCES[type];
    if (!byCode && !UUID.test(value)) return null;
    const row = await model.findOne({ where: { ...scope, [byCode ? "code" : "id"]: value }, attributes: ["name"] });
    return (row?.get("name") as string | undefined) ?? null;
  },

  async list(session: Session, type: MasterType): Promise<MasterItemDto[]> {
    await assertSuperAdmin(session);
    const { model, scope } = SOURCES[type];
    const rows = await model.findAll({ where: scope, order });
    const counts = await usage(type, rows.map((r) => valueOf(type, r)));
    return rows.map((r) => toDto(type, r, counts));
  },

  async create(session: Session, type: MasterType, input: MasterItemInput & { sort_order: number; is_active: boolean }) {
    await assertSuperAdmin(session);
    const { model, scope, byCode } = SOURCES[type];
    if (byCode && !input.code) throw Errors.validation({ code: ["Code is required."] });
    await assertUnique(type, "name", input.name);
    if (byCode) await assertUnique(type, "code", input.code!);
    const row = await model.create({
      ...scope,
      ...(byCode && { code: input.code }),
      name: input.name,
      sortOrder: input.sort_order,
      isActive: input.is_active,
    });
    return toDto(type, row, new Map());
  },

  async update(session: Session, type: MasterType, id: string, input: UpdateMasterItemInput) {
    await assertSuperAdmin(session);
    const { byCode } = SOURCES[type];
    const row = await findOr404(type, id);
    const counts = await usage(type, [valueOf(type, row)]);
    const inUse = counts.get(valueOf(type, row)) ?? 0;
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) {
      await assertUnique(type, "name", input.name, id);
      patch.name = input.name;
    }
    if (byCode && input.code !== undefined && input.code !== row.get("code")) {
      if (inUse) throw Errors.validation({ code: [`Code can't change: ${inUse} record${inUse === 1 ? "" : "s"} use it.`] });
      await assertUnique(type, "code", input.code, id);
      patch.code = input.code;
    }
    if (input.sort_order !== undefined) patch.sortOrder = Number(input.sort_order);
    if (input.is_active !== undefined) patch.isActive = input.is_active;
    await row.update(patch);
    return toDto(type, row, await usage(type, [valueOf(type, row)]));
  },

  /** Items companies already use can only be deactivated, so existing data stays readable. */
  async remove(session: Session, type: MasterType, id: string): Promise<void> {
    await assertSuperAdmin(session);
    const row = await findOr404(type, id);
    const inUse = (await usage(type, [valueOf(type, row)])).get(valueOf(type, row)) ?? 0;
    if (inUse) throw Errors.conflict(`${inUse} record${inUse === 1 ? " uses" : "s use"} this. Deactivate it instead.`);
    await row.destroy();
  },
};
