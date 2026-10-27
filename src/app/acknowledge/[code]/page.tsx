import type { Metadata } from "next";
import { TruthAcknowledgePage } from "@/components/TruthAcknowledgePage";

export const metadata: Metadata = { title: "Review and acknowledge" };

export default async function AcknowledgePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  return <TruthAcknowledgePage code={code} />;
}
