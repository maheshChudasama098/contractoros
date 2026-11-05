import { parseQuery, tenantRoute } from "@server/core/http/handler";
import { proposalService } from "@server/modules/estimates";
import { ProposalListQuery } from "@shared/contracts/proposals";

export const GET = tenantRoute(async ({ req, ctx }) => proposalService.list(ctx, parseQuery(req, ProposalListQuery)));
