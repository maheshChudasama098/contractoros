import "server-only";
import { Op, type Model, type Transaction, type WhereOptions } from "sequelize";
import type { z } from "zod";
import { Contract, Customer, Estimate, EstimateItem, EstimateVersion, Project, Proposal, SignatureEvent, SignatureRequest, sequelize } from "@server/core/db/models";
import { authorize, can } from "@server/core/authorization/policy";
import { recordAudit } from "@server/core/audit/audit.service";
import { randomToken, sha256 } from "@server/core/auth/crypto";
import { env } from "@server/core/config/env";
import { Errors } from "@server/core/http/errors";
import type { TenantContext } from "@server/core/tenancy/context";
import { projectService } from "@server/modules/projects";
import type {
  ContractDetail,
  ContractDocument,
  ContractListItem,
  ContractListQuery,
  ContractStatus,
  ContractTab,
  CreateProjectFromContractInput,
  SignatureEvidence,
  SignatureLink,
} from "@shared/contracts/proposals";
import type { ItemType } from "@shared/contracts/estimates";
import { UUID, customerParty, g, iso, money, orgParty } from "./shared";

const listInclude = [
  { model: Customer, as: "customer", attributes: ["id", "displayName"] },
  { model: Project, as: "project", attributes: ["id", "projectNumber", "name"] },
];

export const signUrl = (token: string) => `${env.APP_URL}/sign/${token}`;

/** Stable JSON (sorted keys) so the hash only changes when content changes. */
const stable = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(stable).join(",")}]`
    : v && typeof v === "object"
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`)
          .join(",")}}`
      : JSON.stringify(v);
export const hashDocument = (doc: ContractDocument) => sha256(stable(doc));

/** The document as it stands now (drafts) — frozen into `snapshot` when sent for signature. */
export async function buildDocument(contract: Model, transaction?: Transaction): Promise<ContractDocument> {
  const v = (await EstimateVersion.findByPk(contract.get("estimateVersionId") as string, { transaction }))!;
  const e = (await Estimate.findByPk(v.get("estimateId") as string, { transaction }))!;
  const items = await EstimateItem.findAll({ where: { estimateVersionId: v.get("id") }, order: [["sortOrder", "ASC"]], transaction });
  const customer = (await Customer.findByPk(contract.get("customerId") as string, { transaction }))!;
  const { has_logo: _l, ...from } = await orgParty(contract.get("organizationId") as string, transaction);
  return {
    contract_number: g<string>(contract, "contractNumber"),
    title: g<string>(contract, "title") ?? g<string>(v, "title"),
    from,
    customer: customerParty(customer),
    estimate: {
      estimate_number: g<string>(e, "estimateNumber"),
      version_number: g<number>(v, "versionNumber"),
      title: g<string>(v, "title"),
      scope_description: g(v, "scopeDescription"),
    },
    // Customer-facing fields only: internal cost/margin never enter the document.
    items: items.map((it) => ({
      item_type: g<ItemType>(it, "itemType"),
      name: g<string>(it, "name"),
      description: g(it, "description"),
      quantity: String(Number(it.get("quantity"))),
      unit: g<string>(it, "unit"),
      unit_price: money(it.get("unitPrice")),
      line_subtotal: money(it.get("lineSubtotal")),
    })),
    subtotal: money(v.get("subtotal")),
    discount_total: money(v.get("discountTotal")),
    tax_rate: String(Number(v.get("taxRate") ?? 0)),
    tax_total: money(v.get("taxTotal")),
    total: money(v.get("total")),
    body: g<string>(contract, "body") ?? "",
  };
}

function toListItem(c: Model): ContractListItem {
  const cu = g<Model>(c, "customer");
  const p = g<Model | null>(c, "project");
  return {
    id: g<string>(c, "id"),
    contract_number: g<string>(c, "contractNumber"),
    title: g<string>(c, "title") ?? "",
    status: g<ContractStatus>(c, "status"),
    customer: { id: g<string>(cu, "id"), display_name: g<string>(cu, "displayName") },
    project: p ? { id: g<string>(p, "id"), project_number: g<string>(p, "projectNumber"), name: g<string>(p, "name") } : null,
    contract_value: money(c.get("contractValue")),
    sent_at: iso(c.get("sentAt")),
    signed_at: iso(c.get("signedAt")),
    created_at: g<Date>(c, "createdAt").toISOString(),
  };
}

async function findOwned(ctx: TenantContext, id: string, transaction?: Transaction) {
  const c = UUID.test(id)
    ? await Contract.findOne({ where: { id, organizationId: ctx.organizationId }, transaction, ...(transaction && { lock: transaction.LOCK.UPDATE }) })
    : null;
  if (!c) throw Errors.notFound("Contract");
  return c;
}

export const contractService = {
  async list(ctx: TenantContext, q: z.output<typeof ContractListQuery>) {
    authorize(ctx, "estimate.read");
    const base: WhereOptions = { organizationId: ctx.organizationId };
    if (q.q) {
      const like = `%${q.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
      Object.assign(base, {
        [Op.or]: [{ contractNumber: { [Op.iLike]: like } }, { title: { [Op.iLike]: like } }, { "$customer.display_name$": { [Op.iLike]: like } }],
      });
    }
    const [{ rows, count }, grouped] = await Promise.all([
      Contract.findAndCountAll({
        where: { ...base, ...(q.tab !== "all" && { status: q.tab }) },
        include: listInclude,
        order: [["createdAt", "DESC"]],
        limit: q.per_page,
        offset: (q.page - 1) * q.per_page,
        distinct: true,
      }),
      Contract.findAll({
        where: base,
        include: listInclude.map((i) => ({ ...i, attributes: [] })),
        attributes: ["status", [sequelize.fn("COUNT", sequelize.col("Contract.id")), "n"]],
        group: ["Contract.status"],
        raw: true,
      }) as unknown as Promise<{ status: string; n: string }[]>,
    ]);
    const counts: Record<ContractTab, number> = { draft: 0, pending_signature: 0, signed: 0, voided: 0, all: 0 };
    for (const r of grouped) {
      counts.all += Number(r.n);
      if (r.status in counts) counts[r.status as ContractTab] += Number(r.n);
    }
    return { items: rows.map(toListItem), page: q.page, per_page: q.per_page, total: count, counts };
  },

  async get(ctx: TenantContext, id: string): Promise<ContractDetail> {
    authorize(ctx, "estimate.read");
    const c = UUID.test(id) ? await Contract.findOne({ where: { id, organizationId: ctx.organizationId }, include: listInclude }) : null;
    if (!c) throw Errors.notFound("Contract");
    const status = g<ContractStatus>(c, "status");
    const frozen = !!c.get("documentHash");
    const document = frozen ? (c.get("snapshot") as ContractDocument) : await buildDocument(c);
    const [proposal, version, requests, customer] = await Promise.all([
      c.get("proposalId") ? Proposal.findByPk(c.get("proposalId") as string, { attributes: ["id", "proposalNumber"] }) : null,
      EstimateVersion.findByPk(c.get("estimateVersionId") as string, {
        attributes: ["id", "versionNumber", "estimateId"],
        include: [{ model: Estimate, as: "estimate", attributes: ["id", "estimateNumber"] }],
      }),
      SignatureRequest.findAll({
        where: { contractId: id },
        include: [{ model: SignatureEvent, as: "events" }],
        order: [["createdAt", "ASC"]],
      }),
      Customer.findByPk(c.get("customerId") as string),
    ]);
    const signedReq = requests.find((r) => r.get("status") === "signed");
    const signature: SignatureEvidence | null = signedReq
      ? {
          signed_name: g<string>(signedReq, "signedName"),
          signer_email: g<string>(signedReq, "signerEmail"),
          signature_type: g(signedReq, "signatureType") as "typed" | "drawn",
          signature_image: g(signedReq, "signatureImage"),
          signed_at: iso(signedReq.get("completedAt"))!,
          ip: g(signedReq, "signerIp"),
          user_agent: g(signedReq, "signerUserAgent"),
          document_hash: g<string>(signedReq, "documentHash"),
        }
      : null;
    const events = [
      { type: "created", at: g<Date>(c, "createdAt").toISOString(), detail: proposal ? `From accepted proposal ${proposal.get("proposalNumber")}` : null },
      ...requests.flatMap((r) =>
        (g<Model[]>(r, "events") ?? []).map((ev) => ({
          type: g<string>(ev, "eventType"),
          at: g<Date>(ev, "occurredAt").toISOString(),
          detail: [g<string>(r, "signerEmail"), g<string>(ev, "eventType") === "declined" ? g(r, "declineReason") : null]
            .filter(Boolean)
            .join(" · "),
        })),
      ),
      ...(c.get("voidedAt") ? [{ type: "voided", at: iso(c.get("voidedAt"))!, detail: g(c, "voidReason") }] : []),
    ].sort((a, b) => a.at.localeCompare(b.at));
    const write = can(ctx, "estimate.issue");
    const ev = version ? g<Model>(version, "estimate") : null;
    return {
      ...toListItem(c),
      body: g<string>(c, "body") ?? "",
      signer: c.get("signerEmail") ? { name: g<string>(c, "signerName"), email: g<string>(c, "signerEmail") } : null,
      proposal: proposal ? { id: g<string>(proposal, "id"), proposal_number: g<string>(proposal, "proposalNumber") } : null,
      estimate: ev ? { id: g<string>(ev, "id"), estimate_number: g<string>(ev, "estimateNumber"), version_number: g<number>(version!, "versionNumber") } : null,
      document,
      document_hash: g(c, "documentHash"),
      void_reason: g(c, "voidReason"),
      voided_at: iso(c.get("voidedAt")),
      signature,
      events,
      site_suggestion:
        customer && customer.get("billingAddressLine1")
          ? {
              address_line1: g<string>(customer, "billingAddressLine1"),
              address_line2: g(customer, "billingAddressLine2"),
              city: g<string>(customer, "billingCity") ?? "",
              state: g<string>(customer, "billingState") ?? "",
              postal_code: g<string>(customer, "billingPostalCode") ?? "",
            }
          : null,
      can: {
        edit: write && status === "draft",
        send: write && (status === "draft" || status === "pending_signature"),
        void: can(ctx, "contract.void") && status !== "voided",
        create_project: can(ctx, "project.write") && status === "signed" && !c.get("projectId"),
      },
    };
  },

  async update(ctx: TenantContext, id: string, input: { title: string; body: string; signer_name: string; signer_email: string }) {
    authorize(ctx, "estimate.issue");
    await sequelize.transaction(async (transaction) => {
      const c = await findOwned(ctx, id, transaction);
      if (c.get("status") !== "draft") throw Errors.conflict("Only draft contracts can be edited.");
      await c.update({ title: input.title, body: input.body, signerName: input.signer_name, signerEmail: input.signer_email }, { transaction });
    });
    await recordAudit(ctx, { action: "contract.updated", entityType: "contract", entityId: id });
    return this.get(ctx, id);
  },

  /**
   * Freezes the document (snapshot + sha256), creates a signature request and returns the
   * signer link once. Re-sending an unsigned contract replaces the previous link.
   */
  async sendForSignature(ctx: TenantContext, id: string, expiresInDays: number): Promise<SignatureLink> {
    authorize(ctx, "estimate.issue");
    const token = randomToken();
    await sequelize.transaction(async (transaction) => {
      const c = await findOwned(ctx, id, transaction);
      const status = c.get("status") as string;
      if (status !== "draft" && status !== "pending_signature") throw Errors.conflict(`A ${status} contract can't be sent for signature.`);
      if (!c.get("signerEmail") || !c.get("signerName")) throw Errors.validation({ signer_email: ["Add who signs for the customer first."] });
      if (!String(c.get("body") ?? "").trim()) throw Errors.validation({ body: ["Add the agreement text first."] });
      // Expire earlier, unused links.
      const open = await SignatureRequest.findAll({ where: { contractId: id, status: ["created", "sent", "viewed"] }, transaction });
      for (const r of open) {
        await r.update({ status: "expired", tokenHash: null }, { transaction });
        await SignatureEvent.create({ organizationId: ctx.organizationId, requestId: r.get("id"), eventType: "expired", occurredAt: new Date(), payloadSummary: { reason: "replaced" } }, { transaction });
      }
      const doc = status === "draft" ? await buildDocument(c, transaction) : (c.get("snapshot") as ContractDocument);
      const hash = hashDocument(doc);
      const now = new Date();
      await c.update({ status: "pending_signature", snapshot: doc, documentHash: hash, sentAt: now, signatureProvider: "in_app" }, { transaction });
      const req = await SignatureRequest.create(
        {
          organizationId: ctx.organizationId,
          contractId: id,
          signerName: c.get("signerName"),
          signerEmail: c.get("signerEmail"),
          status: "sent",
          tokenHash: sha256(token),
          expiresAt: new Date(now.getTime() + expiresInDays * 86_400_000),
          documentHash: hash,
          sentAt: now,
        },
        { transaction },
      );
      await SignatureEvent.create(
        { organizationId: ctx.organizationId, requestId: req.get("id"), eventType: "sent", occurredAt: now, payloadSummary: { document_hash: hash, by_user: ctx.userId } },
        { transaction },
      );
    });
    const contract = await this.get(ctx, id);
    await recordAudit(ctx, { action: "contract.sent_for_signature", entityType: "contract", entityId: id, after: { document_hash: contract.document_hash, signer: contract.signer?.email ?? null } });
    return { contract, url: signUrl(token) };
  },

  /** Voiding needs its own permission and a reason; signed evidence is kept. */
  async void(ctx: TenantContext, id: string, reason: string) {
    authorize(ctx, "contract.void");
    await sequelize.transaction(async (transaction) => {
      const c = await findOwned(ctx, id, transaction);
      if (c.get("status") === "voided") throw Errors.conflict("This contract is already voided.");
      await c.update({ status: "voided", voidedAt: new Date(), voidReason: reason }, { transaction });
      await SignatureRequest.update({ status: "expired", tokenHash: null }, { where: { contractId: id, status: ["created", "sent", "viewed"] }, transaction });
    });
    await recordAudit(ctx, { action: "contract.voided", entityType: "contract", entityId: id, after: { reason } });
    return this.get(ctx, id);
  },

  /** Signed contract → project (or links the estimate's existing project) with the contract value. */
  async createProject(ctx: TenantContext, id: string, input: z.output<typeof CreateProjectFromContractInput>) {
    authorize(ctx, "project.write");
    const c = await findOwned(ctx, id);
    if (c.get("status") !== "signed") throw Errors.conflict("Only signed contracts can start a project.");
    if (c.get("projectId")) throw Errors.conflict("This contract already has a project.");
    const version = (await EstimateVersion.findByPk(c.get("estimateVersionId") as string))!;
    const estimate = (await Estimate.findByPk(version.get("estimateId") as string))!;
    let projectId = estimate.get("projectId") as string | null;
    if (!projectId) {
      const p = await projectService.create(ctx, {
        name: input.name,
        customer_id: c.get("customerId") as string,
        status: "planned",
        priority: "normal",
        planned_start_date: input.planned_start_date,
        planned_end_date: null,
        contract_value: money(c.get("contractValue")),
        site_address_line1: input.site_address_line1,
        site_address_line2: input.site_address_line2,
        site_city: input.site_city,
        site_state: input.site_state,
        site_postal_code: input.site_postal_code,
      });
      projectId = p.id;
    }
    await sequelize.transaction(async (transaction) => {
      await Project.update(
        { contractId: id, sourceEstimateId: estimate.get("id"), contractValue: money(c.get("contractValue")) },
        { where: { id: projectId!, organizationId: ctx.organizationId }, transaction },
      );
      await c.update({ projectId }, { transaction });
      await estimate.update({ projectId }, { transaction });
    });
    await recordAudit(ctx, { action: "contract.project_created", entityType: "contract", entityId: id, after: { project_id: projectId } });
    return { project_id: projectId };
  },
};
