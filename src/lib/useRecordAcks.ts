import { useEffect } from "react";
import { fetchAcks } from "@/lib/acks";
import { acknowledgedPartyCount } from "@/lib/records";
import { useTruthStore } from "@/store/useTruthStore";

const POLL_MS = 10_000;

interface UseRecordAcksOptions {
  /** Keep re-checking while the page stays open, so the other side's confirmation arrives on its own. */
  poll?: boolean;
  /** Held back while a shared copy is still locked behind its code. */
  enabled?: boolean;
}

/**
 * Keeps one record's acknowledgment state in step with the other device: pulls
 * when the record opens, and — when asked — quietly re-checks every ten seconds
 * so the other person's confirmation shows up without a reload. It stops asking
 * as soon as everyone has confirmed, skips hidden tabs, and only ever reads for
 * a record this device holds, so it cannot spend the store's quota on records
 * that are not on screen.
 */
export function useRecordAcks(recordId: string | null, { poll = false, enabled = true }: UseRecordAcksOptions = {}): void {
  useEffect(() => {
    if (!recordId || !enabled) return;

    let cancelled = false;

    const pull = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

      const current = useTruthStore.getState().records.find((candidate) => candidate.id === recordId);
      if (!current) return;
      if (acknowledgedPartyCount(current) >= current.parties.length) return;

      const acks = await fetchAcks(recordId);
      if (cancelled || !acks) return;

      useTruthStore.getState().applyAcks(recordId, acks);
    };

    void pull();

    // Coming back to the tab should not wait for the next tick.
    const onVisible = () => {
      if (document.visibilityState === "visible") void pull();
    };
    document.addEventListener("visibilitychange", onVisible);

    const timer = poll ? window.setInterval(() => void pull(), POLL_MS) : 0;

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (timer) window.clearInterval(timer);
    };
  }, [recordId, poll, enabled]);
}
