import type { Metadata } from "next";
import { SharedLinkScreen } from "@/components/SharedLinkScreen";

export const metadata: Metadata = { title: "Shared record" };

export default function SharedRecord() {
  return <SharedLinkScreen />;
}
