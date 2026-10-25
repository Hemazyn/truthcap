import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarClock, Check, CheckCircle2, Clock, FileText, Package, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/ui/LogoMark";

function ScreenPick() {
  const options = [
    { title: "Item condition agreed", sub: "Before it changes hands", icon: Package, active: true },
    { title: "Work delivered", sub: "Handover and acceptance", icon: FileText, active: false },
    {
      title: "Payment schedule",
      sub: "Who owes what, and when",
      icon: CalendarClock,
      active: false,
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[9px] font-semibold tracking-[0.18em] text-ink-3 uppercase">Step 1 of 3</p>
        <p className="mt-1 text-[15px] leading-snug font-semibold text-ink">What are you capturing?</p>
      </div>

      <div className="space-y-2">
        {options.map(({ title, sub, icon: Icon, active }) => (
          <div key={title} className={cn("flex items-center gap-2.5 rounded-xl border p-2.5", active ? "border-brand-300 bg-brand-50 ring-1 ring-brand-300/40" : "border-line bg-surface")}>
            <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg", active ? "bg-brand-600 text-white" : "bg-surface-2 text-ink-2")}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11.5px] leading-tight font-semibold text-ink">{title}</span>
              <span className="block text-[10px] text-ink-3">{sub}</span>
            </span>
            {active && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-brand-600" />}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-1.5 rounded-full bg-brand-600 py-2.5 text-[11px] font-semibold text-white">
        Continue <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

function ScreenFill() {
  const rows = [
    { label: "Item", value: "MacBook Pro 2019" },
    { label: "Condition", value: "Good, minor wear" },
    { label: "Agreed price", value: "₦420,000", strong: true },
    { label: "Date", value: "22 Oct 2026" },
  ];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[9px] font-semibold tracking-[0.18em] text-ink-3 uppercase">Step 2 of 3</p>
        <p className="mt-1 text-[15px] leading-snug font-semibold text-ink">Write it plainly</p>
      </div>

      <div className="divide-y divide-line rounded-xl border border-line bg-surface px-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-[10.5px] text-ink-3">{row.label}</span>
            <span className={cn("text-right text-[11.5px] font-medium", row.strong ? "text-brand-700" : "text-ink")}>{row.value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-line-strong p-2.5 text-[10px] leading-relaxed text-ink-3">Both people will see exactly this. No hidden notes, no side chat.</div>

      <div className="rounded-full bg-brand-600 py-2.5 text-center text-[11px] font-semibold text-white">Create the record</div>
    </div>
  );
}

function ScreenAcknowledged() {
  return (
    <div className="space-y-3">
      <p className="text-[9px] font-semibold tracking-[0.18em] text-ink-3 uppercase">Step 3 of 3</p>

      <div className="rounded-2xl border border-line bg-surface p-4 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-brand-100 text-brand-700">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <p className="mt-2 text-[13px] font-semibold text-ink">Both sides acknowledged</p>
        <p className="text-[10px] text-ink-3">22 Oct 2026 · 14:06</p>

        <div className="mt-3 space-y-1.5 rounded-lg bg-surface-2 p-2.5 text-left">
          <p className="flex items-center justify-between gap-2 text-[10px]">
            <span className="text-ink-3">Record</span>
            <span className="font-medium text-ink">Item condition agreed</span>
          </p>
          <p className="flex items-center justify-between gap-2 text-[10px]">
            <span className="text-ink-3">Price</span>
            <span className="font-medium text-ink">₦420,000</span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl border border-accent-200 bg-accent-50 px-3 py-2">
        <span className="flex items-center gap-1 text-[10px] font-medium text-accent-800">
          <ShieldCheck className="h-3 w-3" /> Code shared
        </span>
        <span className="font-mono text-[11.5px] font-semibold tracking-[0.18em] text-accent-900">3F7QK2</span>
      </div>

      <p className="text-[10px] leading-relaxed text-ink-3">A portable, timestamped copy each side keeps.</p>
    </div>
  );
}

const SCREENS = [ScreenPick, ScreenFill, ScreenAcknowledged];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function PhonePreview() {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(() => setIndex((current) => (current + 1) % SCREENS.length), 4000);
    return () => clearTimeout(timer);
  }, [index]);

  const Screen = SCREENS[index];

  return (
    <motion.div className="relative mx-auto w-full max-w-78" animate={reduceMotion ? undefined : { y: [0, -7, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}>
      <div aria-hidden="true" className="absolute -inset-8 -z-10 rounded-[4rem] bg-linear-to-b from-brand-200/70 via-brand-100/30 to-transparent blur-2xl" />

      <motion.div initial={{ opacity: 0, y: 28, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, ease: EASE, delay: 0.15 }} className="relative rounded-[2.6rem] border border-brand-900/30 bg-linear-to-b from-brand-900 to-brand-950 p-2 shadow-[0_40px_80px_-40px_rgba(7,33,21,0.7)]">
        <div className="relative overflow-hidden rounded-[2.15rem] bg-canvas">
          <div aria-hidden="true" className="absolute top-2 left-1/2 z-20 h-5 w-21 -translate-x-1/2 rounded-full bg-brand-950" />

          <div className="relative z-10 flex items-center justify-between px-6 pt-3 text-[9px] font-semibold text-ink-2">
            <span>9:41</span>
            <span className="flex items-center gap-1.5" aria-hidden="true">
              <span>5G</span>
              <span className="h-2 w-3.5 rounded-xs border border-ink-3/70 p-px">
                <span className="block h-full w-2/3 rounded-[1px] bg-ink-3/70" />
              </span>
            </span>
          </div>

          <div className="px-4 pt-3 pb-4">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <div className="flex items-center gap-1.5">
                <LogoMark className="h-5 w-5" />
                <span className="text-[11px] font-semibold tracking-tight text-ink">TruthCap</span>
              </div>
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[9px] font-medium text-ink-2">{index + 1} / 3</span>
            </div>

            <div key={index} className="screen-in flex h-100 flex-col overflow-hidden">
              <div className="flex min-h-0 flex-1 flex-col justify-center">
                <Screen />
              </div>
              <div className="mt-3 flex shrink-0 items-center justify-between border-t border-line pt-3 text-[9px] text-ink-3">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-brand-600" />
                  Private until acknowledged
                </span>
                <span>Tap to open</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div aria-hidden="true" className="float-soft absolute top-24 -right-28 hidden items-center gap-2 rounded-xl border border-line bg-surface/95 px-3 py-2 shadow-(--shadow-pop) backdrop-blur xl:flex">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-brand-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
        </span>
        <span className="text-[11px] leading-tight font-semibold text-ink">
          Acknowledged
          <span className="block text-[10px] font-normal text-ink-3">by both people</span>
        </span>
      </div>

      <div aria-hidden="true" className="float-soft absolute bottom-36 -left-24 hidden items-center gap-2 rounded-xl border border-line bg-surface/95 px-3 py-2 shadow-(--shadow-pop) backdrop-blur xl:flex">
        <Clock className="h-3.5 w-3.5 text-brand-600" /> <span className="text-[11px] font-semibold text-ink">Timestamped</span>
      </div>
    </motion.div>
  );
}
