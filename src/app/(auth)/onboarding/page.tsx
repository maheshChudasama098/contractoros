import { requirePendingOnboarding } from "@server/core/auth/guards";
import { OnboardingView } from "@web/features/auth/OnboardingView";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requirePendingOnboarding();
  return <OnboardingView />;
}
