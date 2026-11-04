import "server-only";
import { Op, type Model, type WhereOptions } from "sequelize";
import { isForeignKeyError } from "@server/core/db/errors";
import { Customer, Property, sequelize } from "@server/core/db/models";
import { authorize } from "@server/core/authorization/policy";
import { recordAudit } from "@server/core/audit/audit.service";
import { Errors } from "@server/core/http/errors";
import type { TenantContext } from "@server/core/tenancy/context";
import type { z } from "zod";
import type { ListPage } from "@shared/contracts/api";
import type { CustomerData, CustomerDto, CustomerListQuery, CustomerSort, CustomerTab } from "@shared/contracts/customers";

const SORT_COLUMN: Record<CustomerSort, string> = { display_name: "displayName", billing_city: "billingCity", created_at: "createdAt" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toDto(c: Model): CustomerDto {
  const g = <T = string | null>(k: string) => c.get(k) as T;
  return {
    id: g<string>("id"),
    display_name: g<string>("displayName"),
    customer_type: g("customerType") as CustomerDto["customer_type"],
    first_name: g("firstName"),
    last_name: g("lastName"),
    company_name: g("companyName"),
    email: g("email"),
    phone: g("phone"),
    billing_address_line1: g("billingAddressLine1"),
    billing_address_line2: g("billingAddressLine2"),
    billing_city: g("billingCity"),
    billing_state: g("billingState"),
    billing_postal_code: g("billingPostalCode"),
    notes: g("notes"),
    status: g("status") as CustomerDto["status"],
    created_at: g<Date>("createdAt").toISOString(),
    updated_at: g<Date>("updatedAt").toISOString(),
  };
}

const displayName = (d: CustomerData) =>
  (d.customer_type === "company" ? d.company_name : [d.first_name, d.last_name].filter(Boolean).join(" ")) ||
  d.company_name ||
  "Unnamed customer";

const toRow = (d: CustomerData) => ({
  customerType: d.customer_type,
  displayName: displayName(d),
  firstName: d.first_name,
  lastName: d.last_name,
  companyName: d.company_name,
  email: d.email,
  phone: d.phone,
  billingAddressLine1: d.billing_address_line1,
  billingAddressLine2: d.billing_address_line2,
  billingCity: d.billing_city,
  billingState: d.billing_state,
  billingPostalCode: d.billing_postal_code,
  billingCountry: d.billing_postal_code ? "US" : null,
  notes: d.notes,
  status: d.status,
});

async function findOwned(ctx: TenantContext, id: string) {
  const row = UUID.test(id) ? await Customer.findOne({ where: { id, organizationId: ctx.organizationId } }) : null;
  if (!row) throw Errors.notFound("Customer");
  return row;
}

async function assertUniqueEmail(ctx: TenantContext, email: string | null, exceptId?: string) {
  if (!email) return;
  const dup = await Customer.findOne({
    where: { organizationId: ctx.organizationId, email, ...(exceptId && { id: { [Op.ne]: exceptId } }) },
    attributes: ["id"],
  });
  if (dup) throw Errors.validation({ email: ["Another customer already uses this email."] });
}

export const customerService = {
  async list(ctx: TenantContext, query: z.output<typeof CustomerListQuery>): Promise<ListPage<CustomerDto, CustomerTab>> {
    authorize(ctx, "customer.read");
    // Search + filters apply to every tab; the tab itself is just the status.
    const base: WhereOptions = { organizationId: ctx.organizationId };
    if (query.customer_type !== "all") Object.assign(base, { customerType: query.customer_type });
    if (query.city) Object.assign(base, { billingCity: { [Op.iLike]: query.city } });
    if (query.q) {
      const like = `%${query.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
      Object.assign(base, {
        [Op.or]: ["displayName", "email", "phone", "companyName", "billingCity"].map((f) => ({ [f]: { [Op.iLike]: like } })),
      });
    }
    const where = query.status === "all" ? base : { ...base, status: query.status };
    const [{ rows, count }, grouped] = await Promise.all([
      Customer.findAndCountAll({
        where,
        order: [[SORT_COLUMN[query.sort], query.dir.toUpperCase() === "DESC" ? "DESC NULLS LAST" : "ASC NULLS LAST"], ["id", "ASC"]],
        limit: query.per_page,
        offset: (query.page - 1) * query.per_page,
      }),
      Customer.count({ where: base, group: ["status"] }) as unknown as Promise<{ status: string; count: number }[]>,
    ]);
    const counts = { active: 0, archived: 0, all: 0 };
    for (const g of grouped) {
      counts[g.status as "active" | "archived"] = Number(g.count);
      counts.all += Number(g.count);
    }
    return { items: rows.map(toDto), page: query.page, per_page: query.per_page, total: count, counts };
  },

  /** Distinct billing cities, for the city filter. */
  async cities(ctx: TenantContext): Promise<string[]> {
    authorize(ctx, "customer.read");
    const rows = await Customer.findAll({
      where: { organizationId: ctx.organizationId, billingCity: { [Op.ne]: null } },
      attributes: [[Customer.sequelize!.fn("DISTINCT", Customer.sequelize!.col("billing_city")), "city"]],
      order: [[Customer.sequelize!.col("city"), "ASC"]],
      raw: true,
    });
    return (rows as unknown as { city: string }[]).map((r) => r.city).filter(Boolean);
  },

  async get(ctx: TenantContext, id: string): Promise<CustomerDto> {
    authorize(ctx, "customer.read");
    return toDto(await findOwned(ctx, id));
  },

  async create(ctx: TenantContext, input: CustomerData): Promise<CustomerDto> {
    authorize(ctx, "customer.write");
    await assertUniqueEmail(ctx, input.email);
    const created = toDto(await Customer.create({ organizationId: ctx.organizationId, ...toRow(input) }));
    await recordAudit(ctx, { action: "customer.created", entityType: "customer", entityId: created.id, after: created });
    return created;
  },

  async update(ctx: TenantContext, id: string, input: CustomerData): Promise<CustomerDto> {
    authorize(ctx, "customer.write");
    const row = await findOwned(ctx, id);
    await assertUniqueEmail(ctx, input.email, id);
    const before = toDto(row);
    const after = toDto(await row.update(toRow(input)));
    await recordAudit(ctx, { action: "customer.updated", entityType: "customer", entityId: id, before, after });
    return after;
  },

  /** Hard delete. Customers already linked to estimates, projects or invoices must be archived instead. */
  async remove(ctx: TenantContext, id: string): Promise<void> {
    authorize(ctx, "customer.write");
    const row = await findOwned(ctx, id);
    const before = toDto(row);
    try {
      // Job-site properties go with the customer; any project/estimate on them blocks the delete.
      await sequelize.transaction(async (transaction) => {
        await Property.destroy({ where: { customerId: id, organizationId: ctx.organizationId }, transaction });
        await row.destroy({ transaction });
      });
    } catch (err) {
      if (isForeignKeyError(err))
        throw Errors.conflict("This customer has estimates, projects or invoices. Archive them instead.");
      throw err;
    }
    await recordAudit(ctx, { action: "customer.deleted", entityType: "customer", entityId: id, before });
  },
};
