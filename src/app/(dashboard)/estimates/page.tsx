import { Suspense } from "react";
import { EstimatesView } from "@web/features/estimates/EstimatesView";

export default function Page() {
  return (
    <Suspense>
      <EstimatesView />
    </Suspense>
  );
}
