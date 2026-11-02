import { Suspense } from "react";
import { ChangeOrdersView } from "@web/features/change-orders/ChangeOrdersView";

export default function Page() {
  return (
    <Suspense>
      <ChangeOrdersView />
    </Suspense>
  );
}
