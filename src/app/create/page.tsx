import type { Metadata } from "next";
import { CreateScreen } from "./CreateScreen";

export const metadata: Metadata = { title: "Create a record" };

export default function CreateRecordPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
      <CreateScreen />
    </div>
  );
}
