"use client";

import { useEffect, useState } from "react";
import { SharedRecordPage } from "@/components/SharedRecordPage";

/**
 * `/shared#…` keeps the record in the fragment, which never reaches the server —
 * so the payload can only be read in the browser, after mount.
 */
export function SharedLinkScreen() {
  const [data, setData] = useState<string | null>(null);

  useEffect(() => {
    const read = () => setData(window.location.hash.replace(/^#/, ""));

    read();
    window.addEventListener("hashchange", read);

    return () => window.removeEventListener("hashchange", read);
  }, []);

  if (data === null) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-12" aria-busy="true">
        <div className="rounded-3xl border border-line bg-surface p-8 text-center shadow-(--shadow-card)">
          <p className="text-sm text-ink-2">Opening the shared record…</p>
        </div>
      </div>
    );
  }

  return <SharedRecordPage data={data} />;
}
