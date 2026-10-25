import { Check } from "lucide-react";
import { formatDate } from "@/lib/validate";
import type { TruthCapture } from "@/types/truth";

export function PartyList({ capture }: { capture: TruthCapture }) {
  return (
    <ul className="space-y-2.5">
      {capture.parties.map((party, index) => (
        <li key={`${party.role}-${index}`} className="rounded-xl border border-line bg-surface-2/50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">{party.name?.trim() || party.role}</p>
            {party.acknowledged ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-[10px] font-semibold text-brand-800">
                <Check className="h-3 w-3" strokeWidth={3} />
                Acknowledged
              </span>
            ) : (
              <span className="rounded-full bg-accent-50 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-accent-800 uppercase">Pending</span>
            )}
          </div>

          {party.name?.trim() && <p className="text-xs text-ink-3">{party.role}</p>}
          {party.contact && <p className="mt-1 text-xs text-ink-2">{party.contact}</p>}
          {party.acknowledged && <p className="mt-0.5 text-xs text-ink-3">{formatDate(party.acknowledged)}</p>}
        </li>
      ))}
    </ul>
  );
}
