import { parseBody, parseQuery, tenantRoute } from "@server/core/http/handler";
import { estimateService } from "@server/modules/estimates";
import { EstimateInput, EstimateListQuery } from "@shared/contracts/estimates";

export const GET = tenantRoute(async ({ req, ctx }) => estimateService.list(ctx, parseQuery(req, EstimateListQuery)));

export const POST = tenantRoute(async ({ req, ctx }) => estimateService.create(ctx, await parseBody(req, EstimateInput)));
