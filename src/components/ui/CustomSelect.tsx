import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  label: string;
  value: string;
}

interface CustomSelectProps {
  id?: string;
  value: string;
  options?: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  allowCustom?: boolean;
}

export function CustomSelect({ id, value, options = [], onChange, placeholder = "Select an option", disabled, invalid, describedBy, allowCustom = true }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const selected = options.find((option) => option.value === value);
  const display = selected?.label ?? value;
  const typed = query.trim();
  const term = typed.toLowerCase();
  const filtered = term ? options.filter((option) => option.label.toLowerCase().includes(term) || option.value.toLowerCase().includes(term)) : options;
  const canUseTyped = allowCustom && typed.length > 0 && !options.some((option) => option.label.toLowerCase() === term || option.value.toLowerCase() === term);

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery("");
  };

  const toggle = () => {
    if (!open) setQuery("");
    setOpen(!open);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button id={id} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-describedby={describedBy} aria-invalid={invalid || undefined} disabled={disabled} onClick={toggle} className={cn("flex w-full items-center justify-between gap-3 rounded-sm border border-line-strong bg-surface px-4 py-3 text-left text-[15px] shadow-sm transition", disabled && "cursor-not-allowed opacity-50", invalid ? "border-accent-500" : "hover:border-brand-300", open && "border-brand-500")}>
        <span className={cn("truncate", display ? "text-ink" : "text-ink-3")}>{display || placeholder}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-3 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-md border border-line bg-surface shadow-(--shadow-pop)">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canUseTyped) {
                  event.preventDefault();
                  choose(typed);
                }
              }}
              placeholder="Search or type your own…"
              aria-label="Search options"
              className="w-full bg-transparent py-1 px-1.5 text-sm text-ink placeholder:text-ink-3 border-none focus:border-none focus:ring-0 ring-0 outline-none focus:outline-none"
            />
          </div>

          <div role="listbox" aria-label="Options" className="max-h-56 overflow-y-auto p-1">
            {filtered.map((option) => {
              const active = option.value === value;
              return (
                <button key={option.value} type="button" role="option" aria-selected={active} onClick={() => choose(option.value)} className={cn("flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 my-0.5 text-left text-sm transition hover:bg-surface-2", active ? "bg-brand-50 font-medium text-brand-900" : "text-ink-2")}>
                  <span className="truncate">{option.label}</span>
                  {active && <Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />}
                </button>
              );
            })}

            {filtered.length === 0 && !canUseTyped && <p className="px-3 py-2 text-sm text-ink-3">No matches.</p>}

            {canUseTyped && (
              <button type="button" role="option" aria-selected={false} onClick={() => choose(typed)} className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-brand-700 transition hover:bg-brand-50">
                <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">Use “{typed}”</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
