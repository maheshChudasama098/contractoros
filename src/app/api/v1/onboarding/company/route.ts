import { parseBody, tenantRoute } from "@server/core/http/handler";
import { onboardingService } from "@server/modules/onboarding";
import { CompanyStepInput } from "@shared/contracts/onboarding";

export const PUT = tenantRoute(async ({ req, ctx }) => {
  await onboardingService.saveCompany(ctx, await parseBody(req, CompanyStepInput));
  return { saved: true };
});
