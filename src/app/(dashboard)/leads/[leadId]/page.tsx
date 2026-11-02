import { LeadDetailView } from "@web/features/leads";

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  return <LeadDetailView id={leadId} />;
}
