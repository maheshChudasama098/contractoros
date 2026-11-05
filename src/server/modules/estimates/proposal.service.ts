import "server-only";
import { Op, type Model, type WhereOptions } from "sequelize";
import type { z } from "zod";
import { isUniqueError } from "@server/core/db/errors";
import { Contract, Customer, Estimate, EstimateVersion, Proposal, sequelize } from "@server/core/db/models";
import { authorize } from "@server/core/authorization/policy";
import { recordAudit } from "@server/core/audit/audit.service";
import { randomToken, sha256 } from "@server/core/auth/crypto";
import { env } from "@server/core/config/env";
import { Errors } from "@server/core/http/errors";
import type { TenantContext } from "@server/core/tenancy/context";
import type { ProposalLink, ProposalListItem, ProposalListQuery, ProposalStatus, ProposalTab } from "@shared/contracts/proposals";
import { UUID, g, iso, money, nextNumber } from "./shared";

const include = [
  { model: Customer, as: "customer", attributes: ["id", "displayName"] },
  { model: Estimate, as: "estimate", attributes: ["id", "estimateNumber"] },
  { model: EstimateVersion, as: "estimateVersion", attributes: ["id", "versionNumber", "title", "total"] },
];

export const proposalUrl = (token: string) => `${env.APP_URL}/p/${token}`;

/** Sent proposals past their expiry read as expired. */
export function proposalStatus(p: Model): ProposalStatus {
  const exp = p.get("expiresAt") as Date | null;
  return p.get("status") === "sent" && exp && exp.getTime() < Date.now() ? "expired" : (p.get("status") as ProposalStatus);
}

function toItem(p: Model, contractId: string | null): ProposalListItem {
  const c = g<Model>(p, "customer");
  const e = g<Model>(p, "estimate");
  const v = g<Model>(p, "estimateVersion");
  return {
    id: g<string>(p, "id"),
    proposal_number: g<string>(p, "proposalNumber"),
    status: proposalStatus(p),
    estimate: { id: g<string>(e, "id"), estimate_number: g<string>(e, "estimateNumber"), version_number: g<number>(v, "versionNumber"), title: g<string>(v, "title") },
    customer: { id: g<string>(c, "id"), display_name: g<string>(c, "displayName") },
    total: money(v.get("total")),
    sent_at: iso(p.get("sentAt")),
    expires_at: iso(p.get("expiresAt")),
    viewed_at: iso(p.get("viewedAt")),
    accepted_at: iso(p.get("acceptedAt")),
    contract_id: contractId,
  };
}

async function findOwned(ctx: TenantContext, id: string) {
  const p = UUID.test(id) ? await Proposal.findOne({ where: { id, organizationId: ctx.organizationId }, include }) : null;
  if (!p) throw Errors.notFound("Proposal");
  return p;
}

async function item(ctx: TenantContext, id: string) {
  const p = await findOwned(ctx, id);
  const c = await Contract.findOne({ where: { proposalId: id }, attributes: ["id"] });
  return toItem(p, (c?.get("id") as string) ?? null);
}

function tabWhere(tab: ProposalTab): WhereOptions {
  const now = new Date();
  switch (tab) {
    case "open":
      return { status: "sent", [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gte]: now } }] };
    case "accepted":
    case "declined":
      return { status: tab };
    case "closed":
      return { [Op.or]: [{ status: ["withdrawn", "expired"] }, { status: "sent", expiresAt: { [Op.lt]: now } }] };
    default:
      return {};
  }
}

export const proposalService = {
  async list(ctx: TenantContext, q: z.output<typeof ProposalListQuery>) {
    authorize(ctx, "estimate.read");
    const base: WhereOptions = { organizationId: ctx.organizationId };
    if (q.q) {
      const like = `%${q.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
      Object.assign(base, {
        [Op.or]: [
          { proposalNumber: { [Op.iLike]: like } },
          { "$customer.display_name$": { [Op.iLike]: like } },
          { "$estimate.estimate_number$": { [Op.iLike]: like } },
          { "$estimateVersion.title$": { [Op.iLike]: like } },
        ],
      });
    }
    const [{ rows, count }, all] = await Promise.all([
      Proposal.findAndCountAll({
        where: { ...base, ...tabWhere(q.tab) },
        include,
        order: [["createdAt", "DESC"]],
        limit: q.per_page,
        offset: (q.page - 1) * q.per_page,
        distinct: true,
      }),
      Proposal.findAll({ where: base, include: include.map((i) => ({ ...i, attributes: [] })), attributes: ["status", "expiresAt"], raw: true }),
    ]);
    const counts: Record<ProposalTab, number> = { open: 0, accepted: 0, declined: 0, closed: 0, all: 0 };
    for (const r of all as unknown as { status: string; expiresAt: Date | null }[]) {
      counts.all++;
      const expired = r.status === "sent" && r.expiresAt && new Date(r.expiresAt).getTime() < Date.now();
      if (r.status === "sent" && !expired) counts.open++;
      else if (r.status === "accepted" || r.status === "declined") counts[r.status]++;
      else counts.closed++;
    }
    const contracts = await Contract.findAll({ where: { proposalId: rows.map((r) => r.get("id") as string) }, attributes: ["id", "proposalId"] });
    const contractOf = new Map(contracts.map((c) => [c.get("proposalId") as string, c.get("id") as string]));
    return { items: rows.map((r) => toItem(r, contractOf.get(r.get("id") as string) ?? null)), page: q.page, per_page: q.per_page, total: count, counts };
  },

  /** Sends the estimate's current issued version. Returns the customer link once. */
  async send(ctx: TenantContext, estimateId: string, input: { message: string | null; expires_in_days: number }): Promise<ProposalLink> {
    authorize(ctx, "estimate.issue");
    const token = randomToken();
    const attempt = () =>
      sequelize.transaction(async (transaction) => {
        const e = UUID.test(estimateId)
          ? await Estimate.findOne({ where: { id: estimateId, organizationId: ctx.organizationId }, transaction, lock: transaction.LOCK.UPDATE })
          : null;
        if (!e) throw Errors.notFound("Estimate");
        if (e.get("status") !== "issued") throw Errors.conflict("Only issued estimates can be sent as a proposal.");
        const v = await EstimateVersion.findOne({ where: { estimateId }, order: [["versionNumber", "DESC"]], transaction });
        if (!v?.get("issuedAt")) throw Errors.conflict("Issue the draft version before sending it.");
        const open = await Proposal.findOne({ where: { estimateVersionId: v.get("id"), status: "sent", expiresAt: { [Op.gte]: new Date() } }, transaction });
        if (open) throw Errors.conflict(`${open.get("proposalNumber")} is already open for this version. Copy its link or withdraw it first.`);
        const now = new Date();
        const p = await Proposal.create(
          {
            organizationId: ctx.organizationId,
            proposalNumber: await nextNumber("proposal", ctx.organizationId, transaction),
            estimateId,
            estimateVersionId: v.get("id"),
            customerId: e.get("customerId"),
            status: "sent",
            publicTokenHash: sha256(token),
            message: input.message,
            sentAt: now,
            expiresAt: new Date(now.getTime() + input.expires_in_days * 86_400_000),
            createdByUserId: ctx.userId,
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
      id = await attempt();
    }
    const proposal = await item(ctx, id);
    await recordAudit(ctx, {
      action: "proposal.sent",
      entityType: "proposal",
      entityId: id,
      after: { proposal_number: proposal.proposal_number, estimate: proposal.estimate.estimate_number, version: proposal.estimate.version_number },
    });
    return { proposal, url: proposalUrl(token) };
  },

  /** Issues a fresh link (the old one stops working), e.g. when the customer lost it. Extends expiry. */
  async renewLink(ctx: TenantContext, id: string): Promise<ProposalLink> {
    authorize(ctx, "estimate.issue");
    const p = await findOwned(ctx, id);
    const status = proposalStatus(p);
    if (status !== "sent" && status !== "expired") throw Errors.conflict(`A ${status} proposal can't get a new link.`);
    const e = await Estimate.findByPk(p.get("estimateId") as string);
    if (e?.get("currentVersionId") !== p.get("estimateVersionId") || e?.get("status") !== "issued")
      throw Errors.conflict("The estimate has changed since this proposal. Send a new proposal instead.");
    const token = randomToken();
    await p.update({ status: "sent", publicTokenHash: sha256(token), sentAt: new Date(), expiresAt: new Date(Date.now() + 30 * 86_400_000) });
    await recordAudit(ctx, { action: "proposal.link_renewed", entityType: "proposal", entityId: id });
    return { proposal: await item(ctx, id), url: proposalUrl(token) };
  },

  async withdraw(ctx: TenantContext, id: string): Promise<ProposalListItem> {
    authorize(ctx, "estimate.issue");
    const p = await findOwned(ctx, id);
    if (p.get("status") !== "sent") throw Errors.conflict(`A ${proposalStatus(p)} proposal can't be withdrawn.`);
    await p.update({ status: "withdrawn", withdrawnAt: new Date() });
    await recordAudit(ctx, { action: "proposal.withdrawn", entityType: "proposal", entityId: id });
    return item(ctx, id);
  },
};
