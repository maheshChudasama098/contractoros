import { authRoute, parseBody } from "@server/core/http/handler";
import { authService } from "@server/core/auth/auth.service";
import { ResetPasswordInput } from "@shared/contracts/auth";

export const POST = authRoute(async ({ req }) => {
  await authService.resetPassword(await parseBody(req, ResetPasswordInput));
  return { reset: true };
});
