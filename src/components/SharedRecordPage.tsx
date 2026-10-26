import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, Clock, Link2, Lock, Printer, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/validate";
import { canDecodeCompressedLinks, decodeRecord } from "@/lib/share";
import { acknowledgedPartyCount, outstandingPartyLabels, templateFor } from "@/lib/records";
import { printRecord } from "@/lib/print";
import { navigate, routes } from "@/lib/router";
import { COUNTERPARTY_PARTY, INITIATOR_PARTY, useTruthStore } from "@/store/useTruthStore";
import { Button } from "@/components/ui/Button";
import { RecordNotFound } from "@/components/RecordNotFound";
import { RecordSummary } from "@/components/RecordSummary";
import { PartyList } from "@/components/PartyList";
import type { TruthCapture } from "@/types/truth";

interface SharedRecordPageProps {
  data: string;
  /** `server` means the payload came from a stored short link. */
  source?: "link" | "server";
}

const WRONG_CODE = "That code does not match this record. Check it and try again.";

export function SharedRecordPage({ data, source = "link" }: SharedRecordPageProps) {
  const records = useTruthStore((state) => state.records);
  const importRecord = useTruthStore((state) => state.importRecord);
  const acknowledge = useTruthStore((state) => state.acknowledge);
  const [enteredCode, setEnteredCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [unlockedPayload, setUnlockedPayload] = useState<string | null>(null);
  const [resolved, setResolved] = useState<{ data: string; capture: TruthCapture | null } | null>(null);

  useEffect(() => {
    let active = true;

    decodeRecord(data).then((capture) => {
      if (active) setResolved({ data, capture });
    });

    return () => {
      active = false;
    };
  }, [data]);

  // A new payload decodes into a new result, so the stale one never renders.
  const decoded = resolved?.data === data ? resolved : null;

  if (!decoded) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-12" aria-busy="true">
        <div className="rounded-3xl border border-line bg-surface p-8 text-center shadow-(--shadow-card)">
          <p className="text-sm text-ink-2">Opening the shared record…</p>
        </div>
      </div>
    );
  }

  if (!decoded.capture) {
    return <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">{canDecodeCompressedLinks() ? <RecordNotFound title="This link is incomplete" description="The share link looks damaged or was cut short when it was sent. Ask the other person to copy the whole link again." detail="shared copy" /> : <RecordNotFound title="This browser is too old for the link" description="Share links are compressed to keep them short, and this browser cannot unpack them. Update your browser to open the record." detail="shared copy" />}</div>;
  }

  const capture = decoded.capture;
  const template = templateFor(capture);

  if (!template) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <RecordNotFound title="Unknown record type" description="This link points at a template this version of TruthCap doesn't know about." detail={capture.templateId} />
      </div>
    );
  }

  // This browser may hold a fuller copy than the link (its own acknowledgment, or
  // one the initiator sent), so the store's copy wins when there is one.
  const current = records.find((record) => record.id === capture.id) ?? capture;

  const codeReady = enteredCode.trim().length === 6;
  const initiator = current.parties[INITIATOR_PARTY]?.name?.trim() || current.initiator || "The other person";
  const initiatorAcknowledged = current.parties[INITIATOR_PARTY]?.acknowledged ?? null;
  const youAcknowledged = Boolean(current.parties[COUNTERPARTY_PARTY]?.acknowledged);
  const outstanding = outstandingPartyLabels(current);
  const acknowledged = acknowledgedPartyCount(current);
  const everyoneAcknowledged = current.parties.length > 0 && acknowledged === current.parties.length;
  const canAcknowledge = current.status === "pending" && Boolean(current.accessCode) && !youAcknowledged;

  // The record stays hidden until the code is typed in, so a forwarded link or a
  // scanned QR code on its own opens nothing: the code travels separately.
  const locked = Boolean(current.accessCode) && current.status === "pending" && !youAcknowledged && unlockedPayload !== data;

  // The link only carries the record — the code arrives separately from the
  // initiator, so nothing here can be acknowledged without typing it in.
  const handleUnlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const entered = enteredCode.trim().toUpperCase();
    if (entered.length !== 6) return;

    if (!capture.accessCode || capture.accessCode.toUpperCase() !== entered) {
      setCodeError(WRONG_CODE);
      return;
    }

    setCodeError(null);
    setUnlockedPayload(data);
  };

  const handleAcknowledge = () => {
    // Whoever opened the shared copy is the other party, so this is their side.
    importRecord(capture);

    if (acknowledge(capture.id, enteredCode.trim().toUpperCase(), "other")) {
      setCodeError(null);
      return;
    }

    setCodeError(WRONG_CODE);
  };

  if (locked) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-line bg-surface shadow-(--shadow-pop)">
          <div className="flex items-start gap-3 border-b border-line bg-surface-2/50 px-5 py-5 sm:px-7">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-800">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-ink-3 uppercase">Record {capture.id}</p>
              <h1 className="mt-1 font-display text-2xl leading-tight text-ink sm:text-[1.9rem]">This agreement is locked</h1>
              <p className="mt-1 text-sm text-ink-2">{capture.title}</p>
            </div>
          </div>

          <form onSubmit={handleUnlock} className="px-5 py-6 sm:px-7">
            <p className="text-sm leading-relaxed text-ink-2">
              {initiator} sent you a copy of this record, and the code that opens it comes separately. Enter the six-character acknowledgment code they shared with you to read what you both agreed.
            </p>

            <label htmlFor="shared-ack-code" className="mt-5 block text-sm font-medium text-ink">
              Acknowledgment code
            </label>
            <input
              id="shared-ack-code"
              name="code"
              value={enteredCode}
              onChange={(event) => {
                setEnteredCode(event.target.value.toUpperCase());
                setCodeError(null);
              }}
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="ABC123"
              aria-invalid={Boolean(codeError)}
              aria-describedby={codeError ? "shared-ack-error" : "shared-lock-hint"}
              className="mt-1.5 h-12 w-full rounded-xl border border-line-strong bg-surface px-4 text-center font-mono text-base tracking-[0.25em] uppercase shadow-sm transition placeholder:tracking-normal placeholder:text-ink-3 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 focus:outline-none"
            />

            {codeError && (
              <p id="shared-ack-error" role="alert" className="mt-2 text-sm text-accent-700">
                {codeError}
              </p>
            )}

            <Button type="submit" size="lg" className="mt-4 w-full" disabled={!codeReady}>
              <ShieldCheck className="h-4 w-4" />
              {codeReady ? "Open this agreement" : "Enter 6-char code"}
            </Button>

            <p id="shared-lock-hint" className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-ink-3">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              The link and the QR code on their own never show the record. Ask {initiator} for the code if it did not arrive with the link.
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-12">
      <div className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/70 px-4 py-3.5 print:hidden">
        <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
        <p className="text-xs leading-relaxed font-medium text-brand-900">{source === "server" ? "This is a shared copy, opened from TruthCap's storage where it stays for 90 days. Anyone with the link can read it, so forward it the way you would the record itself. Print or save it if you want to keep it after that." : "This is a shared copy. The record travels inside the link itself — nothing is stored on a server, and nobody sees it unless you forward the link. Print or save it if you want to keep it after closing the tab."}</p>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-surface shadow-(--shadow-pop)">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-surface-2/50 px-5 py-5 sm:px-7">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-(--shadow-cta)">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-ink-3 uppercase">Record {capture.id}</p>
              <h1 className="mt-1 font-display text-2xl leading-tight text-ink sm:text-[1.9rem]">{current.title}</h1>
              <p className="mt-1 text-sm text-ink-2">
                Created {formatDate(current.createdAt)} · {current.initiator || "The initiator"}
              </p>
            </div>
          </div>

          {everyoneAcknowledged ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Acknowledged by both
            </span>
          ) : acknowledged > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-3 py-1.5 text-xs font-semibold text-accent-800">
              <Clock className="h-3.5 w-3.5" />
              Waiting for {outstanding.join(" and ")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-3 py-1.5 text-xs font-semibold text-accent-800">
              <Clock className="h-3.5 w-3.5" />
              Waiting for acknowledgment
            </span>
          )}
        </div>

        <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[1.4fr_0.6fr]">
          <div>
            <h2 className="text-xs font-semibold tracking-[0.14em] text-ink-3 uppercase">What both sides agreed on</h2>
            <div className="mt-3 overflow-hidden rounded-2xl border border-line">
              <RecordSummary capture={current} template={template} showMeta={false} framed={false} />
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold tracking-[0.14em] text-ink-3 uppercase">Parties</h2>
            <div className="mt-3">
              <PartyList capture={current} />
            </div>

            {everyoneAcknowledged && <p className="mt-4 rounded-xl bg-brand-50 px-3 py-2.5 text-xs leading-relaxed text-brand-800 ring-1 ring-brand-100">{current.acknowledgment?.when ? `Timestamped ${formatDate(current.acknowledgment.when)} — both sides hold the same copy.` : "Both sides hold the same copy."}</p>}

            {!everyoneAcknowledged && initiatorAcknowledged && !youAcknowledged && (
              <p className="mt-4 rounded-xl bg-brand-50 px-3 py-2.5 text-xs leading-relaxed text-brand-800 ring-1 ring-brand-100">
                {initiator} acknowledged this record on {formatDate(initiatorAcknowledged)}, so {outstanding.length === 1 ? "your acknowledgment is the last one left" : `${outstanding.join(" and ")} still have to acknowledge`}.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4 sm:px-7 print:hidden">
          {canAcknowledge ? (
            <Button onClick={handleAcknowledge}>
              <ShieldCheck className="h-4 w-4" />
              Acknowledge this copy
            </Button>
          ) : (
            <Button onClick={() => navigate(routes.records())} variant="secondary">
              All your records
            </Button>
          )}

          <Button variant="secondary" onClick={() => printRecord(current)}>
            <Printer className="h-4 w-4" />
            Print / save PDF
          </Button>

          {codeError && (
            <p id="shared-ack-error" role="alert" className="w-full text-sm text-accent-700">
              {codeError}
            </p>
          )}

          <p className="w-full text-xs leading-relaxed text-ink-3 sm:ml-auto sm:w-auto sm:max-w-xs sm:text-right">
            {canAcknowledge ? "You entered the code the initiator sent, so acknowledging timestamps this copy on your device. The initiator's copy stays as it is until records sync between accounts." : "Nothing here is editable. Whatever you read is exactly what was sent."}
          </p>
        </div>
      </div>
    </div>
  );
}
