import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, Copy, RefreshCw } from "lucide-react";
import { navigate, routes } from "@/lib/router";
import { useShareUrl } from "@/lib/useShareUrl";
import { useTruthStore } from "@/store/useTruthStore";
import { Button } from "@/components/ui/Button";
import { RecordSummary } from "@/components/RecordSummary";
// PartyList no longer used directly in this component
import { ShareQr } from "@/components/ShareQr";
import type { TruthCapture, TruthTemplate } from "@/types/truth";

interface TruthPendingCardProps {
  capture: TruthCapture;
  template: TruthTemplate;
  onBack?: () => void;
}

export function TruthPendingCard({ capture, template, onBack }: TruthPendingCardProps) {
  const discardDraft = useTruthStore((state) => state.discardDraft);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const code = capture.accessCode ?? "";
  const share = useShareUrl(capture);
  const shareUrl = share.url;
  const otherParty = capture.parties[1]?.name?.trim() || "the other person";
  const copy = (value: string, kind: "code" | "link") => {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(kind);
        window.setTimeout(() => setCopied(null), 2000);
      })
      .catch(() => {});
  };

  // Check if this record was already acknowledged
  const isAlreadyAcknowledged = capture.status === "acknowledged";

  return (
    <div className="space-y-5">
      {/* Show acknowledgment status if already done */}
      {isAlreadyAcknowledged && (
        <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-6 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-brand-700 mb-4">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <h3 className="text-xl font-semibold text-brand-800">Acknowledged by both</h3>
          <p className="text-brand-700 text-sm">
            Both people have acknowledged this record. You can view, copy, or print your copy anytime.
          </p>
          <div className="mt-4">
            <Button onClick={() => navigate(routes.record(capture.id))} size="lg">
              Open the record
            </Button>
          </div>
        </div>
      )}

      {!isAlreadyAcknowledged && (
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-(--shadow-card) sm:p-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-800">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10.5px] font-semibold tracking-[0.16em] text-accent-800 uppercase">Waiting for acknowledgment</p>
              <h2 className="mt-1 font-display text-2xl leading-tight text-ink sm:text-[1.9rem]">
                Send {otherParty} the code
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-2">
                The record stays open until {otherParty} reads it and acknowledges. They see exactly what you wrote — nothing more, nothing hidden.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-accent-200 bg-accent-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10.5px] font-semibold tracking-[0.14em] text-accent-800 uppercase">Acknowledgment code</p>
                <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.22em] text-accent-900">{code}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => copy(code, "code")}>
                {copied === "code" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied === "code" ? "Copied" : "Copy code"}
              </Button>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-line bg-surface-2/60 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Share link</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-surface px-3 py-2 font-mono text-xs text-ink-2 ring-1 ring-line">
                    {shareUrl ?? "Preparing the link…"}
                  </code>
                  <Button variant="quiet" size="sm" className="shrink-0" disabled={!shareUrl} onClick={() => shareUrl && copy(shareUrl, "link")}>
                    {copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied === "link" ? "Copied" : "Copy link"}
                  </Button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink-3">
                  {share.viaServer ? (
                    "This short link opens on any device and stays available for 90 days — " +
                      otherParty +
                      " needs no account. It is kept on TruthCap's storage until then, so anyone with the link can read it."
                  ) : (
                    "The record travels inside the link itself, so it opens on any device — even if " +
                      otherParty +
                      " has never visited TruthCap. Nothing is stored on a server."
                  )}
                </p>
              </div>

              <ShareQr value={shareUrl} size={120} caption={`Let ${otherParty} scan this`} className="self-center sm:self-start" />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {/* Direct acknowledge CTA if we have an access code */}
            {code && (
              <Button
                onClick={() => navigate(routes.acknowledge(code))}
                className="w-full sm:w-auto"
              >
                Acknowledge this record
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {/* Fallback: open acknowledgment page */}
            {(!code || isAlreadyAcknowledged) && (
              <Button onClick={() => navigate(routes.acknowledge(code))}>
                Open acknowledgment page
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {onBack && (
              <Button variant="secondary" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" /> Back to details
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={() => {
                discardDraft();
                navigate(routes.create());
              }}
            >
              <RefreshCw className="h-4 w-4" /> Start over
            </Button>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold tracking-[0.14em] text-ink-3 uppercase">What you recorded</h3>
        <div className="mt-3">
          <RecordSummary capture={capture} template={template} />
        </div>
      </div>
    </div>
  );
}