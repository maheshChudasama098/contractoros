import { authRoute, parseBody } from "@server/core/http/handler";
import { authService } from "@server/core/auth/auth.service";
import { LoginInput } from "@shared/contracts/auth";

export const POST = authRoute(async ({ req }) => authService.login(await parseBody(req, LoginInput)));
