import { publicRoute } from "@server/core/http/handler";
import { authService } from "@server/core/auth/auth.service";

export const GET = publicRoute(() => authService.me());
