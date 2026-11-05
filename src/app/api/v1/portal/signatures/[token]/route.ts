import { publicRoute } from "@server/core/http/handler";
import { RATE_LIMITS } from "@server/core/rate-limit/rate-limit";
import { portalService } from "@server/modules/estimates";

export const GET = publicRoute<{ token: string }>(async ({ params }) => portalService.signature(params.token), { rateLimit: RATE_LIMITS.portal });
