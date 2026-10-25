import { findRecord, templateFor } from "@/lib/records";
import { useTruthStore } from "@/store/useTruthStore";
import { RecordNotFound } from "@/components/RecordNotFound";
import { TruthPendingCard } from "@/components/TruthPendingCard";
import { TruthRecordCard } from "@/components/TruthRecordCard";

export function TruthRecordPage({ id }: { id: string }) {
  const records = useTruthStore((state) => state.records);
  const capture = findRecord(records, id);
  const template = templateFor(capture);

  if (!capture || !template) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <RecordNotFound title="Record not found" description="This record is not stored in this browser. Records live on the device that created them until accounts arrive." detail={id} />
      </div>
    );
  }

  if (capture.status === "pending") {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <TruthPendingCard capture={capture} template={template} />
        </div>
      </div>
    );
  }

  if (capture.status !== "acknowledged") {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <RecordNotFound title="This record isn't available" description="It may have been discarded before it was shared. Create a new record to start again." detail={capture.id} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
      <TruthRecordCard capture={capture} template={template} />
    </div>
  );
}
