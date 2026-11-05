import { Suspense } from "react";
import { SettingsView } from "@web/features/settings/SettingsView";

export default function Page() {
  return (
    <Suspense>
      <SettingsView />
    </Suspense>
  );
}
