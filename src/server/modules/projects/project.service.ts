import "server-only";
import { Op, type Model, type Transaction, type WhereOptions } from "sequelize";
import { isForeignKeyError, isUniqueError } from "@server/core/db/errors";
import { Customer, Project, Property, sequelize } from "@server/core/db/models";
import { authorize } from "@server/core/authorization/policy";
import { recordAudit } from "@server/core/audit/audit.service";
import { Errors } from "@server/core/http/errors";
import type { TenantContext } from "@server/core/tenancy/context";
import type { Paginated } from "@shared/contracts/api";
import { OPEN_PROJECT_STATUSES, type ProjectData, type ProjectDto } from "@shared/contracts/projects";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIRST_NUMBER = 1001;

const include = [
  { model: Customer, as: "customer", attributes: ["id", "displayName"] },
  { model: Property, as: "property" },
];

function toDto(p: Model): ProjectDto {
  const g = <T = string | null>(m: Model, k: string) => m.get(k) as T;
  const c = p.get("customer") as Model;
  const s = p.get("property") as Model;
  return {
    id: g<string>(p, "id"),
    project_number: g<string>(p, "projectNumber"),
    name: g<string>(p, "name"),
    status: g(p, "status") as ProjectDto["status"],
    priority: g(p, "priority") as ProjectDto["priority"],
    planned_start_date: g(p, "plannedStartDate"),
    planned_end_date: g(p, "plannedEndDate"),
    contract_value: String(g(p, "contractValue") ?? "0"),
    customer: { id: g<string>(c, "id"), display_name: g<string>(c, "displayName") },
    site: {
      address_line1: g<string>(s, "addressLine1"),
      address_line2: g(s, "addressLine2"),
      city: g<string>(s, "city"),
      state: g<string>(s, "state"),
      postal_code: g<string>(s, "postalCode"),
    },
    created_at: g<Date>(p, "createdAt").toISOString(),
  };
}

const projectRow = (d: ProjectData) => ({
  name: d.name,
  customerId: d.customer_id,
  status: d.status,
  priority: d.priority,
  plannedStartDate: d.planned_start_date,
  plannedEndDate: d.planned_end_date,
  contractValue: d.contract_value,
});

const siteRow = (d: ProjectData) => ({
  addressLine1: d.site_address_line1,
  addressLine2: d.site_address_line2,
  city: d.site_city,
  state: d.site_state,
  postalCode: d.site_postal_code,
});

async function findOwned(ctx: TenantContext, id: string, transaction?: Transaction) {
  const row = UUID.test(id)
    ? await Project.findOne({ where: { id, organizationId: ctx.organizationId }, include, transaction })
    : null;
  if (!row) throw Errors.notFound("Project");
  return row;
}

/** The customer must belong to this company and not be archived. */
async function assertCustomer(ctx: TenantContext, customerId: string, transaction: Transaction) {
  const c = await Customer.findOne({ where: { id: customerId, organizationId: ctx.organizationId }, transaction });
  if (!c || c.get("status") !== "active") throw Errors.validation({ customer_id: ["Choose an active customer."] });
}

/** Reuses the customer's property at the same street + ZIP, otherwise creates one. */
async function resolveProperty(ctx: TenantContext, d: ProjectData, transaction: Transaction) {
  const existing = await Property.findOne({
    where: {
      organizationId: ctx.organizationId,
      customerId: d.customer_id,
      addressLine1: { [Op.iLike]: d.site_address_line1 },
      postalCode: d.site_postal_code,
    },
    transaction,
  });
  if (existing) {
    await existing.update(siteRow(d), { transaction });
    return existing.get("id") as string;
  }
  const created = await Property.create({ organizationId: ctx.organizationId, customerId: d.customer_id, ...siteRow(d) }, { transaction });
  return created.get("id") as string;
}

/** Next P-#### for the company. The unique index catches races; create() retries once. */
async function nextNumber(ctx: TenantContext, transaction: Transaction) {
  const [rows] = await sequelize.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(project_number FROM 3) AS INTEGER)), :first - 1) + 1 AS n
       FROM projects WHERE organization_id = :org AND project_number ~ '^P-[0-9]+$'`,
    { replacements: { org: ctx.organizationId, first: FIRST_NUMBER }, transaction },
  );
  return `P-${(rows as { n: number }[])[0]!.n}`;
}

export const projectService = {
  async list(ctx: TenantContext, query: { page: number; per_page: number; status: string; q?: string; customer_id?: string }): Promise<Paginated<ProjectDto>> {
    authorize(ctx, "project.read");
    const where: WhereOptions = { organizationId: ctx.organizationId };
    if (query.status === "open") Object.assign(where, { status: OPEN_PROJECT_STATUSES });
    else if (query.status !== "all") Object.assign(where, { status: query.status });
    if (query.customer_id) Object.assign(where, { customerId: query.customer_id });
    if (query.q) {
      const like = `%${query.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
      Object.assign(where, {
        [Op.or]: [
          { name: { [Op.iLike]: like } },
          { projectNumber: { [Op.iLike]: like } },
          { "$customer.display_name$": { [Op.iLike]: like } },
          { "$property.city$": { [Op.iLike]: like } },
        ],
      });
    }
    const { rows, count } = await Project.findAndCountAll({
      where,
      include,
      order: [["createdAt", "DESC"]],
      limit: query.per_page,
      offset: (query.page - 1) * query.per_page,
      distinct: true,
    });
    return { items: rows.map(toDto), page: query.page, per_page: query.per_page, total: count };
  },

  async get(ctx: TenantContext, id: string): Promise<ProjectDto> {
    authorize(ctx, "project.read");
    return toDto(await findOwned(ctx, id));
  },

  async create(ctx: TenantContext, input: ProjectData): Promise<ProjectDto> {
    authorize(ctx, "project.write");
    const attempt = () =>
      sequelize.transaction(async (transaction) => {
        await assertCustomer(ctx, input.customer_id, transaction);
        const propertyId = await resolveProperty(ctx, input, transaction);
        const p = await Project.create(
          {
            organizationId: ctx.organizationId,
            projectNumber: await nextNumber(ctx, transaction),
            propertyId,
            createdByUserId: ctx.userId,
            ...projectRow(input),
          },
          { transaction },
        );
        return p.get("id") as string;
      });
    let id: string;
    try {
      id = await attempt();
    } catch (err) {
      if (!isUniqueError(err)) throw err;
      id = await attempt(); // someone took the same number at the same moment
    }
    const created = await this.get(ctx, id);
    await recordAudit(ctx, { action: "project.created", entityType: "project", entityId: id, after: created });
    return created;
  },

  async update(ctx: TenantContext, id: string, input: ProjectData): Promise<ProjectDto> {
    authorize(ctx, "project.write");
    const before = await this.get(ctx, id);
    await sequelize.transaction(async (transaction) => {
      const p = await findOwned(ctx, id, transaction);
      if (input.customer_id !== before.customer.id) await assertCustomer(ctx, input.customer_id, transaction);
      const propertyId = await resolveProperty(ctx, input, transaction);
      await p.update({ ...projectRow(input), propertyId }, { transaction });
    });
    const after = await this.get(ctx, id);
    await recordAudit(ctx, { action: "project.updated", entityType: "project", entityId: id, before, after });
    return after;
  },

  /** Hard delete. Projects with tasks, expenses, invoices or other records must be cancelled instead. */
  async remove(ctx: TenantContext, id: string): Promise<void> {
    authorize(ctx, "project.write");
    const before = await this.get(ctx, id);
    try {
      await (await findOwned(ctx, id)).destroy();
    } catch (err) {
      if (isForeignKeyError(err))
        throw Errors.conflict("This project has tasks, expenses, invoices or other records. Set it to Cancelled instead.");
      throw err;
    }
    await recordAudit(ctx, { action: "project.deleted", entityType: "project", entityId: id, before });
  },
};
