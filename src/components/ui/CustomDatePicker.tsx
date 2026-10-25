import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function toISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISO(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface CustomDatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

export function CustomDatePicker({ id, value, onChange, disabled, invalid, describedBy }: CustomDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseISO(value);
  const [viewMonth, setViewMonth] = useState(() => {
    const base = selected ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const wrapRef = useRef<HTMLDivElement>(null);

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

  const days = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    return Array.from({ length: 42 }, (_, index) => new Date(year, month, 1 - firstWeekday + index));
  }, [viewMonth]);

  const selectedISO = selected ? toISO(selected) : "";
  const todayISO = toISO(new Date());
  const monthLabel = viewMonth.toLocaleDateString("en-NG", { month: "long", year: "numeric" });

  const choose = (date: Date) => {
    onChange(toISO(date));
    setOpen(false);
  };

  const openCalendar = () => {
    const base = parseISO(value) ?? new Date();
    setViewMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    setOpen(true);
  };

  return (
    <div ref={wrapRef} className="relative">
      <input id={id} type="text" inputMode="numeric" placeholder="YYYY-MM-DD" value={value} onChange={(event) => onChange(event.target.value)} onFocus={openCalendar} disabled={disabled} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={cn("w-full rounded-sm border border-line-strong bg-surface px-4 py-3 pr-11 text-[15px] text-ink shadow-sm transition placeholder:text-ink-3 focus:border-brand-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50", invalid && "border-accent-500")} />
      <button type="button"        onClick={openCalendar} disabled={disabled} aria-label="Open calendar" aria-expanded={open} className="absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-ink-3 transition hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50">
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-72 rounded-xl border border-line bg-surface p-3 shadow-(--shadow-pop)">
          <div className="flex items-center justify-between gap-2">
            <button type="button" aria-label="Previous month" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} className="grid h-8 w-8 place-items-center rounded-md text-ink-2 transition hover:bg-surface-2 hover:text-ink">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold text-ink">{monthLabel}</p>
            <button type="button" aria-label="Next month" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} className="grid h-8 w-8 place-items-center rounded-md text-ink-2 transition hover:bg-surface-2 hover:text-ink">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold tracking-wide text-ink-3 uppercase">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((date) => {
              const iso = toISO(date);
              const outside = date.getMonth() !== viewMonth.getMonth();
              const isSelected = iso === selectedISO;
              const isToday = iso === todayISO;

              return (
                <button key={iso} type="button" onClick={() => choose(date)} aria-label={date.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })} aria-pressed={isSelected} className={cn("grid h-8 place-items-center rounded-md text-xs font-medium transition", outside ? "text-ink-3/50 hover:bg-surface-2" : "text-ink-2 hover:bg-surface-2", isToday && !isSelected && "ring-1 ring-brand-300", isSelected ? "bg-brand-600 text-white hover:bg-brand-700" : "")}>
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                choose(today);
              }}
              className="rounded-md px-2 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="rounded-md px-2 py-1 text-xs font-semibold text-ink-3 transition hover:bg-surface-2 hover:text-ink"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
