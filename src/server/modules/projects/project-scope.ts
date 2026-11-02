import "server-only";
import { Project } from "@server/core/db/models";
import { authorize } from "@server/core/authorization/policy";
import { recordAudit } from "@server/core/audit/audit.service";
import { Errors } from "@server/core/http/errors";
import type { PermissionKey } from "@server/core/authorization/permissions";
import type { TenantContext } from "@server/core/tenancy/context";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Checks the permission and that the project belongs to the caller's company. */
export async function requireProject(ctx: TenantContext, projectId: string, permission: PermissionKey = "project.read") {
  authorize(ctx, permission);
  const p = UUID.test(projectId)
    ? await Project.findOne({ where: { id: projectId, organizationId: ctx.organizationId }, attributes: ["id", "name", "projectNumber"] })
    : null;
  if (!p) throw Errors.notFound("Project");
  return p;
}

/**
 * Everything that happens on a project is audited against the project itself,
 * so the Activity tab is a single indexed query.
 */
export function projectAudit(
  ctx: TenantContext,
  projectId: string,
  action: string,
  detail?: { before?: unknown; after?: unknown },
) {
  return recordAudit(ctx, {
    action,
    entityType: "project",
    entityId: projectId,
    ...(detail?.before !== undefined && { before: detail.before as never }),
    ...(detail?.after !== undefined && { after: detail.after as never }),
  });
}

/** Postgres DATEONLY comes back as "YYYY-MM-DD"; Dates are formatted the same way. */
export const ymd = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v).slice(0, 10) : null);
export const money2 = (v: unknown) => Number(v ?? 0).toFixed(2);
