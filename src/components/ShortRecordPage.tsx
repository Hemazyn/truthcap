import { useEffect, useState } from "react";
import { fetchSharedPayload } from "@/lib/shortlink";
import { RecordNotFound } from "@/components/RecordNotFound";
import { SharedRecordPage } from "@/components/SharedRecordPage";

/**
 * A short link (`/s/AbCd2345`) resolves to the stored payload first, then hands
 * off to the shared-copy screen so both kinds of link render the same record.
 */
export function ShortRecordPage({ id }: { id: string }) {
  const [resolved, setResolved] = useState<{ id: string; payload: string | null } | null>(null);

  useEffect(() => {
    let active = true;

    fetchSharedPayload(id).then((payload) => {
      if (active) setResolved({ id, payload });
    });

    return () => {
      active = false;
    };
  }, [id]);

  // A new id resolves into a new result, so a stale payload never renders.
  const current = resolved?.id === id ? resolved : null;

  if (!current) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-12" aria-busy="true">
        <div className="rounded-3xl border border-line bg-surface p-8 text-center shadow-(--shadow-card)">
          <p className="text-sm text-ink-2">Opening the shared record…</p>
        </div>
      </div>
    );
  }

  if (!current.payload) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <RecordNotFound title="We can't find that record" description="Short links expire 90 days after they were created, and a link that was cut short will not open. Ask the other person to send it again." detail={id} />
      </div>
    );
  }

  return <SharedRecordPage data={current.payload} source="server" />;
}
