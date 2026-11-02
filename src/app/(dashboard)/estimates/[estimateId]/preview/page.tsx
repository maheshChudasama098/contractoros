import { EstimatePreviewView } from "@web/features/estimates/EstimatePreviewView";

export default async function Page({ params }: { params: Promise<{ estimateId: string }> }) {
  const { estimateId } = await params;
  return <EstimatePreviewView id={estimateId} />;
}
