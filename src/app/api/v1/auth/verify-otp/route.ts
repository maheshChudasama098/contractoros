import { authRoute, parseBody } from "@server/core/http/handler";
import { authService } from "@server/core/auth/auth.service";
import { VerifyOtpInput } from "@shared/contracts/auth";

export const POST = authRoute(async ({ req }) => authService.verifyOtp(await parseBody(req, VerifyOtpInput)));
