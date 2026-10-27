import type { Metadata } from "next";
import { RecordsPage } from "@/components/RecordsPage";

export const metadata: Metadata = { title: "Your records" };

export default function Records() {
  return <RecordsPage />;
}
