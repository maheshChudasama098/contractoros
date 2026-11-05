import "server-only";
import { randomUUID } from "node:crypto";
import { Op, type Model, type Transaction, type WhereOptions } from "sequelize";
import { isUniqueError } from "@server/core/db/errors";
import { Customer, Invoice, InvoiceItem, Organization, Payment, Project, User, sequelize } from "@server/core/db/models";
import { authorize, can } from "@server/core/authorization/policy";
import { recordAudit } from "@server/core/audit/audit.service";
import { Errors } from "@server/core/http/errors";
import type { TenantContext } from "@server/core/tenancy/context";
import { masterService } from "@server/modules/masters";
import type { z } from "zod";
import type {
  InvoiceData,
  InvoiceDetail,
  InvoiceListItem,
  InvoiceListPage,
  InvoiceListQuery,
  InvoicePaymentDto,
  InvoiceSort,
  InvoiceStatus,
  InvoiceTab,
  InvoiceType,
  Party,
} from "@shared/contracts/invoices";
import { computeTotals, fromCents, toCents } from "@shared/lib/invoice-math";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIRST_NUMBER = 1001;
const UNPAID = ["issued", "partially_paid"];
const SORT_COLUMN: Record<Exclude<InvoiceSort, "customer">, string> = {
  invoice_number: "invoiceNumber",
  issue_date: "issueDate",
  due_date: "dueDate",
  total: "total",
  balance_due: "balanceDue",
};

const g = <T = string | null>(m: Model, k: string) => m.get(k) as T;
const ymd = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v).slice(0, 10) : null);
const money = (v: unknown) => fromCents(toCents(v as string));
const todayYmd = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

const listInclude = [
  { model: Customer, as: "customer", attributes: ["id", "displayName"] },
  { model: Project, as: "project", attributes: ["id", "projectNumber", "name"] },
];

/** Overdue is derived, never stored: unpaid and past its due date. */
function effectiveStatus(i: Model, today: string): InvoiceStatus {
  const s = g<string>(i, "status") as InvoiceStatus;
  const due = ymd(g(i, "dueDate"));
  return UNPAID.includes(s) && due && due < today ? "overdue" : s;
}

function toListItem(i: Model, today = todayYmd()): InvoiceListItem {
  const c = g<Model>(i, "customer");
  const p = g<Model | null>(i, "project");
  const status = effectiveStatus(i, today);
  const due = ymd(g(i, "dueDate"));
  return {
    id: g<string>(i, "id"),
    invoice_number: g<string>(i, "invoiceNumber"),
    status,
    invoice_type: g<string>(i, "invoiceType") as InvoiceType,
    customer: { id: g<string>(c, "id"), display_name: g<string>(c, "displayName") },
    project: p ? { id: g<string>(p, "id"), project_number: g<string>(p, "projectNumber"), name: g<string>(p, "name") } : null,
    issue_date: ymd(g(i, "issueDate"))!,
    due_date: due,
    total: money(g(i, "total")),
    amount_paid: money(g(i, "amountPaid")),
    balance_due: money(g(i, "balanceDue")),
    days_overdue: status === "overdue" && due ? daysBetween(due, today) : null,
  };
}

function tabWhere(tab: InvoiceTab, today: string): WhereOptions {
  switch (tab) {
    case "outstanding":
      return { status: UNPAID };
    case "overdue":
      return { status: UNPAID, dueDate: { [Op.lt]: today } };
    case "draft":
    case "paid":
    case "void":
      return { status: tab };
    default:
      return {};
  }
}

async function findOwned(ctx: TenantContext, id: string, transaction?: Transaction, lock = false) {
  const row = UUID.test(id)
    ? await Invoice.findOne({
        where: { id, organizationId: ctx.organizationId },
        transaction,
        ...(lock && transaction && { lock: transaction.LOCK.UPDATE }),
      })
    : null;
  if (!row) throw Errors.notFound("Invoice");
  return row;
}

/** Next INV-#### for the company. The unique index catches races; create() retries once. */
async function nextNumber(ctx: TenantContext, transaction: Transaction) {
  const [rows] = await sequelize.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), :first - 1) + 1 AS n
       FROM invoices WHERE organization_id = :org AND invoice_number ~ '^INV-[0-9]+$'`,
    { replacements: { org: ctx.organizationId, first: FIRST_NUMBER }, transaction },
  );
  return `INV-${(rows as { n: number }[])[0]!.n}`;
}

/** Customer must be active and in this company; the project (if any) must belong to that customer. */
async function assertParties(ctx: TenantContext, d: InvoiceData, transaction: Transaction) {
  const c = await Customer.findOne({ where: { id: d.customer_id, organizationId: ctx.organizationId }, transaction });
  if (!c || c.get("status") !== "active") throw Errors.validation({ customer_id: ["Choose an active customer."] });
  if (d.project_id) {
    const p = await Project.findOne({ where: { id: d.project_id, organizationId: ctx.organizationId }, transaction });
    if (!p) throw Errors.validation({ project_id: ["Choose a project."] });
    if (p.get("customerId") !== d.customer_id) throw Errors.validation({ project_id: ["This project belongs to a different customer."] });
  }
}

/** Writes header totals + replaces line items from validated input. Draft only. */
async function writeDraft(ctx: TenantContext, invoice: Model, d: InvoiceData, transaction: Transaction) {
  const t = computeTotals(
    d.items.map((it) => ({ quantity: it.quantity, unitPriceCents: toCents(it.unit_price), taxable: it.taxable })),
    toCents(d.discount),
    d.tax_rate,
  );
  if (toCents(d.discount) > t.subtotal) throw Errors.validation({ discount: ["Discount can't be more than the subtotal."] });
  await invoice.update(
    {
      customerId: d.customer_id,
      projectId: d.project_id,
      invoiceType: d.invoice_type,
      issueDate: d.issue_date,
      dueDate: d.due_date,
      taxRate: d.tax_rate,
      subtotal: fromCents(t.subtotal),
      discountTotal: fromCents(t.discount),
      taxTotal: fromCents(t.tax),
      total: fromCents(t.total),
      amountPaid: "0.00",
      balanceDue: fromCents(t.total),
      customerNotes: d.customer_notes,
      termsSnapshot: d.terms,
    },
    { transaction },
  );
  await InvoiceItem.destroy({ where: { invoiceId: invoice.get("id") }, transaction });
  await InvoiceItem.bulkCreate(
    d.items.map((it, i) => ({
      organizationId: ctx.organizationId,
      invoiceId: invoice.get("id"),
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      unitPrice: it.unit_price,
      lineSubtotal: fromCents(t.lines[i]!.subtotal),
      taxable: it.taxable,
      taxAmount: fromCents(t.lines[i]!.tax),
      sortOrder: i,
    })),
    { transaction },
  );
}

/**
 * The one accounting rule for balances (spec §12): paid = sum of succeeded payments;
 * balance = total − paid. Status follows from that. Runs inside the payment transaction.
 */
async function reconcile(invoice: Model, transaction: Transaction) {
  const paid = (await Payment.findAll({ where: { invoiceId: invoice.get("id"), status: "succeeded" }, attributes: ["amount"], transaction }))
    .reduce((s, p) => s + toCents(p.get("amount") as string), 0);
  const total = toCents(invoice.get("total") as string);
  const balance = Math.max(0, total - paid);
  const status = balance === 0 ? "paid" : paid > 0 ? "partially_paid" : "issued";
  await invoice.update(
    {
      amountPaid: fromCents(paid),
      balanceDue: fromCents(balance),
      status,
      paidAt: status === "paid" ? (invoice.get("paidAt") ?? new Date()) : null,
    },
    { transaction },
  );
}

const joinAddress = (l1?: unknown, l2?: unknown, city?: unknown, state?: unknown, zip?: unknown) =>
  [l1, l2, [city, [state, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")].filter((x): x is string => !!x);

function billToOf(c: Model): Party {
  return {
    name: g<string>(c, "displayName"),
    email: g(c, "email"),
    phone: g(c, "phone"),
    address_lines: joinAddress(g(c, "billingAddressLine1"), g(c, "billingAddressLine2"), g(c, "billingCity"), g(c, "billingState"), g(c, "billingPostalCode")),
  };
}

export const invoiceService = {
  async list(ctx: TenantContext, q: z.output<typeof InvoiceListQuery>): Promise<InvoiceListPage> {
    authorize(ctx, "invoice.read");
    const today = todayYmd();
    const base: WhereOptions = { organizationId: ctx.organizationId };
    if (q.customer_id) Object.assign(base, { customerId: q.customer_id });
    if (q.project_id) Object.assign(base, { projectId: q.project_id });
    if (q.type !== "all") Object.assign(base, { invoiceType: q.type });
    if (q.q) {
      const like = `%${q.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
      Object.assign(base, {
        [Op.or]: [
          { invoiceNumber: { [Op.iLike]: like } },
          { "$customer.display_name$": { [Op.iLike]: like } },
          { "$project.name$": { [Op.iLike]: like } },
          { "$project.project_number$": { [Op.iLike]: like } },
        ],
      });
    }
    const dir = q.dir === "desc" ? "DESC NULLS LAST" : "ASC NULLS LAST";
    const order = (q.sort === "customer" ? [[{ model: Customer, as: "customer" }, "displayName", dir]] : [[SORT_COLUMN[q.sort], dir]]) as never[];

    const [{ rows, count }, grouped, paid30] = await Promise.all([
      Invoice.findAndCountAll({
        where: { ...base, ...tabWhere(q.tab, today) },
        include: listInclude,
        order: [...order, ["invoiceNumber", "DESC"]] as never,
        limit: q.per_page,
        offset: (q.page - 1) * q.per_page,
        distinct: true,
      }),
      // Per-status counts and balances for tabs + KPIs (filters apply, tab doesn't).
      Invoice.findAll({
        where: base,
        include: listInclude.map((i) => ({ ...i, attributes: [] })),
        attributes: [
          "status",
          [sequelize.literal(`("Invoice"."due_date" < '${today}')`), "late"],
          [sequelize.fn("COUNT", sequelize.col("Invoice.id")), "n"],
          [sequelize.fn("SUM", sequelize.col("Invoice.balance_due")), "balance"],
        ],
        group: ["Invoice.status", "late"],
        raw: true,
      }) as unknown as Promise<{ status: string; late: boolean | null; n: string; balance: string | null }[]>,
      sequelize.query(
        `SELECT COALESCE(SUM(p.amount), 0) AS paid FROM payments p
           JOIN invoices i ON i.id = p.invoice_id
          WHERE p.organization_id = :org AND p.status = 'succeeded'
            AND COALESCE(p.paid_on, p.succeeded_at::date) >= (CURRENT_DATE - 30)`,
        { replacements: { org: ctx.organizationId }, plain: true },
      ) as Promise<{ paid: string } | null>,
    ]);

    const counts: Record<InvoiceTab, number> = { outstanding: 0, draft: 0, overdue: 0, paid: 0, void: 0, all: 0 };
    let outstanding = 0;
    let overdue = 0;
    for (const r of grouped) {
      const n = Number(r.n);
      counts.all += n;
      if (UNPAID.includes(r.status)) {
        counts.outstanding += n;
        outstanding += toCents(money(r.balance));
        if (r.late) {
          counts.overdue += n;
          overdue += toCents(money(r.balance));
        }
      } else if (r.status === "draft" || r.status === "paid" || r.status === "void") counts[r.status] += n;
    }

    return {
      items: rows.map((r) => toListItem(r, today)),
      page: q.page,
      per_page: q.per_page,
      total: count,
      counts,
      summary: { outstanding: fromCents(outstanding), overdue: fromCents(overdue), paid_30d: money(paid30?.paid ?? 0), drafts: counts.draft },
      can_write: can(ctx, "invoice.issue"),
    };
  },

  async get(ctx: TenantContext, id: string): Promise<InvoiceDetail> {
    authorize(ctx, "invoice.read");
    const inv = UUID.test(id)
      ? await Invoice.findOne({
          where: { id, organizationId: ctx.organizationId },
          include: [
            { model: Customer, as: "customer" },
            { model: Project, as: "project", attributes: ["id", "projectNumber", "name"] },
            { model: InvoiceItem, as: "items" },
            { model: Payment, as: "payments", include: [{ model: User, as: "recordedBy", attributes: ["name"] }] },
          ],
          order: [
            [{ model: InvoiceItem, as: "items" }, "sortOrder", "ASC"],
            [{ model: Payment, as: "payments" }, "createdAt", "ASC"],
          ],
        })
      : null;
    if (!inv) throw Errors.notFound("Invoice");
    const org = await Organization.findByPk(ctx.organizationId);
    const methods = new Map((await masterService.options("payment_method")).map((o) => [o.value, o.label]));
    const base = toListItem(inv);
    const status = g<string>(inv, "status");
    const writer = can(ctx, "invoice.issue");
    const snapshot = g<Party | null>(inv, "billToSnapshot");

    return {
      ...base,
      currency: g<string>(inv, "currency"),
      subtotal: money(g(inv, "subtotal")),
      discount_total: money(g(inv, "discountTotal")),
      tax_rate: String(Number(g(inv, "taxRate") ?? 0)),
      tax_total: money(g(inv, "taxTotal")),
      customer_notes: g(inv, "customerNotes"),
      terms: g(inv, "termsSnapshot"),
      void_reason: g(inv, "voidReason"),
      issued_at: g<Date | null>(inv, "issuedAt")?.toISOString() ?? null,
      paid_at: g<Date | null>(inv, "paidAt")?.toISOString() ?? null,
      voided_at: g<Date | null>(inv, "voidedAt")?.toISOString() ?? null,
      items: g<Model[]>(inv, "items").map((it) => ({
        id: g<string>(it, "id"),
        description: g<string>(it, "description"),
        quantity: String(Number(g(it, "quantity"))),
        unit: g<string>(it, "unit"),
        unit_price: money(g(it, "unitPrice")),
        line_subtotal: money(g(it, "lineSubtotal")),
        taxable: g<boolean>(it, "taxable"),
        tax_amount: money(g(it, "taxAmount")),
      })),
      payments: g<Model[]>(inv, "payments").map(
        (p): InvoicePaymentDto => ({
          id: g<string>(p, "id"),
          amount: money(g(p, "amount")),
          paid_on: ymd(g(p, "paidOn")) ?? ymd(g(p, "succeededAt")) ?? ymd(g(p, "createdAt"))!,
          method: g(p, "method"),
          method_label: (g<string | null>(p, "method") && methods.get(g<string>(p, "method"))) || g(p, "method"),
          reference: g(p, "reference"),
          notes: g(p, "notes"),
          status: g(p, "status") as InvoicePaymentDto["status"],
          provider: g(p, "provider") as InvoicePaymentDto["provider"],
          recorded_by: (g<Model | null>(p, "recordedBy")?.get("name") as string | undefined) ?? null,
          created_at: g<Date>(p, "createdAt").toISOString(),
        }),
      ),
      // Issued invoices show the customer as it was at issue time.
      bill_to: snapshot ?? billToOf(g<Model>(inv, "customer")),
      from: {
        name: (org?.get("name") as string) ?? "",
        email: (org?.get("email") as string | null) ?? null,
        phone: (org?.get("phone") as string | null) ?? null,
        address_lines: org ? joinAddress(org.get("addressLine1"), org.get("addressLine2"), org.get("city"), org.get("state"), org.get("postalCode")) : [],
        has_logo: !!org?.get("logoFileId"),
      },
      can: {
        edit: writer && status === "draft",
        issue: writer && status === "draft",
        delete: writer && status === "draft",
        record_payment: writer && UNPAID.includes(status),
        void: can(ctx, "invoice.void") && UNPAID.includes(status) && toCents(g(inv, "amountPaid") as string) === 0,
      },
    };
  },

  async create(ctx: TenantContext, d: InvoiceData): Promise<InvoiceDetail> {
    authorize(ctx, "invoice.issue");
    const attempt = () =>
      sequelize.transaction(async (transaction) => {
        await assertParties(ctx, d, transaction);
        const inv = await Invoice.create(
          {
            organizationId: ctx.organizationId,
            invoiceNumber: await nextNumber(ctx, transaction),
            customerId: d.customer_id,
            issueDate: d.issue_date,
            subtotal: 0,
            total: 0,
            balanceDue: 0,
            status: "draft",
            createdByUserId: ctx.userId,
          },
          { transaction },
        );
        await writeDraft(ctx, inv, d, transaction);
        return inv.get("id") as string;
      });
    let id: string;
    try {
      id = await attempt();
    } catch (err) {
      if (!isUniqueError(err)) throw err;
      id = await attempt(); // someone took the same number at the same moment
    }
    const created = await this.get(ctx, id);
    await recordAudit(ctx, {
      action: "invoice.created",
      entityType: "invoice",
      entityId: id,
      after: { invoice_number: created.invoice_number, total: created.total },
    });
    return created;
  },

  async update(ctx: TenantContext, id: string, d: InvoiceData): Promise<InvoiceDetail> {
    authorize(ctx, "invoice.issue");
    const before = await sequelize.transaction(async (transaction) => {
      const inv = await findOwned(ctx, id, transaction, true);
      if (inv.get("status") !== "draft") throw Errors.conflict("Only draft invoices can be edited. Void it and create a new one instead.");
      await assertParties(ctx, d, transaction);
      const snap = { total: money(inv.get("total")) };
      await writeDraft(ctx, inv, d, transaction);
      return snap;
    });
    const after = await this.get(ctx, id);
    await recordAudit(ctx, { action: "invoice.updated", entityType: "invoice", entityId: id, before, after: { total: after.total } });
    return after;
  },

  async remove(ctx: TenantContext, id: string): Promise<void> {
    authorize(ctx, "invoice.issue");
    const number = await sequelize.transaction(async (transaction) => {
      const inv = await findOwned(ctx, id, transaction, true);
      if (inv.get("status") !== "draft") throw Errors.conflict("Only draft invoices can be deleted. Void issued invoices instead.");
      await InvoiceItem.destroy({ where: { invoiceId: id }, transaction });
      await inv.destroy({ transaction });
      return inv.get("invoiceNumber") as string;
    });
    await recordAudit(ctx, { action: "invoice.deleted", entityType: "invoice", entityId: id, before: { invoice_number: number } });
  },

  /** Locks the invoice: values and bill-to are frozen from here on. */
  async issue(ctx: TenantContext, id: string): Promise<InvoiceDetail> {
    authorize(ctx, "invoice.issue");
    await sequelize.transaction(async (transaction) => {
      const inv = await findOwned(ctx, id, transaction, true);
      if (inv.get("status") !== "draft") throw Errors.conflict("This invoice has already been issued.");
      if (toCents(inv.get("total") as string) <= 0) throw Errors.conflict("Invoice total must be more than $0 to issue.");
      const customer = await Customer.findByPk(inv.get("customerId") as string, { transaction });
      await inv.update({ status: "issued", issuedAt: new Date(), billToSnapshot: billToOf(customer!) }, { transaction });
    });
    const after = await this.get(ctx, id);
    await recordAudit(ctx, {
      action: "invoice.issued",
      entityType: "invoice",
      entityId: id,
      after: { invoice_number: after.invoice_number, total: after.total, due_date: after.due_date },
    });
    return after;
  },

  async void(ctx: TenantContext, id: string, reason: string): Promise<InvoiceDetail> {
    authorize(ctx, "invoice.void");
    await sequelize.transaction(async (transaction) => {
      const inv = await findOwned(ctx, id, transaction, true);
      const status = inv.get("status") as string;
      if (status === "draft") throw Errors.conflict("Drafts can be deleted instead of voided.");
      if (!UNPAID.includes(status)) throw Errors.conflict(`A ${status} invoice can't be voided.`);
      if (toCents(inv.get("amountPaid") as string) > 0)
        throw Errors.conflict("This invoice has payments. Void those payments first, then void the invoice.");
      await inv.update({ status: "void", voidedAt: new Date(), voidReason: reason, balanceDue: "0.00" }, { transaction });
    });
    await recordAudit(ctx, { action: "invoice.voided", entityType: "invoice", entityId: id, after: { reason } });
    return this.get(ctx, id);
  },

  /** Records an offline payment (cash, check, bank transfer…). Idempotent per key. */
  async recordPayment(
    ctx: TenantContext,
    id: string,
    input: { amount: string; paid_on: string; method: string; reference: string | null; notes: string | null; idempotency_key: string },
  ): Promise<InvoiceDetail> {
    authorize(ctx, "invoice.issue");
    if (!(await masterService.isActiveValue("payment_method", input.method))) throw Errors.validation({ method: ["Choose how it was paid."] });
    const key = `manual:${input.idempotency_key}`;
    const existing = await Payment.findOne({ where: { organizationId: ctx.organizationId, provider: "manual", idempotencyKey: key } });
    if (existing) return this.get(ctx, existing.get("invoiceId") as string); // retried submit

    let paymentId = "";
    try {
      await sequelize.transaction(async (transaction) => {
        const inv = await findOwned(ctx, id, transaction, true);
        if (!UNPAID.includes(inv.get("status") as string)) throw Errors.conflict("Payments can only be recorded on issued, unpaid invoices.");
        const amount = toCents(input.amount);
        const balance = toCents(inv.get("balanceDue") as string);
        if (amount > balance) throw Errors.validation({ amount: [`That's more than the balance due ($${fromCents(balance)}).`] });
        if (input.paid_on > todayYmd()) throw Errors.validation({ paid_on: ["Payment date can't be in the future."] });
        const p = await Payment.create(
          {
            id: randomUUID(),
            organizationId: ctx.organizationId,
            invoiceId: id,
            customerId: inv.get("customerId"),
            provider: "manual",
            status: "succeeded",
            amount: fromCents(amount),
            currency: inv.get("currency"),
            succeededAt: new Date(),
            idempotencyKey: key,
            method: input.method,
            reference: input.reference,
            paidOn: input.paid_on,
            notes: input.notes,
            recordedByUserId: ctx.userId,
          },
          { transaction },
        );
        paymentId = p.get("id") as string;
        await reconcile(inv, transaction);
      });
    } catch (err) {
      if (isUniqueError(err)) return this.get(ctx, id); // same key raced in
      throw err;
    }
    await recordAudit(ctx, {
      action: "payment.recorded",
      entityType: "invoice",
      entityId: id,
      after: { payment_id: paymentId, amount: fromCents(toCents(input.amount)), method: input.method },
    });
    return this.get(ctx, id);
  },

  /** Cancels a mistaken manual payment and recalculates the balance. Card payments go through refunds. */
  async voidPayment(ctx: TenantContext, id: string, paymentId: string, reason: string): Promise<InvoiceDetail> {
    authorize(ctx, "invoice.void");
    let amount = "0.00";
    await sequelize.transaction(async (transaction) => {
      const inv = await findOwned(ctx, id, transaction, true);
      const p = UUID.test(paymentId)
        ? await Payment.findOne({ where: { id: paymentId, invoiceId: id, organizationId: ctx.organizationId }, transaction })
        : null;
      if (!p) throw Errors.notFound("Payment");
      if (p.get("provider") !== "manual") throw Errors.conflict("Card payments are reversed with a refund, not voided.");
      if (p.get("status") !== "succeeded") throw Errors.conflict("This payment is already voided.");
      if (inv.get("status") === "void") throw Errors.conflict("This invoice is void.");
      amount = money(p.get("amount"));
      const notes = [p.get("notes"), `Voided: ${reason}`].filter(Boolean).join("\n");
      await p.update({ status: "cancelled", notes }, { transaction });
      await reconcile(inv, transaction);
    });
    await recordAudit(ctx, { action: "payment.voided", entityType: "invoice", entityId: id, before: { payment_id: paymentId, amount }, after: { reason } });
    return this.get(ctx, id);
  },
};
