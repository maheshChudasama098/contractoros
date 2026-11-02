import { authRoute, parseBody } from "@server/core/http/handler";
import { authService } from "@server/core/auth/auth.service";
import { ForgotPasswordInput } from "@shared/contracts/auth";

// Same response whether or not the email exists.
export const POST = authRoute(async ({ req }) => {
  await authService.forgotPassword(await parseBody(req, ForgotPasswordInput));
  return { sent: true };
});
