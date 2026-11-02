import { EstimateEditorView } from "@web/features/estimates/EstimateEditorView";

export default async function Page({ params }: { params: Promise<{ estimateId: string }> }) {
  const { estimateId } = await params;
  return <EstimateEditorView id={estimateId} />;
}
