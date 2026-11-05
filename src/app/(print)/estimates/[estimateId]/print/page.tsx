import { EstimatePrintView } from "@web/features/estimates/PrintViews";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ estimateId: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const [{ estimateId }, { version }] = await Promise.all([params, searchParams]);
  return <EstimatePrintView id={estimateId} versionId={version} />;
}
