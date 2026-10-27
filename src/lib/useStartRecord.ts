import { useRouter } from "next/navigation";
import { routes } from "@/lib/router";
import { useTruthStore } from "@/store/useTruthStore";

/**
 * Starts a record from anywhere in the app: pick a template (or resume), then
 * move to the create screen. The store keeps the draft, the router changes the
 * URL — each now does only its own job.
 */
export function useStartRecord(): (templateId?: string) => void {
  const router = useRouter();
  const records = useTruthStore((state) => state.records);
  const activeId = useTruthStore((state) => state.activeId);
  const startCapture = useTruthStore((state) => state.startCapture);
  const clearActive = useTruthStore((state) => state.clearActive);

  return (templateId?: string) => {
    if (templateId) {
      startCapture(templateId);
      router.push(routes.create());
      return;
    }

    const active = records.find((record) => record.id === activeId);
    if (active?.status === "acknowledged") clearActive();
    router.push(routes.create());
  };
}
