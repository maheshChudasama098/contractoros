import "server-only";
import { isUniqueError } from "@server/core/db/errors";
import { Contract, Customer, Estimate, EstimateVersion, Proposal, SignatureEvent, SignatureRequest, sequelize } from "@server/core/db/models";
import { sha256 } from "@server/core/auth/crypto";
import { getRequestContext } from "@server/core/context/request-context";
import { Errors } from "@server/core/http/errors";
import { DEFAULT_CONTRACT_BODY, type ContractDocument, type PortalProposal, type PortalSignature } from "@shared/contracts/proposals";
import { hashDocument } from "./contract.service";
import { proposalStatus } from "./proposal.service";
import { g, iso, nextNumber, orgParty, customerParty, recordCustomerAudit } from "./shared";
import { versionDto } from "./estimate.service";

// Token-holder (customer) actions. Tokens are 32 random bytes, stored only as sha256.
// Unknown/revoked tokens all return the same 404 so nothing is disclosed.

const TOKEN = /^[A-Za-z0-9_-]{20,100}$/;
const notFound = () => Errors.notFound("Link");
const logoUrl = (token: string, kind: "p" | "sign") => `/api/v1/portal/${kind === "p" ? "proposals" : "signatures"}/${token}/logo`;

async function proposalByToken(token: string) {
  if (!TOKEN.test(token)) throw notFound();
  const p = await Proposal.findOne({ where: { publicTokenHash: sha256(token) } });
  if (!p || p.get("status") === "draft") throw notFound();
  return p;
}

async function requestByToken(token: string) {
  if (!TOKEN.test(token)) throw notFound();
  const r = await SignatureRequest.findOne({ where: { tokenHash: sha256(token) } });
  if (!r) throw notFound();
  return r;
}

export const portalService = {
  // ------------------------------------------------------------------ proposals

  async proposal(token: string): Promise<PortalProposal> {
    const p = await proposalByToken(token);
    const orgId = p.get("organizationId") as string;
    if (!p.get("viewedAt") && p.get("status") === "sent") {
      await p.update({ viewedAt: new Date() });
      await recordCustomerAudit(orgId, "proposal.viewed", "proposal", p.get("id") as string);
    }
    const [v, e, customer, from] = await Promise.all([
      EstimateVersion.findByPk(p.get("estimateVersionId") as string),
      Estimate.findByPk(p.get("estimateId") as string, { attributes: ["estimateNumber"] }),
      Customer.findByPk(p.get("customerId") as string),
      orgParty(orgId),
    ]);
    const dto = await versionDto(v!, false); // never internal cost
    return {
      status: proposalStatus(p),
      proposal_number: g<string>(p, "proposalNumber"),
      from: { ...from, logo_url: from.has_logo ? logoUrl(token, "p") : null },
      customer: customerParty(customer!),
      message: g(p, "message"),
      estimate: {
        estimate_number: g<string>(e!, "estimateNumber"),
        version_number: dto.version_number,
        title: dto.title,
        scope_description: dto.scope_description,
        customer_notes: dto.customer_notes,
        terms: dto.terms,
      },
      items: dto.items.map((i) => ({ item_type: i.item_type, name: i.name, description: i.description, quantity: i.quantity, unit: i.unit, unit_price: i.unit_price, line_subtotal: i.line_subtotal })),
      subtotal: dto.subtotal,
      discount_total: dto.discount_total,
      tax_rate: dto.tax_rate,
      tax_total: dto.tax_total,
      total: dto.total,
      sent_at: iso(p.get("sentAt")),
      expires_at: iso(p.get("expiresAt")),
      accepted_at: iso(p.get("acceptedAt")),
      accepted_by_name: g(p, "acceptedByName"),
      declined_at: iso(p.get("declinedAt")),
    };
  },

  /**
   * Idempotent: accepting twice returns the same result. Accepting marks the estimate
   * accepted and opens a draft contract for the contractor to send for signature.
   */
  async acceptProposal(token: string, input: { name: string; email: string }): Promise<PortalProposal> {
    const p0 = await proposalByToken(token);
    if (p0.get("status") === "accepted") return this.proposal(token);
    const orgId = p0.get("organizationId") as string;
    const ip = getRequestContext()?.ipAddress ?? null;
    let contractId = "";
    const attempt = () =>
      sequelize.transaction(async (transaction) => {
        const p = (await Proposal.findByPk(p0.get("id") as string, { transaction, lock: transaction.LOCK.UPDATE }))!;
        if (p.get("status") === "accepted") return; // raced with another click
        const status = proposalStatus(p);
        if (status !== "sent") throw Errors.conflict(status === "expired" ? "This proposal has expired. Ask the contractor for a new one." : `This proposal is ${status}.`);
        const e = (await Estimate.findByPk(p.get("estimateId") as string, { transaction, lock: transaction.LOCK.UPDATE }))!;
        // Issuing a newer version withdraws older proposals, so an open one is always for the latest issued version.
        if (e.get("status") !== "issued")
          throw Errors.conflict("This proposal is no longer current. Ask the contractor for the latest version.");
        const now = new Date();
        await p.update({ status: "accepted", acceptedAt: now, acceptedByName: input.name, acceptedByEmail: input.email, acceptedIp: ip }, { transaction });
        await e.update({ status: "accepted", acceptedAt: now }, { transaction });
        // Other open proposals for this estimate can no longer be accepted.
        await Proposal.update({ status: "withdrawn", withdrawnAt: now }, { where: { estimateId: e.get("id"), status: "sent" }, transaction });
        const v = (await EstimateVersion.findByPk(p.get("estimateVersionId") as string, { transaction }))!;
        const c = await Contract.create(
          {
            organizationId: orgId,
            contractNumber: await nextNumber("contract", orgId, transaction),
            proposalId: p.get("id"),
            estimateVersionId: v.get("id"),
            customerId: p.get("customerId"),
            projectId: e.get("projectId"),
            status: "draft",
            title: v.get("title"),
            contractValue: v.get("total"),
            body: DEFAULT_CONTRACT_BODY,
            signerName: input.name,
            signerEmail: input.email,
            createdByUserId: p.get("createdByUserId"),
          },
          { transaction },
        );
        contractId = c.get("id") as string;
      });
    try {
      await attempt();
    } catch (err) {
      if (!isUniqueError(err)) throw err;
      await attempt(); // contract number race
    }
    await recordCustomerAudit(orgId, "proposal.accepted", "proposal", p0.get("id") as string, { name: input.name, email: input.email, contract_id: contractId || null });
    return this.proposal(token);
  },

  async declineProposal(token: string, reason: string | null): Promise<PortalProposal> {
    const p = await proposalByToken(token);
    const status = proposalStatus(p);
    if (status === "declined") return this.proposal(token);
    if (status !== "sent") throw Errors.conflict(`This proposal is ${status}.`);
    await sequelize.transaction(async (transaction) => {
      await p.update({ status: "declined", declinedAt: new Date(), declineReason: reason }, { transaction });
      // The estimate is declined only if no other proposal for it is still open.
      const open = await Proposal.count({ where: { estimateId: p.get("estimateId"), status: "sent" }, transaction });
      if (!open) await Estimate.update({ status: "declined" }, { where: { id: p.get("estimateId"), status: "issued" }, transaction });
    });
    await recordCustomerAudit(p.get("organizationId") as string, "proposal.declined", "proposal", p.get("id") as string, { reason });
    return this.proposal(token);
  },

  // ------------------------------------------------------------------ signatures

  async signature(token: string): Promise<PortalSignature> {
    const r = await requestByToken(token);
    const c = (await Contract.findByPk(r.get("contractId") as string))!;
    const orgId = c.get("organizationId") as string;
    const reqStatus = r.get("status") as string;
    const expiresAt = r.get("expiresAt") as Date | null;
    const expired = reqStatus !== "signed" && !!expiresAt && expiresAt.getTime() < Date.now();
    if (reqStatus === "sent" && !expired) {
      await r.update({ status: "viewed" });
      await SignatureEvent.create({ organizationId: orgId, requestId: r.get("id"), eventType: "viewed", occurredAt: new Date(), payloadSummary: { ip: getRequestContext()?.ipAddress ?? null } });
    }
    const status: PortalSignature["status"] =
      c.get("status") === "voided" ? "voided" : reqStatus === "signed" ? "signed" : reqStatus === "declined" ? "declined" : expired || reqStatus === "expired" ? "expired" : "pending";
    const { has_logo, ...from } = await orgParty(orgId);
    return {
      status,
      signer_name: g<string>(r, "signerName"),
      signer_email: g<string>(r, "signerEmail"),
      from: { ...from, logo_url: has_logo ? logoUrl(token, "sign") : null },
      document: c.get("snapshot") as ContractDocument,
      document_hash: g<string>(r, "documentHash"),
      signed:
        reqStatus === "signed"
          ? {
              signed_name: g<string>(r, "signedName"),
              signed_at: iso(r.get("completedAt"))!,
              signature_type: g(r, "signatureType") as "typed" | "drawn",
              signature_image: g(r, "signatureImage"),
            }
          : null,
      expires_at: iso(r.get("expiresAt")),
    };
  },

  /** Signs only if the signer saw exactly the frozen document (hash must match). */
  async sign(
    token: string,
    input: { signed_name: string; signature_type: "typed" | "drawn"; signature_image: string | null; document_hash: string },
  ): Promise<PortalSignature> {
    const r0 = await requestByToken(token);
    if (r0.get("status") === "signed") return this.signature(token);
    const rc = getRequestContext();
    let orgId = "";
    await sequelize.transaction(async (transaction) => {
      const r = (await SignatureRequest.findByPk(r0.get("id") as string, { transaction, lock: transaction.LOCK.UPDATE }))!;
      if (r.get("status") === "signed") return;
      if (!["sent", "viewed"].includes(r.get("status") as string)) throw Errors.conflict("This signing link is no longer active.");
      if ((r.get("expiresAt") as Date).getTime() < Date.now()) throw Errors.conflict("This signing link has expired. Ask the contractor to send it again.");
      const c = (await Contract.findByPk(r.get("contractId") as string, { transaction, lock: transaction.LOCK.UPDATE }))!;
      orgId = c.get("organizationId") as string;
      if (c.get("status") !== "pending_signature") throw Errors.conflict("This contract is no longer waiting for a signature.");
      const doc = c.get("snapshot") as ContractDocument;
      const hash = hashDocument(doc);
      if (hash !== c.get("documentHash") || hash !== r.get("documentHash") || hash !== input.document_hash)
        throw Errors.conflict("The contract changed while you were reviewing it. Reload the page and review it again.");
      const now = new Date();
      await r.update(
        {
          status: "signed",
          completedAt: now,
          signedName: input.signed_name,
          signatureType: input.signature_type,
          signatureImage: input.signature_type === "drawn" ? input.signature_image : null,
          signerIp: rc?.ipAddress ?? null,
          signerUserAgent: rc?.userAgent ?? null,
          tokenHash: r.get("tokenHash"), // keep: the signer can reopen their signed copy
        },
        { transaction },
      );
      await SignatureEvent.create(
        {
          organizationId: orgId,
          requestId: r.get("id"),
          eventType: "signed",
          occurredAt: now,
          payloadSummary: { signed_name: input.signed_name, type: input.signature_type, ip: rc?.ipAddress ?? null, user_agent: rc?.userAgent ?? null, document_hash: hash },
        },
        { transaction },
      );
      await c.update({ status: "signed", signedAt: now }, { transaction });
    });
    if (orgId) await recordCustomerAudit(orgId, "contract.signed", "contract", r0.get("contractId") as string, { signed_name: input.signed_name, document_hash: input.document_hash });
    return this.signature(token);
  },

  /** Signer declines: the link closes and the contract goes back to draft for the contractor to revise. */
  async declineSignature(token: string, reason: string | null): Promise<PortalSignature> {
    const r = await requestByToken(token);
    if (!["sent", "viewed"].includes(r.get("status") as string)) throw Errors.conflict("This signing link is no longer active.");
    const c = (await Contract.findByPk(r.get("contractId") as string))!;
    const orgId = c.get("organizationId") as string;
    await sequelize.transaction(async (transaction) => {
      await r.update({ status: "declined", declineReason: reason, completedAt: new Date() }, { transaction });
      await SignatureEvent.create({ organizationId: orgId, requestId: r.get("id"), eventType: "declined", occurredAt: new Date(), payloadSummary: { reason } }, { transaction });
      if (c.get("status") === "pending_signature") await c.update({ status: "draft", snapshot: {}, documentHash: null }, { transaction });
    });
    await recordCustomerAudit(orgId, "contract.signature_declined", "contract", c.get("id") as string, { reason });
    return this.signature(token);
  },

  /** Organization id behind a token, for serving the logo on public pages. */
  async orgForToken(token: string, kind: "p" | "sign"): Promise<string> {
    if (kind === "p") return (await proposalByToken(token)).get("organizationId") as string;
    return (await requestByToken(token)).get("organizationId") as string;
  },
};
