import { EstimateDetailView } from "@web/features/estimates/EstimateDetailView";

export default async function Page({ params }: { params: Promise<{ estimateId: string }> }) {
  const { estimateId } = await params;
  return <EstimateDetailView id={estimateId} />;
}
