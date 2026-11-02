import { Suspense } from "react";
import { RoleEditorView } from "@web/features/access";

export default function Page() {
  return (
    <Suspense>
      <RoleEditorView />
    </Suspense>
  );
}
