import type { FormEvent } from "react";
import { ArrowLeft, ArrowRight, Users } from "lucide-react";
import { useTruthStore } from "@/store/useTruthStore";
import { validateCapture } from "@/lib/validate";
import { TruthFieldInput } from "@/components/TruthFieldInput";
import { Button } from "@/components/ui/Button";
import type { TruthCapture, TruthTemplate } from "@/types/truth";

interface TruthCaptureFormProps {
  capture: TruthCapture;
  template: TruthTemplate;
  onBack: () => void;
}

const partyInputClass = "w-full rounded-sm border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink shadow-sm transition placeholder:text-ink-3 focus:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50";

export function TruthCaptureForm({ capture, template, onBack }: TruthCaptureFormProps) {
  const setField = useTruthStore((state) => state.setField);
  const setPartyName = useTruthStore((state) => state.setPartyName);
  const setPartyContact = useTruthStore((state) => state.setPartyContact);
  const initiate = useTruthStore((state) => state.initiate);

  const errors = validateCapture(template, capture.values);

  const errorMap: Record<string, string> = {};
  for (const error of errors) {
    errorMap[error.key] = error.message;
  }

  const canInitiate = errors.length === 0;
  const currency = typeof capture.values.currency === "string" ? capture.values.currency : "NGN";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canInitiate) return;
    initiate();
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="font-display text-2xl leading-tight text-ink sm:text-[1.9rem]">Fill in the details</h2>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-2">Both sides get a copy of what you write here, so write it as if both people will read it.</p>

      <div className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-(--shadow-card) sm:p-6">
        <div className="space-y-5">
          {template.fields.map((field) => (
            <TruthFieldInput key={field.key} field={field} value={capture.values[field.key] ?? null} onChange={(value) => setField(field.key, value)} error={errorMap[field.key]} currency={currency} />
          ))}
        </div>
      </div>

      {capture.parties.length > 0 && (
        <div className="mt-5 rounded-md border border-line bg-surface p-5 shadow-(--shadow-card) sm:p-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              <Users className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold text-ink">Who is this between?</h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">Names appear on the final record. Add a way to reach each person if you have it — both sides receive the same copy.</p>

          <div className="mt-4 space-y-3">
            {capture.parties.map((party, index) => (
              <div key={`${party.role}-${index}`} className="rounded-md border border-line bg-surface-2/60 p-4">
                <p className="text-sm font-semibold text-ink">{party.role}</p>

                <div className="mt-3 grid items-end gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-2">Name</span>
                    <input type="text" className={partyInputClass} placeholder={(template.defaultParties[index]?.role ?? index === 0) ? "Your name" : "Their name"} aria-label={`${party.role} name`} value={party.name ?? ""} onChange={(event) => setPartyName(index, event.target.value)} autoComplete="name" />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-ink-2">
                      Contact <span className="text-ink-3">(optional)</span>
                    </span>
                    <input type="text" inputMode="tel" className={partyInputClass} placeholder="Phone or email" aria-label={`${party.role} contact`} value={party.contact ?? ""} onChange={(event) => setPartyContact(index, event.target.value)} autoComplete={index === 0 ? "tel" : "off"} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse sm:items-center">
        <Button type="submit" size="lg" disabled={!canInitiate} className="w-full sm:w-auto sm:flex-1">
          Create the record
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={onBack} className="w-full sm:w-auto">
          <ArrowLeft className="h-4 w-4" />
          Back to templates
        </Button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-3">Next, you get a six-character code and a link to send to the other person. The record is fixed once they acknowledge it.</p>
    </form>
  );
}
