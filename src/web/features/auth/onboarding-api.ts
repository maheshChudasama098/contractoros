import { ApiClientError, api } from "@web/lib/api-client";
import type { MasterOption, MasterType } from "@shared/contracts/masters";
import type { ApiError } from "@shared/contracts/api";
import type {
  BrandingStepInput,
  CompanyStepInput,
  LocationStepInput,
  OnboardingState,
} from "@shared/contracts/onboarding";

const send = <T>(method: string, path: string, body: unknown) => api<T>(path, { method, body: JSON.stringify(body) });

export const onboardingApi = {
  state: () => api<OnboardingState>("/onboarding"),
  options: (type: MasterType) => api<MasterOption[]>(`/masters/${type}`),
  saveCompany: (input: CompanyStepInput) => send<{ saved: true }>("PUT", "/onboarding/company", input),
  saveLocation: (input: LocationStepInput) => send<{ saved: true }>("PUT", "/onboarding/location", input),
  complete: (input: BrandingStepInput) => send<{ completed: true }>("POST", "/onboarding/complete", input),

  // Multipart upload: the browser sets the boundary, so skip api()'s JSON content-type.
  async uploadLogo(file: File) {
    const body = new FormData();
    body.append("logo", file);
    const res = await fetch("/api/v1/onboarding/logo", { method: "POST", body, credentials: "same-origin" });
    if (!res.ok) throw new ApiClientError(res.status, ((await res.json()) as ApiError).error);
  },
};
