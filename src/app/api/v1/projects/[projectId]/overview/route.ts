import { tenantRoute } from "@server/core/http/handler";
import { projectDetailService } from "@server/modules/projects";

export const GET = tenantRoute<{ projectId: string }>(async ({ ctx, params }) => projectDetailService.overview(ctx, params.projectId));
