import { Suspense } from "react";
import { FilesView } from "@web/features/files/FilesView";

export default function Page() {
  return (
    <Suspense>
      <FilesView />
    </Suspense>
  );
}
