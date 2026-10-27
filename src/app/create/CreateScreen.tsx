"use client";

import { TruthCreateStep } from "@/components/TruthCreateStep";
import { useTruthStore } from "@/store/useTruthStore";

/**
 * The create screen decides on entry whether to resume a draft or start fresh,
 * so it has to mount after this device's records have loaded. Hydration happens
 * in a layout effect, which means this placeholder is replaced before paint.
 */
export function CreateScreen() {
  const hydrated = useTruthStore((state) => state.hydrated);

  if (!hydrated) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-8 text-center shadow-(--shadow-card)" aria-busy="true">
        <p className="text-sm text-ink-2">Opening your workspace…</p>
      </div>
    );
  }

  return <TruthCreateStep />;
}
