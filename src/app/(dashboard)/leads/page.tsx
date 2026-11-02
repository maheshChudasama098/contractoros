import { Suspense } from "react";
import { LeadsView } from "@web/features/leads";

export default function LeadsPage() {
  return (
    <Suspense>
      <LeadsView />
    </Suspense>
  );
}
