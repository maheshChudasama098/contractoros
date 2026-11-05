import { parseBody, tenantRoute } from "@server/core/http/handler";
import { contractService } from "@server/modules/estimates";
import { CreateProjectFromContractInput } from "@shared/contracts/proposals";

export const POST = tenantRoute<{ contractId: string }>(async ({ req, ctx, params }) =>
  contractService.createProject(ctx, params.contractId, await parseBody(req, CreateProjectFromContractInput)),
);
