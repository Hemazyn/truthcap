import type { Metadata } from "next";
import { ShortRecordPage } from "@/components/ShortRecordPage";

export const metadata: Metadata = { title: "Shared record" };

export default async function ShortRecord({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ShortRecordPage id={id} />;
}
