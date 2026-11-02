import { Suspense } from "react";
import { RoleEditorView } from "@web/features/access";

export default async function Page({ params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  return (
    <Suspense>
      <RoleEditorView id={roleId} />
    </Suspense>
  );
}
