import { parseBody, tenantRoute } from "@server/core/http/handler";
import { onboardingService } from "@server/modules/onboarding";
import { OrganizationProfileInput } from "@shared/contracts/onboarding";

export const GET = tenantRoute(async ({ ctx }) => onboardingService.getProfile(ctx));

export const PUT = tenantRoute(async ({ req, ctx }) =>
  onboardingService.updateProfile(ctx, await parseBody(req, OrganizationProfileInput)),
);
