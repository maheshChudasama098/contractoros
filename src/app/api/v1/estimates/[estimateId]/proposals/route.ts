import { parseBody, tenantRoute } from "@server/core/http/handler";
import { proposalService } from "@server/modules/estimates";
import { SendProposalInput } from "@shared/contracts/proposals";

export const POST = tenantRoute<{ estimateId: string }>(async ({ req, ctx, params }) =>
  proposalService.send(ctx, params.estimateId, await parseBody(req, SendProposalInput)),
);
