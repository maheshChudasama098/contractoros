import { tenantRoute } from "@server/core/http/handler";
import { proposalService } from "@server/modules/estimates";

/** Issues a fresh customer link (the previous one stops working). */
export const POST = tenantRoute<{ proposalId: string }>(async ({ ctx, params }) => proposalService.renewLink(ctx, params.proposalId));
