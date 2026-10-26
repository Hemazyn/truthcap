import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ClipboardList, FileText, Plus, Search } from "lucide-react";
import { formatDate } from "@/lib/validate";
import { fetchAcks } from "@/lib/acks";
import { acknowledgedPartyCount, outstandingPartyLabels, partyLabel } from "@/lib/records";
import { navigate, routes } from "@/lib/router";
import { useTruthStore } from "@/store/useTruthStore";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { TruthCapture, TruthStatus } from "@/types/truth";

const STATUS_STYLES: Record<TruthStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-surface-2 text-ink-2 ring-line" },
  pending: { label: "Waiting", className: "bg-accent-50 text-accent-800 ring-accent-200" },
  acknowledged: { label: "Acknowledged", className: "bg-brand-100 text-brand-800 ring-brand-200" },
  expired: { label: "Expired", className: "bg-surface-2 text-ink-3 ring-line" },
  revoked: { label: "Revoked", className: "bg-surface-2 text-ink-3 ring-line" },
};

type Filter = "all" | "acknowledged" | "pending" | "draft";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "acknowledged", label: "Acknowledged" },
  { id: "pending", label: "Waiting" },
  { id: "draft", label: "Drafts" },
];

function matchesQuery(capture: TruthCapture, query: string): boolean {
  if (!query) return true;
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  const parties = capture.parties.map((party) => `${party.name ?? ""} ${party.role}`).join(" ");
  return `${capture.title} ${capture.id} ${parties}`.toLowerCase().includes(needle);
}

export function RecordsPage() {
  const records = useTruthStore((state) => state.records);
  const openRecord = useTruthStore((state) => state.openRecord);
  const applyAcks = useTruthStore((state) => state.applyAcks);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // A row should not read "Waiting for Bola" after Bola has already confirmed,
  // so the records still waiting on someone refresh once each time this opens.
  useEffect(() => {
    const pending = records.filter((record) => record.status === "pending" && acknowledgedPartyCount(record) < record.parties.length);

    void Promise.all(
      pending.map(async (record) => {
        const acks = await fetchAcks(record.id);
        if (acks) applyAcks(record.id, acks);
      }),
    );
  }, [records, applyAcks]);

  const sorted = useMemo(() => [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [records]);

  const visible = sorted.filter((capture) => {
    if (filter !== "all" && capture.status !== filter) return false;
    return matchesQuery(capture, query);
  });

  const acknowledgedCount = records.filter((record) => record.status === "acknowledged").length;

  const open = (capture: TruthCapture) => {
    openRecord(capture.id);
    navigate(capture.status === "draft" ? routes.create() : routes.record(capture.id));
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-semibold tracking-[0.16em] text-brand-700 uppercase">Your copies</p>
          <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-[2.5rem]">Records on this device</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-2">{records.length === 0 ? "Records you write or open from a share link are kept in this browser." : `${records.length} record${records.length === 1 ? "" : "s"} saved here, ${acknowledgedCount} acknowledged by both people.`}</p>
        </div>

        <Button onClick={() => navigate(routes.create())}>
          <Plus className="h-4 w-4" />
          New record
        </Button>
      </div>

      {records.length > 0 && (
        <div className="mt-7 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, person or record ID" aria-label="Search records" className="h-11 w-full rounded-xl border border-line-strong bg-surface pr-4 pl-10 text-sm text-ink shadow-sm transition placeholder:text-ink-3 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 focus:outline-none" />
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((option) => (
              <button key={option.id} type="button" onClick={() => setFilter(option.id)} aria-pressed={filter === option.id} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition", filter === option.id ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-surface text-ink-2 hover:border-brand-300 hover:text-ink")}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">{records.length === 0 ? <ClipboardList className="h-5 w-5" /> : <Search className="h-5 w-5" />}</span>
          <h2 className="mt-4 text-base font-semibold text-ink">{records.length === 0 ? "No records yet" : "Nothing matches that"}</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-2">{records.length === 0 ? "Start with a template, write the details plainly, and share the link with the other person." : "Try a different word, or clear the filter to see everything saved here."}</p>
          <Button className="mt-5" onClick={() => (records.length === 0 ? navigate(routes.create()) : (setQuery(""), setFilter("all")))}>
            {records.length === 0 ? (
              <>
                <Plus className="h-4 w-4" />
                Create a record
              </>
            ) : (
              "Clear search"
            )}
          </Button>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {visible.map((capture) => {
            const outstanding = outstandingPartyLabels(capture);
            // A record someone has already confirmed is waiting on a named person, not on nobody.
            const status = capture.status === "pending" && outstanding.length > 0 && acknowledgedPartyCount(capture) > 0 ? { label: `Waiting for ${outstanding[0]}`, className: STATUS_STYLES.pending.className } : STATUS_STYLES[capture.status];
            const parties = capture.parties.map((_, index) => partyLabel(capture, index)).filter(Boolean);

            return (
              <li key={capture.id}>
                <button type="button" onClick={() => open(capture)} className="group flex w-full flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-4 text-left shadow-(--shadow-card) transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-(--shadow-pop) sm:px-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">{capture.status === "acknowledged" ? <Check className="h-4.5 w-4.5" strokeWidth={3} /> : <FileText className="h-4.5 w-4.5" />}</span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold text-ink">{capture.title}</span>
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ring-1", status.className)}>{status.label}</span>
                    </span>
                    <span className="mt-1 block truncate text-sm text-ink-2">{parties.join(" · ") || "No parties named yet"}</span>
                    <span className="mt-1 block font-mono text-[11px] text-ink-3">
                      {capture.id} · {formatDate(capture.createdAt)}
                    </span>
                  </span>

                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                    {capture.status === "draft" ? "Continue" : "Open"}
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
