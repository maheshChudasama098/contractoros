import { parseBody, sessionRoute } from "@server/core/http/handler";
import { authService } from "@server/core/auth/auth.service";
import { RATE_LIMITS } from "@server/core/rate-limit/rate-limit";
import { ChangePasswordInput } from "@shared/contracts/auth";

export const POST = sessionRoute(
  async ({ req, session }) => {
    await authService.changePassword(session, await parseBody(req, ChangePasswordInput));
    return { changed: true };
  },
  { rateLimit: RATE_LIMITS.auth },
);
