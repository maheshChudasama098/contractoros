import { tenantRoute } from "@server/core/http/handler";
import { estimateService } from "@server/modules/estimates";

export const POST = tenantRoute<{ estimateId: string }>(async ({ ctx, params }) => estimateService.issue(ctx, params.estimateId));
