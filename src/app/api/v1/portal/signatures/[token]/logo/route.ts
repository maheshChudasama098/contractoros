import { publicRoute } from "@server/core/http/handler";
import { RATE_LIMITS } from "@server/core/rate-limit/rate-limit";
import { portalService } from "@server/modules/estimates";
import { onboardingService } from "@server/modules/onboarding";

export const GET = publicRoute<{ token: string }>(
  async ({ params }) => {
    const organizationId = await portalService.orgForToken(params.token, "sign");
    const { body, mimeType } = await onboardingService.getLogo({ organizationId });
    return new Response(new Uint8Array(body), {
      headers: { "content-type": mimeType, "cache-control": "private, max-age=300", "x-content-type-options": "nosniff" },
    });
  },
  { rateLimit: RATE_LIMITS.portal },
);
