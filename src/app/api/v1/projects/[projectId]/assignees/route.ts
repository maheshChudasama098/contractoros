import { tenantRoute } from "@server/core/http/handler";
import { taskService } from "@server/modules/projects";

export const GET = tenantRoute<{ projectId: string }>(async ({ ctx, params }) => taskService.assignees(ctx, params.projectId));
