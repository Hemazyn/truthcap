import { useEffect, useState } from "react";
import { shareLinkFor, type ShareLink } from "@/lib/records";
import type { TruthCapture } from "@/types/truth";

/**
 * Builds the share link asynchronously — the payload is compressed and usually
 * stored behind a short id — and reports whether it lives on the server, so the
 * copy around it can be honest about where the record is.
 */
export function useShareUrl(capture: TruthCapture): { url: string | null; viaServer: boolean } {
  const [resolved, setResolved] = useState<{ capture: TruthCapture; link: ShareLink } | null>(null);

  useEffect(() => {
    let active = true;

    shareLinkFor(capture)
      .then((link) => {
        if (active) setResolved({ capture, link });
      })
      .catch(() => {
        if (active) setResolved({ capture, link: { url: "", viaServer: false } });
      });

    return () => {
      active = false;
    };
  }, [capture]);

  const link = resolved?.capture === capture ? resolved.link : null;

  return { url: link?.url || null, viaServer: link?.viaServer ?? false };
}
