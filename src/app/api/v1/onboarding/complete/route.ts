import { parseBody, tenantRoute } from "@server/core/http/handler";
import { onboardingService } from "@server/modules/onboarding";
import { BrandingStepInput } from "@shared/contracts/onboarding";

export const POST = tenantRoute(async ({ req, ctx }) => {
  await onboardingService.complete(ctx, await parseBody(req, BrandingStepInput));
  return { completed: true };
});
