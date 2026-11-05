import "server-only";
import { Organization, StoredFile, User } from "@server/core/db/models";
import { masterService } from "@server/modules/masters";
import { authorize } from "@server/core/authorization/policy";
import { Errors } from "@server/core/http/errors";
import type { Session } from "@server/core/auth/session";
import type { TenantContext } from "@server/core/tenancy/context";
import {
  LOGO_MAX_BYTES,
  type CompanyStepInput,
  type LocationStepInput,
  type OnboardingState,
  type OrganizationProfile,
  type OrganizationProfileData,
} from "@shared/contracts/onboarding";
import { recordAudit } from "@server/core/audit/audit.service";
import { IMAGE_EXT, readStoredFile, saveFile, sniffImageType } from "@server/core/storage/local-storage";

async function loadOrg(ctx: TenantContext) {
  authorize(ctx, "org.manage");
  const org = await Organization.findByPk(ctx.organizationId);
  if (!org) throw Errors.notFound("Organization");
  return org;
}

async function assertNotCompleted(org: Awaited<ReturnType<typeof loadOrg>>) {
  if (org.get("onboardingCompletedAt")) throw Errors.conflict("Onboarding is already complete.");
}

export const onboardingService = {
  /** Used by page guards: does the signed-in user still have to finish setup? */
  async isPending(session: Session): Promise<boolean> {
    if (!session.activeOrganizationId) return false;
    const org = await Organization.findByPk(session.activeOrganizationId, { attributes: ["onboardingCompletedAt"] });
    return !!org && !org.get("onboardingCompletedAt");
  },

  async getState(ctx: TenantContext): Promise<OnboardingState> {
    const org = await loadOrg(ctx);
    const user = await User.findByPk(ctx.userId, { attributes: ["email"] });
    const g = (k: string) => (org.get(k) as string | null) ?? undefined;
    return {
      completed: !!org.get("onboardingCompletedAt"),
      email: (user?.get("email") as string) ?? "",
      company: { name: g("name"), phone: g("phone"), industryId: g("industryId"), companySize: g("companySize") },
      location: {
        addressLine1: g("addressLine1"),
        city: g("city"),
        state: g("state"),
        postalCode: g("postalCode"),
        timezone: g("timezone") === "UTC" ? undefined : g("timezone"),
      },
      branding: { googleReviewUrl: (org.get("googleReviewUrl") as string | null) ?? null, hasLogo: !!org.get("logoFileId") },
    };
  },

  async saveCompany(ctx: TenantContext, input: CompanyStepInput) {
    const org = await loadOrg(ctx);
    await assertNotCompleted(org);
    const [industryOk, sizeOk] = await Promise.all([
      masterService.isActiveValue("industry", input.industryId),
      masterService.isActiveValue("company_size", input.companySize),
    ]);
    if (!industryOk || !sizeOk)
      throw Errors.validation({
        ...(!industryOk && { industryId: ["Choose an industry."] }),
        ...(!sizeOk && { companySize: ["Choose a company size."] }),
      });
    await org.update(input);
  },

  async saveLocation(ctx: TenantContext, input: LocationStepInput) {
    const org = await loadOrg(ctx);
    await assertNotCompleted(org);
    if (!(await masterService.isActiveValue("time_zone", input.timezone)))
      throw Errors.validation({ timezone: ["Choose a time zone."] });
    await org.update({ ...input, country: "US" });
  },

  /** Final step: requires the earlier steps, then marks onboarding complete. */
  async complete(ctx: TenantContext, input: { googleReviewUrl: string | null }) {
    const org = await loadOrg(ctx);
    await assertNotCompleted(org);
    if (!org.get("industryId") || !org.get("companySize")) throw Errors.validation({ _step: ["Finish the company step first."] });
    if (!org.get("addressLine1") || !org.get("postalCode")) throw Errors.validation({ _step: ["Finish the location step first."] });
    await org.update({ googleReviewUrl: input.googleReviewUrl, onboardingCompletedAt: new Date() });
  },

  async uploadLogo(ctx: TenantContext, file: File) {
    const org = await loadOrg(ctx);
    if (file.size > LOGO_MAX_BYTES) throw Errors.validation({ logo: ["Logo must be 2 MB or smaller."] });
    const buf = Buffer.from(await file.arrayBuffer());
    const mimeType = sniffImageType(buf);
    if (!mimeType || !IMAGE_EXT[mimeType]) throw Errors.validation({ logo: ["Upload a PNG, JPG or WebP image."] });

    const { key, checksum } = await saveFile(ctx.organizationId, "logos", buf, IMAGE_EXT[mimeType]!);
    const stored = await StoredFile.create({
      organizationId: ctx.organizationId,
      storageProvider: "local",
      bucketKey: key,
      originalFilename: file.name.slice(0, 255) || "logo",
      mimeType,
      sizeBytes: buf.length,
      checksumSha256: checksum,
      uploadedByUserId: ctx.userId,
      scanStatus: "not_required",
      status: "available",
    });
    await org.update({ logoFileId: stored.get("id") });
  },

  async getLogo(ctx: Pick<TenantContext, "organizationId">) {
    const org = await Organization.findByPk(ctx.organizationId, { attributes: ["logoFileId"] });
    const fileId = org?.get("logoFileId") as string | null;
    const file = fileId && (await StoredFile.findOne({ where: { id: fileId, organizationId: ctx.organizationId } }));
    if (!file) throw Errors.notFound("Logo");
    return { body: await readStoredFile(file.get("bucketKey") as string), mimeType: file.get("mimeType") as string };
  },

  // ---- Settings → Organization (after onboarding)

  async getProfile(ctx: TenantContext): Promise<OrganizationProfile> {
    const org = await loadOrg(ctx);
    const g = (k: string) => (org.get(k) as string | null) ?? "";
    return {
      name: g("name"),
      slug: g("slug"),
      phone: g("phone"),
      email: g("email"),
      website: g("website"),
      industryId: g("industryId"),
      companySize: g("companySize"),
      addressLine1: g("addressLine1"),
      addressLine2: g("addressLine2"),
      city: g("city"),
      state: g("state"),
      postalCode: g("postalCode"),
      timezone: g("timezone"),
      googleReviewUrl: g("googleReviewUrl"),
      hasLogo: !!org.get("logoFileId"),
    };
  },

  async updateProfile(ctx: TenantContext, input: OrganizationProfileData) {
    const org = await loadOrg(ctx);
    const [industryOk, sizeOk, tzOk] = await Promise.all([
      masterService.isActiveValue("industry", input.industryId),
      masterService.isActiveValue("company_size", input.companySize),
      masterService.isActiveValue("time_zone", input.timezone),
    ]);
    if (!industryOk || !sizeOk || !tzOk)
      throw Errors.validation({
        ...(!industryOk && { industryId: ["Choose an industry."] }),
        ...(!sizeOk && { companySize: ["Choose a company size."] }),
        ...(!tzOk && { timezone: ["Choose a time zone."] }),
      });
    await org.update(input);
    await recordAudit(ctx, { action: "organization.updated", entityType: "organization", entityId: ctx.organizationId });
    return this.getProfile(ctx);
  },

  async removeLogo(ctx: TenantContext) {
    const org = await loadOrg(ctx);
    await org.update({ logoFileId: null });
  },
};
