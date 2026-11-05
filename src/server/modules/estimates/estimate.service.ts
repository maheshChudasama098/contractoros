import "server-only";
import { Op, type Model, type Transaction, type WhereOptions } from "sequelize";
import type { z } from "zod";
import { isUniqueError } from "@server/core/db/errors";
import { Contract, Customer, Estimate, EstimateItem, EstimateVersion, Project, Proposal, sequelize } from "@server/core/db/models";
import { authorize, can } from "@server/core/authorization/policy";
import { recordAudit } from "@server/core/audit/audit.service";
import { Errors } from "@server/core/http/errors";
import type { TenantContext } from "@server/core/tenancy/context";
import { computeTotals, fromCents, lineCents, toCents } from "@shared/lib/invoice-math";
import type {
  EstimateData,
  EstimateDetail,
  EstimateListItem,
  EstimateListPage,
  EstimateListQuery,
  EstimateSort,
  EstimateStatus,
  EstimateTab,
  EstimateVersionDto,
  ItemType,
  ProposalSummary,
} from "@shared/contracts/estimates";
import { UUID, customerParty, g, iso, money, nextNumber, orgParty, todayYmd, ymd } from "./shared";

const OPEN: EstimateStatus[] = ["draft", "issued"];
const SORT_COLUMN: Record<Exclude<EstimateSort, "customer" | "total" | "valid_until">, string> = {
  estimate_number: "estimateNumber",
  created_at: "createdAt",
};

const listInclude = [
  { model: Customer, as: "customer", attributes: ["id", "displayName"] },
  { model: Project, as: "project", attributes: ["id", "projectNumber", "name"] },
  { model: EstimateVersion, as: "currentVersion", attributes: ["id", "versionNumber", "title", "total", "validUntil", "issuedAt"] },
];

/** Issued estimates past their valid-until date read as expired (derived, like invoice overdue). */
function effectiveStatus(e: Model, today: string): EstimateStatus {
  const s = g<EstimateStatus>(e, "status");
  const v = g<Model | null>(e, "currentVersion");
  const until = v ? ymd(v.get("validUntil")) : null;
  return s === "issued" && until && until < today ? "expired" : s;
}

function toListItem(e: Model, today = todayYmd()): EstimateListItem {
  const c = g<Model>(e, "customer");
  const p = g<Model | null>(e, "project");
  const v = g<Model>(e, "currentVersion");
  return {
    id: g<string>(e, "id"),
    estimate_number: g<string>(e, "estimateNumber"),
    title: g<string>(v, "title"),
    status: effectiveStatus(e, today),
    customer: { id: g<string>(c, "id"), display_name: g<string>(c, "displayName") },
    project: p ? { id: g<string>(p, "id"), project_number: g<string>(p, "projectNumber"), name: g<string>(p, "name") } : null,
    version_number: g<number>(v, "versionNumber"),
    has_draft: !v.get("issuedAt"),
    total: money(v.get("total")),
    valid_until: ymd(v.get("validUntil")),
    created_at: g<Date>(e, "createdAt").toISOString(),
  };
}

function tabWhere(tab: EstimateTab): WhereOptions {
  if (tab === "open") return { status: OPEN };
  if (tab === "all") return {};
  return { status: tab };
}

async function findOwned(ctx: TenantContext, id: string, transaction?: Transaction) {
  const row = UUID.test(id)
    ? await Estimate.findOne({ where: { id, organizationId: ctx.organizationId }, transaction, ...(transaction && { lock: transaction.LOCK.UPDATE }) })
    : null;
  if (!row) throw Errors.notFound("Estimate");
  return row;
}

async function latestVersion(estimateId: string, transaction?: Transaction) {
  return (await EstimateVersion.findOne({ where: { estimateId }, order: [["versionNumber", "DESC"]], transaction }))!;
}

async function assertParties(ctx: TenantContext, d: EstimateData, transaction: Transaction) {
  const c = await Customer.findOne({ where: { id: d.customer_id, organizationId: ctx.organizationId }, transaction });
  if (!c || c.get("status") !== "active") throw Errors.validation({ customer_id: ["Choose an active customer."] });
  if (d.project_id) {
    const p = await Project.findOne({ where: { id: d.project_id, organizationId: ctx.organizationId }, transaction });
    if (!p) throw Errors.validation({ project_id: ["Choose a project."] });
    if (p.get("customerId") !== d.customer_id) throw Errors.validation({ project_id: ["This project belongs to a different customer."] });
  }
}

/** Writes totals + items onto a draft version. Internal costs are only accepted with permission. */
async function writeVersion(ctx: TenantContext, version: Model, d: EstimateData, transaction: Transaction) {
  const seeCost = can(ctx, "estimate.view_internal_cost");
  const previous = seeCost ? [] : await EstimateItem.findAll({ where: { estimateVersionId: version.get("id") }, order: [["sortOrder", "ASC"]], transaction });
  const t = computeTotals(
    d.items.map((it) => ({ quantity: it.quantity, unitPriceCents: toCents(it.unit_price), taxable: it.taxable })),
    toCents(d.discount),
    d.tax_rate,
  );
  if (toCents(d.discount) > t.subtotal) throw Errors.validation({ discount: ["Discount can't be more than the subtotal."] });
  // Without the cost permission, keep any costs already on lines with the same name (an estimator may have set them).
  const keptCost = new Map(previous.map((p) => [String(p.get("name")).toLowerCase(), p.get("internalUnitCost") as string | null]));
  const rows = d.items.map((it, i) => {
    const unitCost = seeCost ? it.internal_unit_cost : (keptCost.get(it.name.toLowerCase()) ?? null);
    return {
      organizationId: ctx.organizationId,
      estimateVersionId: version.get("id"),
      sortOrder: i,
      itemType: it.item_type,
      name: it.name,
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      unitPrice: it.unit_price,
      lineSubtotal: fromCents(t.lines[i]!.subtotal),
      taxable: it.taxable,
      taxAmount: fromCents(t.lines[i]!.tax),
      internalUnitCost: unitCost,
      internalLineCost: unitCost == null ? null : fromCents(lineCents(it.quantity, toCents(unitCost))),
    };
  });
  const costed = rows.filter((r) => r.internalLineCost != null);
  const costTotal = costed.reduce((s, r) => s + toCents(r.internalLineCost!), 0);
  const revenue = t.subtotal - t.discount; // margin is pre-tax
  await version.update(
    {
      title: d.title,
      scopeDescription: d.scope_description,
      validUntil: d.valid_until,
      taxRate: d.tax_rate,
      taxSnapshot: { rate: d.tax_rate, applies_to: "taxable lines after discount" },
      subtotal: fromCents(t.subtotal),
      discountTotal: fromCents(t.discount),
      taxTotal: fromCents(t.tax),
      total: fromCents(t.total),
      internalCostTotal: costed.length ? fromCents(costTotal) : null,
      marginAmount: costed.length ? fromCents(revenue - costTotal) : null,
      customerNotes: d.customer_notes,
      termsSnapshot: d.terms,
    },
    { transaction },
  );
  await EstimateItem.destroy({ where: { estimateVersionId: version.get("id") }, transaction });
  await EstimateItem.bulkCreate(rows, { transaction });
}

export async function versionDto(v: Model, seeCost: boolean, transaction?: Transaction): Promise<EstimateVersionDto> {
  const items = await EstimateItem.findAll({ where: { estimateVersionId: v.get("id") }, order: [["sortOrder", "ASC"]], transaction });
  const cost = v.get("internalCostTotal") as string | null;
  const margin = v.get("marginAmount") as string | null;
  const revenue = toCents(v.get("subtotal") as string) - toCents(v.get("discountTotal") as string);
  return {
    id: g<string>(v, "id"),
    version_number: g<number>(v, "versionNumber"),
    title: g<string>(v, "title"),
    scope_description: g(v, "scopeDescription"),
    subtotal: money(v.get("subtotal")),
    discount_total: money(v.get("discountTotal")),
    tax_rate: String(Number(v.get("taxRate") ?? 0)),
    tax_total: money(v.get("taxTotal")),
    total: money(v.get("total")),
    customer_notes: g(v, "customerNotes"),
    terms: g(v, "termsSnapshot"),
    valid_until: ymd(v.get("validUntil")),
    issued_at: iso(v.get("issuedAt")),
    created_at: g<Date>(v, "createdAt").toISOString(),
    items: items.map((it) => ({
      id: g<string>(it, "id"),
      item_type: g<ItemType>(it, "itemType"),
      name: g<string>(it, "name"),
      description: g(it, "description"),
      quantity: String(Number(it.get("quantity"))),
      unit: g<string>(it, "unit"),
      unit_price: money(it.get("unitPrice")),
      line_subtotal: money(it.get("lineSubtotal")),
      taxable: g<boolean>(it, "taxable"),
      tax_amount: money(it.get("taxAmount")),
      ...(seeCost && {
        internal_unit_cost: it.get("internalUnitCost") == null ? null : money(it.get("internalUnitCost")),
        internal_line_cost: it.get("internalLineCost") == null ? null : money(it.get("internalLineCost")),
      }),
    })),
    ...(seeCost && {
      internal:
        cost == null
          ? null
          : { cost_total: money(cost), margin: money(margin), margin_pct: revenue > 0 ? Math.round((toCents(margin) / revenue) * 1000) / 10 : null },
    }),
  };
}

/** Proposals for an estimate, with lazy expiry applied. */
export async function proposalSummaries(ctx: TenantContext, estimateId: string): Promise<ProposalSummary[]> {
  const rows = await Proposal.findAll({
    where: { organizationId: ctx.organizationId, estimateId },
    include: [{ model: EstimateVersion, as: "estimateVersion", attributes: ["versionNumber"] }],
    order: [["createdAt", "DESC"]],
  });
  const contracts = await Contract.findAll({ where: { proposalId: rows.map((r) => r.get("id") as string) }, attributes: ["id", "proposalId"] });
  const contractOf = new Map(contracts.map((c) => [c.get("proposalId") as string, c.get("id") as string]));
  const now = Date.now();
  return rows.map((p) => {
    const exp = p.get("expiresAt") as Date | null;
    const status = p.get("status") === "sent" && exp && exp.getTime() < now ? "expired" : (p.get("status") as ProposalSummary["status"]);
    return {
      id: g<string>(p, "id"),
      proposal_number: g<string>(p, "proposalNumber"),
      status,
      version_number: g<Model>(p, "estimateVersion").get("versionNumber") as number,
      sent_at: iso(p.get("sentAt")),
      expires_at: iso(exp),
      viewed_at: iso(p.get("viewedAt")),
      accepted_at: iso(p.get("acceptedAt")),
      accepted_by_name: g(p, "acceptedByName"),
      declined_at: iso(p.get("declinedAt")),
      decline_reason: g(p, "declineReason"),
      contract_id: contractOf.get(g<string>(p, "id")) ?? null,
    };
  });
}

export const estimateService = {
  async list(ctx: TenantContext, q: z.output<typeof EstimateListQuery>): Promise<EstimateListPage> {
    authorize(ctx, "estimate.read");
    const today = todayYmd();
    const base: WhereOptions = { organizationId: ctx.organizationId };
    if (q.customer_id) Object.assign(base, { customerId: q.customer_id });
    if (q.q) {
      const like = `%${q.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
      Object.assign(base, {
        [Op.or]: [
          { estimateNumber: { [Op.iLike]: like } },
          { "$customer.display_name$": { [Op.iLike]: like } },
          { "$currentVersion.title$": { [Op.iLike]: like } },
        ],
      });
    }
    const dir = q.dir === "desc" ? "DESC NULLS LAST" : "ASC NULLS LAST";
    const order =
      q.sort === "customer"
        ? [[{ model: Customer, as: "customer" }, "displayName", dir]]
        : q.sort === "total"
          ? [[{ model: EstimateVersion, as: "currentVersion" }, "total", dir]]
          : q.sort === "valid_until"
            ? [[{ model: EstimateVersion, as: "currentVersion" }, "validUntil", dir]]
            : [[SORT_COLUMN[q.sort], dir]];

    const [{ rows, count }, grouped, won] = await Promise.all([
      Estimate.findAndCountAll({
        where: { ...base, ...tabWhere(q.tab) },
        include: listInclude,
        order: [...order, ["estimateNumber", "DESC"]] as never,
        limit: q.per_page,
        offset: (q.page - 1) * q.per_page,
        distinct: true,
      }),
      Estimate.findAll({
        where: base,
        include: listInclude.map((i) => ({ ...i, attributes: [] })),
        attributes: ["status", [sequelize.fn("COUNT", sequelize.col("Estimate.id")), "n"], [sequelize.fn("SUM", sequelize.col("currentVersion.total")), "value"]],
        group: ["Estimate.status"],
        raw: true,
      }) as unknown as Promise<{ status: string; n: string; value: string | null }[]>,
      sequelize.query(
        `SELECT
           COUNT(*) FILTER (WHERE e.status = 'accepted') AS won,
           COUNT(*) FILTER (WHERE e.status = 'declined') AS lost,
           COALESCE(SUM(v.total) FILTER (WHERE e.status = 'accepted'), 0) AS won_value
         FROM estimates e JOIN estimate_versions v ON v.id = e.current_version_id
         WHERE e.organization_id = :org AND e.status IN ('accepted','declined') AND e.updated_at >= NOW() - INTERVAL '90 days'`,
        { replacements: { org: ctx.organizationId }, plain: true },
      ) as Promise<{ won: string; lost: string; won_value: string } | null>,
    ]);

    const counts: Record<EstimateTab, number> = { open: 0, draft: 0, issued: 0, accepted: 0, declined: 0, all: 0 };
    let openValue = 0;
    for (const r of grouped) {
      const n = Number(r.n);
      counts.all += n;
      if (r.status in counts) counts[r.status as EstimateTab] += n;
      if (OPEN.includes(r.status as EstimateStatus)) {
        counts.open += n;
        openValue += toCents(money(r.value));
      }
    }
    const decided = Number(won?.won ?? 0) + Number(won?.lost ?? 0);
    return {
      items: rows.map((r) => toListItem(r, today)),
      page: q.page,
      per_page: q.per_page,
      total: count,
      counts,
      summary: {
        open_value: fromCents(openValue),
        accepted_value_90d: money(won?.won_value ?? 0),
        win_rate_90d: decided ? Math.round((Number(won!.won) / decided) * 100) : null,
      },
      can_write: can(ctx, "estimate.write"),
      can_view_cost: can(ctx, "estimate.view_internal_cost"),
    };
  },

  async get(ctx: TenantContext, id: string, versionId?: string): Promise<EstimateDetail> {
    authorize(ctx, "estimate.read");
    const e = UUID.test(id)
      ? await Estimate.findOne({ where: { id, organizationId: ctx.organizationId }, include: [...listInclude.slice(0, 2), { model: EstimateVersion, as: "currentVersion" }] })
      : null;
    if (!e) throw Errors.notFound("Estimate");
    const versions = await EstimateVersion.findAll({ where: { estimateId: id }, order: [["versionNumber", "DESC"]] });
    const shown = (versionId && versions.find((v) => v.get("id") === versionId)) || versions[0]!;
    const seeCost = can(ctx, "estimate.view_internal_cost");
    const base = toListItem(e);
    const status = g<string>(e, "status");
    const latest = versions[0]!;
    const latestIsDraft = !latest.get("issuedAt");
    const write = can(ctx, "estimate.write");
    const issue = can(ctx, "estimate.issue");
    const proposals = await proposalSummaries(ctx, id);
    const live = ["draft", "issued"].includes(status);
    return {
      ...base,
      versions: versions.map((v) => ({ id: g<string>(v, "id"), version_number: g<number>(v, "versionNumber"), issued_at: iso(v.get("issuedAt")), total: money(v.get("total")) })),
      version: await versionDto(shown, seeCost),
      proposals,
      bill_to: customerParty((await Customer.findByPk(g<string>(e, "customerId")))!),
      from: await orgParty(ctx.organizationId),
      can: {
        edit: write && live && latestIsDraft,
        issue: issue && live && latestIsDraft,
        revise: write && live && !latestIsDraft,
        send_proposal: issue && status === "issued" && !latestIsDraft && !proposals.some((p) => p.status === "sent" && p.version_number === g<number>(latest, "versionNumber")),
        delete: write && versions.every((v) => !v.get("issuedAt")),
        view_internal_cost: seeCost,
      },
    };
  },

  async create(ctx: TenantContext, d: EstimateData): Promise<EstimateDetail> {
    authorize(ctx, "estimate.write");
    const attempt = () =>
      sequelize.transaction(async (transaction) => {
        await assertParties(ctx, d, transaction);
        const e = await Estimate.create(
          {
            organizationId: ctx.organizationId,
            estimateNumber: await nextNumber("estimate", ctx.organizationId, transaction),
            customerId: d.customer_id,
            projectId: d.project_id,
            status: "draft",
            createdByUserId: ctx.userId,
          },
          { transaction },
        );
        const v = await EstimateVersion.create(
          { organizationId: ctx.organizationId, estimateId: e.get("id"), versionNumber: 1, title: d.title, subtotal: 0, total: 0, createdByUserId: ctx.userId },
          { transaction },
        );
        await writeVersion(ctx, v, d, transaction);
        await e.update({ currentVersionId: v.get("id") }, { transaction });
        return e.get("id") as string;
      });
    let id: string;
    try {
      id = await attempt();
    } catch (err) {
      if (!isUniqueError(err)) throw err;
      id = await attempt();
    }
    const created = await this.get(ctx, id);
    await recordAudit(ctx, { action: "estimate.created", entityType: "estimate", entityId: id, after: { estimate_number: created.estimate_number, total: created.total } });
    return created;
  },

  /** Edits the latest version, which must still be a draft. */
  async update(ctx: TenantContext, id: string, d: EstimateData): Promise<EstimateDetail> {
    authorize(ctx, "estimate.write");
    await sequelize.transaction(async (transaction) => {
      const e = await findOwned(ctx, id, transaction);
      if (!["draft", "issued"].includes(e.get("status") as string)) throw Errors.conflict(`A ${e.get("status")} estimate can't be edited.`);
      const v = await latestVersion(id, transaction);
      if (v.get("issuedAt")) throw Errors.conflict("This version is issued and locked. Create a new version to make changes.");
      await assertParties(ctx, d, transaction);
      if (d.customer_id !== e.get("customerId") && (await EstimateVersion.count({ where: { estimateId: id, issuedAt: { [Op.ne]: null } }, transaction })))
        throw Errors.validation({ customer_id: ["The customer can't change after a version was issued."] });
      await e.update({ customerId: d.customer_id, projectId: d.project_id }, { transaction });
      await writeVersion(ctx, v, d, transaction);
    });
    const after = await this.get(ctx, id);
    await recordAudit(ctx, { action: "estimate.updated", entityType: "estimate", entityId: id, after: { version: after.version_number, total: after.total } });
    return after;
  },

  /** Locks the draft version. Open proposals for older versions are withdrawn so the customer can't accept an outdated price. */
  async issue(ctx: TenantContext, id: string): Promise<EstimateDetail> {
    authorize(ctx, "estimate.issue");
    const withdrawn = await sequelize.transaction(async (transaction) => {
      const e = await findOwned(ctx, id, transaction);
      if (!["draft", "issued"].includes(e.get("status") as string)) throw Errors.conflict(`A ${e.get("status")} estimate can't be issued.`);
      const v = await latestVersion(id, transaction);
      if (v.get("issuedAt")) throw Errors.conflict("This version is already issued.");
      if (toCents(v.get("total") as string) <= 0) throw Errors.conflict("Estimate total must be more than $0 to issue.");
      const now = new Date();
      await v.update({ issuedAt: now }, { transaction });
      await e.update({ status: "issued", currentVersionId: v.get("id"), issuedAt: e.get("issuedAt") ?? now }, { transaction });
      const [n] = await Proposal.update(
        { status: "withdrawn", withdrawnAt: now },
        { where: { estimateId: id, status: ["draft", "sent"], estimateVersionId: { [Op.ne]: v.get("id") } }, transaction },
      );
      return n;
    });
    const after = await this.get(ctx, id);
    await recordAudit(ctx, {
      action: "estimate.issued",
      entityType: "estimate",
      entityId: id,
      after: { version: after.version_number, total: after.total, proposals_withdrawn: withdrawn },
    });
    return after;
  },

  /** Starts version n+1 as a draft copy of the latest issued version. */
  async revise(ctx: TenantContext, id: string): Promise<EstimateDetail> {
    authorize(ctx, "estimate.write");
    await sequelize.transaction(async (transaction) => {
      const e = await findOwned(ctx, id, transaction);
      if (!["draft", "issued"].includes(e.get("status") as string)) throw Errors.conflict(`A ${e.get("status")} estimate can't be revised.`);
      const prev = await latestVersion(id, transaction);
      if (!prev.get("issuedAt")) throw Errors.conflict("There's already a draft version.");
      const keep = ["title", "scopeDescription", "subtotal", "discountTotal", "taxTotal", "total", "internalCostTotal", "marginAmount", "taxSnapshot", "taxRate", "termsSnapshot", "customerNotes", "validUntil"];
      const v = await EstimateVersion.create(
        {
          organizationId: ctx.organizationId,
          estimateId: id,
          versionNumber: (prev.get("versionNumber") as number) + 1,
          createdByUserId: ctx.userId,
          ...Object.fromEntries(keep.map((k) => [k, prev.get(k)])),
        },
        { transaction },
      );
      const items = await EstimateItem.findAll({ where: { estimateVersionId: prev.get("id") }, transaction, raw: true });
      await EstimateItem.bulkCreate(
        (items as unknown as Record<string, unknown>[]).map(({ id: _id, createdAt: _c, ...rest }) => ({ ...rest, estimateVersionId: v.get("id") })),
        { transaction },
      );
      await e.update({ currentVersionId: v.get("id") }, { transaction });
    });
    const after = await this.get(ctx, id);
    await recordAudit(ctx, { action: "estimate.revised", entityType: "estimate", entityId: id, after: { version: after.version_number } });
    return after;
  },

  /** Throws away the draft of a revision, going back to the last issued version. */
  async discardDraft(ctx: TenantContext, id: string): Promise<EstimateDetail> {
    authorize(ctx, "estimate.write");
    await sequelize.transaction(async (transaction) => {
      const e = await findOwned(ctx, id, transaction);
      const v = await latestVersion(id, transaction);
      if (v.get("issuedAt") || (v.get("versionNumber") as number) === 1) throw Errors.conflict("There's no revision draft to discard.");
      const prev = await EstimateVersion.findOne({ where: { estimateId: id, versionNumber: (v.get("versionNumber") as number) - 1 }, transaction });
      await e.update({ currentVersionId: prev!.get("id") }, { transaction });
      await EstimateItem.destroy({ where: { estimateVersionId: v.get("id") }, transaction });
      await v.destroy({ transaction });
    });
    return this.get(ctx, id);
  },

  /** Only estimates that were never issued can be deleted. */
  async remove(ctx: TenantContext, id: string): Promise<void> {
    authorize(ctx, "estimate.write");
    const number = await sequelize.transaction(async (transaction) => {
      const e = await findOwned(ctx, id, transaction);
      const versions = await EstimateVersion.findAll({ where: { estimateId: id }, transaction });
      if (versions.some((v) => v.get("issuedAt"))) throw Errors.conflict("Issued estimates are kept on record and can't be deleted.");
      await e.update({ currentVersionId: null }, { transaction });
      await EstimateItem.destroy({ where: { estimateVersionId: versions.map((v) => v.get("id") as string) }, transaction });
      await EstimateVersion.destroy({ where: { estimateId: id }, transaction });
      await e.destroy({ transaction });
      return e.get("estimateNumber") as string;
    });
    await recordAudit(ctx, { action: "estimate.deleted", entityType: "estimate", entityId: id, before: { estimate_number: number } });
  },
};
