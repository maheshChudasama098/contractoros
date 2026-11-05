import { parseBody, tenantRoute } from "@server/core/http/handler";
import { contractService } from "@server/modules/estimates";
import { ContractInput } from "@shared/contracts/proposals";

type P = { contractId: string };

export const GET = tenantRoute<P>(async ({ ctx, params }) => contractService.get(ctx, params.contractId));

/** Draft only. */
export const PUT = tenantRoute<P>(async ({ req, ctx, params }) =>
  contractService.update(ctx, params.contractId, await parseBody(req, ContractInput)),
);
