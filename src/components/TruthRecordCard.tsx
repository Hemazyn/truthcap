import { useState } from "react";
import { Check, CheckCircle2, Copy, Link2, Printer } from "lucide-react";
import { formatDate, formatFieldValue } from "@/lib/validate";
import { useShareUrl } from "@/lib/useShareUrl";
import { printRecord } from "@/lib/print";
import { Button } from "@/components/ui/Button";
import { RecordSummary } from "@/components/RecordSummary";
import { PartyList } from "@/components/PartyList";
import { ShareQr } from "@/components/ShareQr";
import type { TruthCapture, TruthTemplate } from "@/types/truth";

interface TruthRecordCardProps {
  capture: TruthCapture;
  template: TruthTemplate;
}

export function TruthRecordCard({ capture, template }: TruthRecordCardProps) {
  const [copied, setCopied] = useState<"summary" | "link" | null>(null);

  const { url: shareUrl } = useShareUrl(capture);
  const acknowledgedAt = capture.acknowledgment?.when ?? null;
  const currency = typeof capture.values.currency === "string" ? capture.values.currency : "NGN";

  const copySummary = () => {
    const rows = template.fields.map((field) => `${field.label}: ${formatFieldValue(field, capture.values[field.key] ?? null, "—", currency)}`);

    const parties = capture.parties.map((party) => {
      const label = party.name?.trim() || party.role;
      return party.acknowledged ? `${label} (${party.role}, acknowledged ${formatDate(party.acknowledged)})` : `${label} (${party.role})`;
    });

    const summary = [capture.title, `Record ${capture.id}`, `Created ${formatDate(capture.createdAt)}`, `Initiated by ${capture.initiator || "The initiator"}`, "", ...rows, "", `Parties: ${parties.join(" · ")}`, acknowledgedAt ? `Acknowledged ${formatDate(acknowledgedAt)}` : ""].join("\n").trim();

    navigator.clipboard
      .writeText(summary)
      .then(() => {
        setCopied("summary");
        window.setTimeout(() => setCopied(null), 2000);
      })
      .catch(() => {});
  };

  const copyLink = () => {
    if (!shareUrl) return;

    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setCopied("link");
        window.setTimeout(() => setCopied(null), 2000);
      })
      .catch(() => {});
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-(--shadow-pop)">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-surface-2/50 px-5 py-5 sm:px-7">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-(--shadow-cta)">
            <Check className="h-5 w-5" strokeWidth={3} />
          </span>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.16em] text-ink-3 uppercase">Record {capture.id}</p>
            <h1 className="mt-1 font-display text-2xl leading-tight text-ink sm:text-[1.9rem]">{capture.title}</h1>
            <p className="mt-1 text-sm text-ink-2">
              Created {formatDate(capture.createdAt)} · {capture.initiator || "The initiator"}
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-800">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Acknowledged by both
        </span>
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

          {acknowledgedAt && <p className="mt-4 rounded-xl bg-brand-50 px-3 py-2.5 text-xs leading-relaxed text-brand-800 ring-1 ring-brand-100">Timestamped {formatDate(acknowledgedAt)} — both sides hold the same copy.</p>}

          <div className="mt-4 rounded-xl border border-line bg-surface-2/50 p-3">
            <ShareQr value={shareUrl} size={120} caption="Scan to open this record on a phone" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4 sm:px-7 print:hidden">
        <Button onClick={copySummary} size="sm">
          {copied === "summary" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied === "summary" ? "Copied summary" : "Copy summary"}
        </Button>
        <Button variant="secondary" size="sm" onClick={copyLink} disabled={!shareUrl}>
          {copied === "link" ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          {copied === "link" ? "Link copied" : "Copy share link"}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => printRecord(capture)}>
          <Printer className="h-4 w-4" />
          Print / save PDF
        </Button>
        <p className="text-xs text-ink-3 sm:ml-auto print:hidden">This copy belongs to both people. Export or print it whenever you need it.</p>
      </div>
    </div>
  );
}
