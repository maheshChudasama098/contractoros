import { tenantRoute } from "@server/core/http/handler";
import { estimateService } from "@server/modules/estimates";

type P = { estimateId: string };

/** New draft version copied from the latest issued one. */
export const POST = tenantRoute<P>(async ({ ctx, params }) => estimateService.revise(ctx, params.estimateId));

/** Discards the unissued revision draft. */
export const DELETE = tenantRoute<P>(async ({ ctx, params }) => estimateService.discardDraft(ctx, params.estimateId));
