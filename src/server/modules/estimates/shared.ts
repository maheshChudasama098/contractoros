import "server-only";
import type { Model, Transaction } from "sequelize";
import { Customer, Organization, sequelize } from "@server/core/db/models";
import { prisma } from "@server/core/db/prisma";
import { getRequestContext } from "@server/core/context/request-context";
import { fromCents, toCents } from "@shared/lib/invoice-math";
import type { Party } from "@shared/contracts/invoices";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const g = <T = string | null>(m: Model, k: string) => m.get(k) as T;
export const ymd = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v).slice(0, 10) : null);
export const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : null);
export const money = (v: unknown) => fromCents(toCents((v ?? 0) as string));
export const todayYmd = () => new Date().toISOString().slice(0, 10);

const NUMBER_SOURCES = {
  estimate: { table: "estimates", column: "estimate_number", prefix: "EST" },
  proposal: { table: "proposals", column: "proposal_number", prefix: "PR" },
  contract: { table: "contracts", column: "contract_number", prefix: "CT" },
} as const;

/** Next PREFIX-#### for the company (starts at 1001). Callers retry once on a unique-index race. */
export async function nextNumber(kind: keyof typeof NUMBER_SOURCES, organizationId: string, transaction: Transaction) {
  const { table, column, prefix } = NUMBER_SOURCES[kind];
  const [rows] = await sequelize.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(${column} FROM ${prefix.length + 2}) AS INTEGER)), 1000) + 1 AS n
       FROM ${table} WHERE organization_id = :org AND ${column} ~ '^${prefix}-[0-9]+$'`,
    { replacements: { org: organizationId }, transaction },
  );
  return `${prefix}-${(rows as { n: number }[])[0]!.n}`;
}

const joinAddress = (...parts: unknown[]) => {
  const [l1, l2, city, state, zip] = parts;
  return [l1, l2, [city, [state, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")].filter((x): x is string => !!x);
};

export function customerParty(c: Model): Party {
  return {
    name: g<string>(c, "displayName"),
    email: g(c, "email"),
    phone: g(c, "phone"),
    address_lines: joinAddress(g(c, "billingAddressLine1"), g(c, "billingAddressLine2"), g(c, "billingCity"), g(c, "billingState"), g(c, "billingPostalCode")),
  };
}

export async function orgParty(organizationId: string, transaction?: Transaction): Promise<Party & { has_logo: boolean }> {
  const org = await Organization.findByPk(organizationId, { transaction });
  return {
    name: (org?.get("name") as string) ?? "",
    email: (org?.get("email") as string | null) ?? null,
    phone: (org?.get("phone") as string | null) ?? null,
    address_lines: org ? joinAddress(org.get("addressLine1"), org.get("addressLine2"), org.get("city"), org.get("state"), org.get("postalCode")) : [],
    has_logo: !!org?.get("logoFileId"),
  };
}

export const customerById = (id: string, transaction?: Transaction) => Customer.findByPk(id, { transaction });

/** Audit for actions a customer takes through a token link (no user session). */
export async function recordCustomerAudit(organizationId: string, action: string, entityType: string, entityId: string, after?: object) {
  const rc = getRequestContext();
  await prisma.auditLog.create({
    data: {
      organizationId,
      actorType: "customer",
      action,
      entityType,
      entityId,
      requestId: rc?.requestId,
      ipAddress: rc?.ipAddress,
      userAgent: rc?.userAgent,
      afterSnapshot: (after ?? undefined) as never,
    },
  });
}
