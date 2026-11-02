import { ProjectView } from "@web/features/projects/ProjectView";

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectView id={projectId} />;
}
