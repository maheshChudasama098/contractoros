import { Suspense } from "react";
import { ProjectDetailView } from "@web/features/projects/detail/ProjectDetailView";

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <Suspense>
      <ProjectDetailView projectId={projectId} />
    </Suspense>
  );
}
