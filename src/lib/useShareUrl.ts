import { useEffect, useState } from "react";
import { shareUrlFor } from "@/lib/records";
import type { TruthCapture } from "@/types/truth";

/** Builds the share link asynchronously because the payload is compressed. */
export function useShareUrl(capture: TruthCapture): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    shareUrlFor(capture)
      .then((value) => {
        if (active) setUrl(value);
      })
      .catch(() => {
        if (active) setUrl(null);
      });

    return () => {
      active = false;
    };
  }, [capture]);

  return url;
}
