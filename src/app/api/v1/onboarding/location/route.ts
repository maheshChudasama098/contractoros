import { parseBody, tenantRoute } from "@server/core/http/handler";
import { onboardingService } from "@server/modules/onboarding";
import { LocationStepInput } from "@shared/contracts/onboarding";

export const PUT = tenantRoute(async ({ req, ctx }) => {
  await onboardingService.saveLocation(ctx, await parseBody(req, LocationStepInput));
  return { saved: true };
});
