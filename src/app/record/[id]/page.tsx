import type { Metadata } from "next";
import { TruthRecordPage } from "@/components/TruthRecordPage";

export const metadata: Metadata = { title: "Your record" };

export default async function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <TruthRecordPage id={id} />;
}
