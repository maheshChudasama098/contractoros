import { parseBody, tenantRoute } from "@server/core/http/handler";
import { shareService } from "@server/modules/projects";
import { CreateShareLinkInput } from "@shared/contracts/project-share";

type P = { projectId: string };

export const GET = tenantRoute<P>(async ({ ctx, params }) => shareService.list(ctx, params.projectId));

/** Returns the link URL once; only its hash is stored. */
export const POST = tenantRoute<P>(async ({ req, ctx, params }) =>
  shareService.create(ctx, params.projectId, await parseBody(req, CreateShareLinkInput)),
);
