import { useState } from "react";
import { ArrowRight, ChevronDown, FileText, KeyRound, Package, Wallet, Wrench } from "lucide-react";
import { TEMPLATES } from "@/data/templates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const TEMPLATE_ICONS: Record<string, typeof Package> = {
  "item-condition-agreement": Package,
  "work-delivered-accepted": FileText,
  "repair-agreed": Wrench,
  "payment-schedule-agreed": Wallet,
  "handover-acknowledged": KeyRound,
};

export function TruthTemplatePicker({ onSelect }: { onSelect: (id: string) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <fieldset>
      <legend className="sr-only">What are you capturing?</legend>

      <h2 className="font-display text-2xl leading-tight text-ink sm:text-[1.9rem]">What are you capturing?</h2>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-2">Pick the closest real-life moment. You can change details later — the point is to start with a form that already matches the situation.</p>

      <div className="mt-6 space-y-2.5">
        {TEMPLATES.map((template) => {
          const Icon = TEMPLATE_ICONS[template.id] ?? FileText;
          const isOpen = expanded === template.id;

          return (
            <div key={template.id} className={cn("overflow-hidden rounded-2xl border bg-surface shadow-(--shadow-card) transition", isOpen ? "border-brand-300 ring-1 ring-brand-200" : "border-line hover:border-brand-200")}>
              <button type="button" className="flex w-full items-center gap-3.5 p-4 text-left" onClick={() => setExpanded(isOpen ? null : template.id)} aria-expanded={isOpen}>
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 transition", isOpen ? "bg-brand-600 text-white ring-brand-600" : "bg-brand-50 text-brand-700 ring-brand-100")}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink">{template.title}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-ink-2">{template.subtitle}</span>
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-3 transition-transform duration-200", isOpen && "rotate-180 text-brand-700")} />
              </button>

              {isOpen && (
                <div className="border-t border-line bg-surface-2/60 px-4 py-4">
                  <p className="text-sm leading-relaxed text-ink-2">{template.purpose}</p>
                  <Button className="mt-4 w-full sm:w-auto" onClick={() => onSelect(template.id)}>
                    Start this record
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
