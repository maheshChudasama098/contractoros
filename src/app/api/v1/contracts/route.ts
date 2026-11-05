import { parseQuery, tenantRoute } from "@server/core/http/handler";
import { contractService } from "@server/modules/estimates";
import { ContractListQuery } from "@shared/contracts/proposals";

export const GET = tenantRoute(async ({ req, ctx }) => contractService.list(ctx, parseQuery(req, ContractListQuery)));
