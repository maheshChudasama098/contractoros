import { parseBody, publicRoute } from "@server/core/http/handler";
import { RATE_LIMITS } from "@server/core/rate-limit/rate-limit";
import { portalService } from "@server/modules/estimates";
import { AcceptProposalInput } from "@shared/contracts/proposals";

export const POST = publicRoute<{ token: string }>(
  async ({ req, params }) => portalService.acceptProposal(params.token, await parseBody(req, AcceptProposalInput)),
  { rateLimit: RATE_LIMITS.portal },
);
