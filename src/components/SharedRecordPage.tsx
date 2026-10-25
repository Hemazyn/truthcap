import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Link2, Printer, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/validate";
import { canDecodeCompressedLinks, decodeRecord } from "@/lib/share";
import { templateFor } from "@/lib/records";
import { printRecord } from "@/lib/print";
import { navigate, routes } from "@/lib/router";
import { useTruthStore } from "@/store/useTruthStore";
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

export function SharedRecordPage({ data, source = "link" }: SharedRecordPageProps) {
  const importRecord = useTruthStore((state) => state.importRecord);
  const acknowledge = useTruthStore((state) => state.acknowledge);
  const [justAcknowledged, setJustAcknowledged] = useState(false);
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

  const isAcknowledged = justAcknowledged || capture.status === "acknowledged";
  const canAcknowledge = capture.status === "pending" && Boolean(capture.accessCode) && !isAcknowledged;

  const handleAcknowledge = () => {
    importRecord(capture);
    if (acknowledge(capture.id, capture.accessCode ?? "")) {
      setJustAcknowledged(true);
    }
  };

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
              <h1 className="mt-1 font-display text-2xl leading-tight text-ink sm:text-[1.9rem]">{capture.title}</h1>
              <p className="mt-1 text-sm text-ink-2">
                Created {formatDate(capture.createdAt)} · {capture.initiator || "The initiator"}
              </p>
            </div>
          </div>

          {isAcknowledged ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Acknowledged by both
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
              <RecordSummary capture={capture} template={template} showMeta={false} framed={false} />
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold tracking-[0.14em] text-ink-3 uppercase">Parties</h2>
            <div className="mt-3">
              <PartyList capture={capture} />
            </div>

            {isAcknowledged && <p className="mt-4 rounded-xl bg-brand-50 px-3 py-2.5 text-xs leading-relaxed text-brand-800 ring-1 ring-brand-100">{capture.acknowledgment?.when ? `Timestamped ${formatDate(capture.acknowledgment.when)} — both sides hold the same copy.` : "Both sides hold the same copy."}</p>}
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

          <Button variant="secondary" onClick={() => printRecord(capture)}>
            <Printer className="h-4 w-4" />
            Print / save PDF
          </Button>

          <p className="w-full text-xs leading-relaxed text-ink-3 sm:ml-auto sm:w-auto sm:max-w-xs sm:text-right">{canAcknowledge ? "Acknowledging timestamps this copy on your device. The initiator's copy stays as it is until records sync between accounts." : "Nothing here is editable. Whatever you read is exactly what was sent."}</p>
        </div>
      </div>
    </div>
  );
}
