import { publicRoute } from "@server/core/http/handler";
import { RATE_LIMITS } from "@server/core/rate-limit/rate-limit";
import { shareService } from "@server/modules/projects";

export const GET = publicRoute<{ token: string }>(async ({ params }) => shareService.view(params.token), { rateLimit: RATE_LIMITS.portal });
