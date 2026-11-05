import { z } from "zod";

// Onboarding contracts shared by /api/v1/onboarding/* and the web forms. Menu options come from master data.

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const CompanyStepInput = z.object({
  name: z.string().trim().min(1, "Company name is required.").max(160),
  phone: z.string().trim().regex(/^[+()\d\s.-]{7,20}$/, "Enter a valid phone number."),
  industryId: z.string().uuid("Choose an industry."),
  companySize: z.string().trim().min(1, "Choose a company size.").max(24),
});
export type CompanyStepInput = z.infer<typeof CompanyStepInput>;

export const LocationStepInput = z.object({
  addressLine1: z.string().trim().min(1, "Business address is required.").max(180),
  city: z.string().trim().min(1, "City is required.").max(100),
  state: z.string().trim().min(1, "State is required.").max(80),
  postalCode: z.string().trim().min(1, "ZIP code is required.").max(20),
  timezone: z.string().trim().min(1, "Choose a time zone.").max(64),
});
export type LocationStepInput = z.infer<typeof LocationStepInput>;

export const BrandingStepInput = z.object({
  googleReviewUrl: z
    .string()
    .trim()
    .max(500)
    .url("Enter a full link, like https://g.page/r/…")
    .or(z.literal(""))
    .transform((v) => v || null),
});
export type BrandingStepInput = z.input<typeof BrandingStepInput>;

export type OnboardingState = {
  completed: boolean;
  email: string;
  company: Partial<CompanyStepInput>;
  location: Partial<LocationStepInput>;
  branding: { googleReviewUrl: string | null; hasLogo: boolean };
};

const optional = (max: number) =>
  z.string().trim().max(max).nullish().transform((v) => v || null);

/** Settings → Organization: everything onboarding collects, editable afterwards. */
export const OrganizationProfileInput = CompanyStepInput.merge(LocationStepInput).extend({
  email: z.string().trim().max(254).email("Enter a valid email.").or(z.literal("")).nullish().transform((v) => v || null),
  website: z.string().trim().max(255).url("Enter a full link, like https://example.com").or(z.literal("")).nullish().transform((v) => v || null),
  addressLine2: optional(180),
  googleReviewUrl: BrandingStepInput.shape.googleReviewUrl,
});
export type OrganizationProfileInput = z.input<typeof OrganizationProfileInput>;
export type OrganizationProfileData = z.output<typeof OrganizationProfileInput>;

export type OrganizationProfile = {
  name: string;
  slug: string;
  phone: string;
  email: string;
  website: string;
  industryId: string;
  companySize: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  timezone: string;
  googleReviewUrl: string;
  hasLogo: boolean;
};
