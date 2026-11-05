import { parseBody, tenantRoute } from "@server/core/http/handler";
import { estimateService } from "@server/modules/estimates";
import { EstimateInput } from "@shared/contracts/estimates";

type P = { estimateId: string };

/** ?version=<versionId> shows an older version. */
export const GET = tenantRoute<P>(async ({ req, ctx, params }) =>
  estimateService.get(ctx, params.estimateId, req.nextUrl.searchParams.get("version") ?? undefined),
);

/** Edits the latest version while it's a draft (draft only). */
export const PUT = tenantRoute<P>(async ({ req, ctx, params }) =>
  estimateService.update(ctx, params.estimateId, await parseBody(req, EstimateInput)),
);

export const DELETE = tenantRoute<P>(async ({ ctx, params }) => {
  await estimateService.remove(ctx, params.estimateId);
  return { deleted: true };
});
