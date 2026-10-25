import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock, Copy, RefreshCw, Users } from "lucide-react";
import { navigate, routes } from "@/lib/router";
import { useShareUrl } from "@/lib/useShareUrl";
import { useTruthStore } from "@/store/useTruthStore";
import { Button } from "@/components/ui/Button";
import { RecordSummary } from "@/components/RecordSummary";
import { PartyList } from "@/components/PartyList";
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
  const shareUrl = useShareUrl(capture);
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

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-(--shadow-card) sm:p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-800">
            <Clock className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10.5px] font-semibold tracking-[0.16em] text-accent-800 uppercase">Waiting for acknowledgment</p>
            <h2 className="mt-1 font-display text-2xl leading-tight text-ink sm:text-[1.9rem]">Send {otherParty} the code</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-2">The record stays open until {otherParty} reads it and acknowledges. They see exactly what you wrote — nothing more, nothing hidden.</p>
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
          <p className="text-sm font-semibold text-ink">Share link</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-surface px-3 py-2 font-mono text-xs text-ink-2 ring-1 ring-line">{shareUrl ?? "Preparing the link…"}</code>
            <Button variant="quiet" size="sm" className="shrink-0" disabled={!shareUrl} onClick={() => shareUrl && copy(shareUrl, "link")}>
              {copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === "link" ? "Copied" : "Copy link"}
            </Button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-3">The link carries the record itself, so it opens on any device — even if {otherParty} has never visited TruthCap.</p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={() => navigate(routes.acknowledge(code))}>
            Open acknowledgment page
            <ArrowRight className="h-4 w-4" />
          </Button>
          {onBack && (
            <Button variant="secondary" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
              Back to details
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              discardDraft();
              navigate(routes.create());
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Start over
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5 shadow-(--shadow-card)">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Users className="h-4 w-4 text-brand-600" />
          Parties
        </h3>
        <div className="mt-3">
          <PartyList capture={capture} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold tracking-[0.14em] text-ink-3 uppercase">What you recorded</h3>
        <div className="mt-3">
          <RecordSummary capture={capture} template={template} />
        </div>
      </div>
    </div>
  );
}
