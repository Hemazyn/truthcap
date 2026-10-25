import { useState } from "react";
import type { FormEvent } from "react";
import { Check, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { navigate, routes } from "@/lib/router";
import { findRecordByCode, templateFor } from "@/lib/records";
import { useTruthStore } from "@/store/useTruthStore";
import { Button } from "@/components/ui/Button";
import { RecordSummary } from "@/components/RecordSummary";
import { PartyList } from "@/components/PartyList";
import { RecordNotFound } from "@/components/RecordNotFound";

export function TruthAcknowledgePage({ code }: { code: string }) {
  const records = useTruthStore((state) => state.records);
  const acknowledge = useTruthStore((state) => state.acknowledge);

  const capture = findRecordByCode(records, code);
  const template = templateFor(capture);

  const [entered, setEntered] = useState(code);
  const [error, setError] = useState<string | null>(null);

  if (!capture || !template) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <RecordNotFound title="We can't find that record" description="This code does not match a record stored in this browser. Ask the other person to send the share link again, or create a new record." detail={code} />
      </div>
    );
  }

  if (capture.status === "acknowledged") {
    return (
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-2xl rounded-3xl border border-line bg-surface p-7 text-center shadow-(--shadow-card) sm:p-10">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-100 text-brand-700">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h1 className="mt-4 font-display text-2xl leading-tight text-ink sm:text-3xl">This record is already acknowledged</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-2">Both people have acknowledged it. Open the record to view, copy or print the copy you keep.</p>
          <Button className="mt-6" onClick={() => navigate(routes.record(capture.id))}>
            Open the record
          </Button>
        </div>
      </div>
    );
  }

  const initiator = capture.parties[0]?.name?.trim() || capture.initiator || "the other person";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const success = acknowledge(capture.id, entered);

    if (!success) {
      setError("That code does not match this record. Check it and try again.");
      return;
    }

    navigate(routes.record(capture.id));
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
      <div className="max-w-2xl">
        <p className="text-[10.5px] font-semibold tracking-[0.16em] text-brand-700 uppercase">Acknowledgment</p>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-[2.5rem]">Review before you acknowledge</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">{initiator} recorded this agreement. Read it, confirm the code, and acknowledge it so both of you hold the same copy.</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
        <div className="space-y-5">
          <RecordSummary capture={capture} template={template} />
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-(--shadow-card)">
            <h2 className="text-sm font-semibold text-ink">Parties</h2>
            <div className="mt-3">
              <PartyList capture={capture} />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-surface p-5 shadow-(--shadow-pop) lg:sticky lg:top-24">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-100 text-accent-800">
              <ShieldCheck className="h-4.5 w-4.5" />
            </span>
            <h2 className="text-base font-semibold text-ink">Confirm the code</h2>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-ink-2">Enter the six-character code the initiator shared with you. It matches the record on this page.</p>

          <label htmlFor="ack-code" className="mt-4 block text-sm font-medium text-ink">
            Acknowledgment code
          </label>
          <input
            id="ack-code"
            name="code"
            value={entered}
            onChange={(event) => {
              setEntered(event.target.value.toUpperCase());
              setError(null);
            }}
            className="mt-1.5 h-12 w-full rounded-xl border border-line-strong bg-surface px-4 text-center font-mono text-base tracking-[0.25em] uppercase shadow-sm transition placeholder:tracking-normal placeholder:text-ink-3 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 focus:outline-none"
            placeholder="ABC123"
            autoComplete="one-time-code"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "ack-code-error" : undefined}
          />
          {error && (
            <p id="ack-code-error" className="mt-2 text-sm text-accent-700">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="mt-4 w-full">
            <Check className="h-4 w-4" />
            Acknowledge this record
          </Button>

          <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-ink-3">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Both people get the same timestamped copy. The record is fixed once acknowledged.
          </p>
        </form>
      </div>
    </div>
  );
}
