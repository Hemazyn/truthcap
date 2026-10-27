"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/validate";
import { routes } from "@/lib/router";
import { acknowledgedPartyCount, findRecordByCode, outstandingPartyLabels, templateFor } from "@/lib/records";
import { INITIATOR_PARTY, useTruthStore } from "@/store/useTruthStore";
import { Button } from "@/components/ui/Button";
import { RecordNotFound } from "@/components/RecordNotFound";
import { RecordSummary } from "@/components/RecordSummary";
import { PartyList } from "@/components/PartyList";

export function TruthAcknowledgePage({ code }: { code: string }) {
  const router = useRouter();
  const records = useTruthStore((state) => state.records);
  const acknowledge = useTruthStore((state) => state.acknowledge);

  const capture = findRecordByCode(records, code);
  const template = templateFor(capture);

  // Pre-fill the code from the URL parameter
  const [entered, setEntered] = useState(() => code?.toUpperCase() ?? "");
  const [error, setError] = useState<string | null>(null);

  if (!capture || !template) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <RecordNotFound title="We can't find that record" description="This code does not match any record kept in this browser. Ask the person who sent it to share the link and the code again." detail={code} />
      </div>
    );
  }

  const initiator = capture.parties[INITIATOR_PARTY]?.name?.trim() || capture.initiator || "the other person";
  const accountAcknowledged = capture.parties[INITIATOR_PARTY]?.acknowledged ?? null;
  const outstanding = outstandingPartyLabels(capture);
  const everyoneAcknowledged = acknowledgedPartyCount(capture) === capture.parties.length;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const value = entered.trim().toUpperCase();

    if (value.length !== 6) {
      setError("Please enter a 6-character code");
      return;
    }

    // This device is the initiator's copy, so this confirmation is theirs.
    if (!acknowledge(capture.id, value, "initiator")) {
      setError("That code does not match this record. Check it and try again.");
      return;
    }

    router.push(routes.record(capture.id));
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
      <div className="max-w-2xl">
        <p className="text-[10.5px] font-semibold tracking-[0.16em] text-brand-700 uppercase">Acknowledgment</p>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-[2.5rem]">Review before you acknowledge</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          {initiator} recorded this agreement. Read it, confirm the code, and acknowledge it so both of you hold the same copy.
        </p>
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

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-(--shadow-pop) lg:sticky lg:top-24">
          {accountAcknowledged ? (
            <>
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-100 text-brand-800">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                </span>
                <h2 className="text-base font-semibold text-ink">You have acknowledged this record</h2>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-ink-2">
                Acknowledged {formatDate(accountAcknowledged)}. {everyoneAcknowledged ? "Both sides hold the same copy." : outstanding.length === 1 ? `${outstanding[0]}'s acknowledgment is the last one left.` : `${outstanding.join(" and ")} still have to acknowledge.`}
              </p>

              <Button size="lg" className="mt-4 w-full" onClick={() => router.push(routes.record(capture.id))}>
                Open the record
              </Button>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-100 text-accent-800">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </span>
                <h2 className="text-base font-semibold text-ink">Confirm the code</h2>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-ink-2">Enter the six-character code the initiator shared with you. It matches the record on this page.</p>
              {error && (
                <p id="ack-code-error" className="mt-2 text-sm text-accent-700">
                  {error}
                </p>
              )}

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

              <Button type="submit" size="lg" className="mt-4 w-full" disabled={entered.length !== 6}>
                <Check className="h-4 w-4" />
                {entered.length === 6 ? "Acknowledge this record" : "Enter 6-char code"}
              </Button>

              <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-ink-3">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Both people get the same timestamped copy. The record is fixed once acknowledged.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
