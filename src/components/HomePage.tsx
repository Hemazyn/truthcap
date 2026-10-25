import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Check, ClipboardList, FileText, KeyRound, Package, PencilLine, Share2, ShieldCheck, UserCheck, Wallet, Wrench } from "lucide-react";
import { TEMPLATES } from "@/data/templates";
import { Button } from "@/components/ui/Button";
import { PhonePreview } from "@/components/PhonePreview";
import { MaskLines, MaskWords, Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";

const TEMPLATE_ICONS: Record<string, typeof Package> = {
  "item-condition-agreement": Package,
  "work-delivered-accepted": FileText,
  "repair-agreed": Wrench,
  "payment-schedule-agreed": Wallet,
  "handover-acknowledged": KeyRound,
};

const STEPS = [
  {
    icon: ClipboardList,
    title: "Pick the moment",
    body: "Start from a template that already matches the situation — a used item, a repair, a delivery, a payment plan, a handover.",
  },
  {
    icon: PencilLine,
    title: "Write it plainly",
    body: "Fill in only what matters: what it is, what condition, what price, what date. Plain words both people would sign off on.",
  },
  {
    icon: UserCheck,
    title: "They acknowledge",
    body: "The other person gets a link or a short code, reads the same record you wrote, and acknowledges it. Then you both keep a copy.",
  },
];

export function HomePage({ onStart }: { onStart: (templateId?: string) => void }) {
  const phoneRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: phoneRef, offset: ["start end", "end start"] });
  const phoneY = useTransform(scrollYProgress, [0, 1], [46, -46]);
  const phoneRotate = useTransform(scrollYProgress, [0, 1], [1.2, -1.2]);

  return (
    <div className="overflow-hidden">
      <section className="relative">
        <motion.div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-155 bg-[radial-gradient(70%_60%_at_25%_0%,var(--color-brand-100),transparent_70%)]" animate={reduceMotion ? undefined : { scale: [1, 1.05, 1], opacity: [0.85, 1, 0.85] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />

        <div className="mx-auto grid max-w-6xl items-center gap-16 px-5 pt-12 pb-16 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:pt-20 lg:pb-24">
          <div>
            <h1 className="mt-5 font-display text-[2.85rem] leading-[1.03] tracking-[-0.01em] text-ink sm:text-[3.5rem] lg:text-[3.9rem]">
              <MaskLines lines={["Agree it.", "Write it down.", <span className="text-brand-600 italic">Both keep a copy.</span>]} />
            </h1>

            <Reveal delay={0.35}>
              <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-ink-2 sm:text-base">TruthCap turns the thing you agreed in a chat — the price, the condition, the date — into a timestamped record both people acknowledge. Not a contract. Not another dashboard. Just the truth, on one page.</p>
            </Reveal>

            <Reveal delay={0.45}>
              <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <Button size="lg" onClick={() => onStart()}>
                  Create a record
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <button type="button" onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-surface px-6 text-[0.95rem] font-semibold text-ink ring-1 ring-line-strong transition hover:bg-surface-2 hover:ring-brand-300">
                  See how it works
                </button>
              </div>
            </Reveal>

            <Reveal delay={0.55}>
              <ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-xs font-medium text-ink-3">
                {["No account needed", "Share by link or code", "A copy you actually keep"].map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-brand-600" strokeWidth={3} />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <motion.div ref={phoneRef} className="relative" style={reduceMotion ? undefined : { y: phoneY, rotate: phoneRotate }}>
            <PhonePreview />
          </motion.div>
        </div>
      </section>

      <section id="templates" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:px-8 lg:py-20">
        <div className="max-w-2xl">
          <Reveal from="left">
            <p className="text-[10.5px] font-semibold tracking-[0.16em] text-brand-700 uppercase">Made for real moments</p>
          </Reveal>
          <h2 className="mt-3 font-display text-3xl leading-tight text-ink sm:text-[2.6rem]">
            <MaskWords text="The moments people regret not recording" />
          </h2>
          <Reveal delay={0.2}>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">Five situations where a chat screenshot is too weak and a formal contract is too heavy. Pick the one in front of you.</p>
          </Reveal>
        </div>

        <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((template, index) => {
            const Icon = TEMPLATE_ICONS[template.id] ?? FileText;
            return (
              <StaggerItem key={template.id} className="h-full" from="flip" index={index}>
                <button type="button" onClick={() => onStart(template.id)} className="group flex h-full flex-col items-start rounded-2xl border border-line bg-surface p-5 text-left shadow-(--shadow-card) transition duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-(--shadow-pop)">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition duration-300 group-hover:scale-105 group-hover:bg-brand-100">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="mt-4 text-[15px] font-semibold text-ink">{template.title}</span>
                  <span className="mt-1.5 text-sm leading-relaxed text-ink-2">{template.subtitle}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-semibold text-brand-700">
                    Start this record
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </button>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      <section id="how" className="scroll-mt-20 border-y border-line bg-surface/60">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <Reveal from="left">
                <p className="text-[10.5px] font-semibold tracking-[0.16em] text-brand-700 uppercase">How it works</p>
              </Reveal>
              <h2 className="mt-3 font-display text-3xl leading-tight text-ink sm:text-[2.6rem]">
                <MaskWords text="Three steps, about a minute" />
              </h2>
            </div>
            <Reveal from="right" delay={0.25}>
              <p className="max-w-sm text-sm leading-relaxed text-ink-2">Nothing to install, nothing to sign up for. The record only becomes final when both people have agreed to it.</p>
            </Reveal>
          </div>

          <Stagger as="ol" className="mt-10 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <StaggerItem as="li" key={step.title} from="slide" index={index} className="relative rounded-2xl border border-line bg-surface p-6 shadow-(--shadow-card) transition duration-300 hover:-translate-y-1 hover:shadow-(--shadow-pop)">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white shadow-(--shadow-cta)">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="font-display text-2xl text-brand-200">0{index + 1}</span>
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{step.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section id="why" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:px-8 lg:py-20">
        <div className="grid gap-8 rounded-3xl border border-line bg-surface p-7 shadow-(--shadow-card) sm:p-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-14">
          <div>
            <Reveal from="left">
              <p className="text-[10.5px] font-semibold tracking-[0.16em] text-brand-700 uppercase">Why this exists</p>
            </Reveal>
            <Reveal from="left" delay={0.1}>
              <h2 className="mt-3 font-display text-3xl leading-tight text-ink sm:text-[2.35rem]">Chat screenshots forget. Contracts overpromise.</h2>
            </Reveal>
          </div>
          <Reveal from="right" delay={0.25}>
            <div className="space-y-4 text-[15px] leading-relaxed text-ink-2">
              <p>A lot of everyday agreements already happened out loud: the condition of a used laptop, a repair price, a delivery, a payment plan, a handover. The only record is a screenshot nobody can find, an email nobody reads, or nothing at all.</p>
              <p>TruthCap is the small thing in between — a lightweight, mutual, timestamped page both sides actually read before the memory gets fuzzy.</p>
              <div className="flex flex-wrap gap-4 pt-1">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-ink-3">
                  <ShieldCheck className="h-4 w-4 text-brand-600" /> Both sides read the same page
                </span>
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-ink-3">
                  <Share2 className="h-4 w-4 text-brand-600" /> Portable by design
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <Reveal from="zoom">
          <div className="relative overflow-hidden rounded-3xl bg-brand-950 px-7 py-12 text-center sm:px-12 sm:py-16">
            <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(43,138,87,0.55),transparent_70%)]" animate={reduceMotion ? undefined : { opacity: [0.55, 0.9, 0.55], scale: [1, 1.06, 1] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl font-display text-3xl leading-tight text-brand-50 sm:text-[2.7rem]">
                <MaskWords text="Start with the thing in front of you." />
              </h2>
              <Reveal delay={0.2}>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-brand-100/80 sm:text-base">Pick a template, write it plainly, and send it to the other person. That is the whole product.</p>
              </Reveal>
              <Button size="lg" onClick={() => onStart()} className="mt-7 bg-white text-brand-900 shadow-none hover:bg-brand-50">
                Create a record
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
