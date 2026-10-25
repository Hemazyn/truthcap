import { Copy, FileText, Info, ShieldCheck } from "lucide-react";

const POINTS = [
  {
    icon: ShieldCheck,
    title: "Not a contract. Not a chat.",
    body: "A timestamped record of an agreement the two of you actually had — for the moments where a screenshot is too weak and a contract is too heavy.",
  },
  {
    icon: Copy,
    title: "Both sides keep a copy.",
    body: "The record is portable. Export it, share it, keep it yourself. It does not disappear into a dashboard only one person can see.",
  },
  {
    icon: FileText,
    title: "Made for real moments.",
    body: "Item condition before a sale. Work delivered and accepted. A repair agreed before work starts. A payment schedule. A handover.",
  },
];

export function TruthInstructions() {
  return (
    <aside>
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-(--shadow-card)">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <Info className="h-4.5 w-4.5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-ink">What this actually does</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">You write down a real-life moment. The other person acknowledges it. Once both sides have done that, each keeps a copy.</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {POINTS.map((point) => (
            <div key={point.title} className="flex gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                <point.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{point.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{point.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl bg-brand-50 p-4 ring-1 ring-brand-100">
          <p className="text-sm font-semibold text-brand-900">Quick start</p>
          <ol className="mt-2 space-y-1.5 text-sm text-brand-900/80">
            {["Pick the closest template.", "Fill in the details honestly.", "Send the code to the other person.", "They acknowledge, and both keep a copy."].map((step, index) => (
              <li key={step} className="flex gap-2">
                <span className="mt-1.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-200 text-[10px] font-semibold text-brand-900">{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </aside>
  );
}
