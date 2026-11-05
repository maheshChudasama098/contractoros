import { parseBody, publicRoute } from "@server/core/http/handler";
import { RATE_LIMITS } from "@server/core/rate-limit/rate-limit";
import { portalService } from "@server/modules/estimates";
import { DeclineInput } from "@shared/contracts/proposals";

export const POST = publicRoute<{ token: string }>(
  async ({ req, params }) => portalService.declineSignature(params.token, (await parseBody(req, DeclineInput)).reason),
  { rateLimit: RATE_LIMITS.portal },
);
