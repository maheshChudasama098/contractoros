import { Suspense } from "react";
import { InvoicesView } from "@web/features/invoices/InvoicesView";

export default function Page() {
  return (
    <Suspense>
      <InvoicesView />
    </Suspense>
  );
}
