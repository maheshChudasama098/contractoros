import { parseBody, publicRoute, sessionRoute } from "@server/core/http/handler";
import { authService } from "@server/core/auth/auth.service";
import { UpdateProfileInput } from "@shared/contracts/auth";

export const GET = publicRoute(() => authService.me());

export const PATCH = sessionRoute(async ({ req, session }) =>
  authService.updateProfile(session, await parseBody(req, UpdateProfileInput)),
);
