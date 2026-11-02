import { tenantRoute } from "@server/core/http/handler";
import { leadService } from "@server/modules/leads";

export const GET = tenantRoute<{ leadId: string }>(async ({ ctx, params }) => leadService.get(ctx, params.leadId));
