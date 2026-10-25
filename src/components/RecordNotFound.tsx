import { FileQuestion } from "lucide-react";
import { navigate, routes } from "@/lib/router";
import { Button } from "@/components/ui/Button";

interface RecordNotFoundProps {
  title: string;
  description: string;
  detail?: string;
}

export function RecordNotFound({ title, description, detail }: RecordNotFoundProps) {
  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-3xl border border-line bg-surface p-7 text-center shadow-(--shadow-card) sm:p-10">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          <FileQuestion className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-2xl leading-tight text-ink sm:text-3xl">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-2">{description}</p>
        {detail && <p className="mt-4 rounded-xl bg-surface-2 px-4 py-3 font-mono text-sm tracking-[0.16em] text-ink-2">{detail}</p>}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => navigate(routes.home())}>Back home</Button>
          <Button variant="secondary" onClick={() => navigate(routes.create())}>
            Create a record
          </Button>
        </div>
      </div>
    </div>
  );
}
