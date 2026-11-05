import { parseBody, tenantRoute } from "@server/core/http/handler";
import { contractService } from "@server/modules/estimates";
import { SendForSignatureInput } from "@shared/contracts/proposals";

export const POST = tenantRoute<{ contractId: string }>(async ({ req, ctx, params }) =>
  contractService.sendForSignature(ctx, params.contractId, (await parseBody(req, SendForSignatureInput)).expires_in_days),
);
