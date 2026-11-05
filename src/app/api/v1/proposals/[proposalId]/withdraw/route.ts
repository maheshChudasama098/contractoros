import { tenantRoute } from "@server/core/http/handler";
import { proposalService } from "@server/modules/estimates";

export const POST = tenantRoute<{ proposalId: string }>(async ({ ctx, params }) => proposalService.withdraw(ctx, params.proposalId));
