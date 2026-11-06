import { tenantRoute } from "@server/core/http/handler";
import { shareService } from "@server/modules/projects";

export const POST = tenantRoute<{ projectId: string; linkId: string }>(async ({ ctx, params }) =>
  shareService.revoke(ctx, params.projectId, params.linkId),
);
