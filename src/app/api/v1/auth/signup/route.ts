import { authRoute, parseBody } from "@server/core/http/handler";
import { authService } from "@server/core/auth/auth.service";
import { SignupInput } from "@shared/contracts/auth";

export const POST = authRoute(async ({ req }) => authService.signup(await parseBody(req, SignupInput)));
