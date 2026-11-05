import { Errors } from "@server/core/http/errors";
import { tenantRoute } from "@server/core/http/handler";
import { onboardingService } from "@server/modules/onboarding";

export const GET = tenantRoute(async ({ ctx }) => {
  const { body, mimeType } = await onboardingService.getLogo(ctx);
  return new Response(new Uint8Array(body), {
    headers: { "content-type": mimeType, "cache-control": "private, no-cache", "x-content-type-options": "nosniff" },
  });
});

export const POST = tenantRoute(async ({ req, ctx }) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("logo");
  if (!(file instanceof File)) throw Errors.validation({ logo: ["Choose an image to upload."] });
  await onboardingService.uploadLogo(ctx, file);
  return { uploaded: true };
});

export const DELETE = tenantRoute(async ({ ctx }) => {
  await onboardingService.removeLogo(ctx);
  return { removed: true };
});
