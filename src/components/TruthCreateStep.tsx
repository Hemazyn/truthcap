import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useTruthStore } from "@/store/useTruthStore";
import { findActiveRecord, templateFor } from "@/lib/records";
import { navigate, routes } from "@/lib/router";
import { cn } from "@/lib/utils";
import { TruthTemplatePicker } from "@/components/TruthTemplatePicker";
import { TruthInstructions } from "@/components/TruthInstructions";
import { TruthCaptureForm } from "@/components/TruthCaptureForm";
import { TruthPendingCard } from "@/components/TruthPendingCard";

type Step = "pick" | "fill" | "share";

const STEP_LABELS: { id: Step; label: string }[] = [
  { id: "pick", label: "Pick the moment" },
  { id: "fill", label: "Fill in details" },
  { id: "share", label: "Share it" },
];

export function TruthCreateStep() {
  const records = useTruthStore((state) => state.records);
  const activeId = useTruthStore((state) => state.activeId);
  const startCapture = useTruthStore((state) => state.startCapture);
  const discardDraft = useTruthStore((state) => state.discardDraft);
  const reopenDraft = useTruthStore((state) => state.reopenDraft);
  const clearActive = useTruthStore((state) => state.clearActive);

  const activeCapture = findActiveRecord(records, activeId);

  // /create always begins something new: a record that was already waiting for
  // acknowledgment when this screen opened is dropped (it stays in Records),
  // while a draft in progress is picked back up. Read once on entry so a record
  // that turns pending while this screen stays open keeps its share step.
  const [stalePendingId] = useState(() => (activeCapture?.status === "pending" ? activeCapture.id : null));

  useEffect(() => {
    if (stalePendingId) clearActive();
  }, [stalePendingId, clearActive]);

  const capture = stalePendingId && activeCapture?.id === stalePendingId ? null : activeCapture;
  const template = templateFor(capture);
  const step: Step = !capture ? "pick" : capture.status === "draft" ? "fill" : "share";
  const currentIndex = STEP_LABELS.findIndex((item) => item.id === step);

  const goBack = () => {
    if (step === "pick") {
      navigate(routes.home());
      return;
    }
    if (step === "fill") {
      discardDraft();
      return;
    }
    reopenDraft();
  };

  useEffect(() => {
    if (capture?.status === "acknowledged") {
      navigate(routes.record(capture.id));
    }
  }, [capture?.status, capture?.id]);

  if (capture?.status === "acknowledged") {
    return <p className="py-8 text-sm text-ink-2">Opening your record…</p>;
  }

  return (
    <div className={cn(step !== "pick" && "mx-auto max-w-5xl")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10.5px] font-semibold tracking-[0.16em] text-brand-700 uppercase">Create a record</p>
      </div>

      <ol className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2">
        {STEP_LABELS.map((item, index) => {
          const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "todo";

          return (
            <li key={item.id} className="flex items-center gap-2">
              <span className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold", state === "current" && "border-brand-600 bg-brand-600 text-white", state === "done" && "border-brand-200 bg-brand-50 text-brand-800", state === "todo" && "border-line bg-surface text-ink-3")}>
                {state === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <span className={cn("grid h-4 w-4 place-items-center rounded-full text-[10px]", state === "current" ? "bg-white/20" : "bg-surface-2")}>{index + 1}</span>}
                {item.label}
              </span>
              {index < STEP_LABELS.length - 1 && <span className="hidden h-px w-4 bg-line-strong sm:block" />}
            </li>
          );
        })}
      </ol>

      <div className={cn("mt-8", step === "pick" && "grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-8")}>
        <div>
          {step === "pick" && <TruthTemplatePicker onSelect={startCapture} />}
          {step === "fill" && capture && template && <TruthCaptureForm capture={capture} template={template} onBack={goBack} />}
          {step === "share" && capture && template && <TruthPendingCard capture={capture} template={template} onBack={goBack} />}
        </div>

        {step === "pick" && (
          <div className="hidden lg:block">
            <TruthInstructions />
          </div>
        )}
      </div>
    </div>
  );
}
