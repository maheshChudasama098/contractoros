import { tenantRoute } from "@server/core/http/handler";
import { onboardingService } from "@server/modules/onboarding";

export const GET = tenantRoute(({ ctx }) => onboardingService.getState(ctx));
