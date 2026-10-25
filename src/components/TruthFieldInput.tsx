import { useId } from "react";
import type { TruthField } from "@/types/truth";
import { cn } from "@/lib/utils";
import { currencySymbol } from "@/lib/validate";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";

function asString(value: string | number | boolean | null): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

const inputBase = "w-full rounded-sm border border-line-strong bg-surface px-4 py-3 text-[15px] text-ink shadow-sm transition placeholder:text-ink-3 focus:border-none focus:ring-0 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

const inputError = "border-accent-500 focus-border-accent-500 focus:ring-accent-500/25";

interface TruthFieldInputProps {
  field: TruthField;
  value: string | number | boolean | null;
  onChange: (value: string | number | boolean | null) => void;
  error?: string;
  disabled?: boolean;
  currency?: string;
}

function FieldLabel({ id, field }: { id: string; field: TruthField }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor={id}>
      {field.label}
      {field.required && (
        <span className="ml-1 text-brand-600" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

function FieldNote({ id, error, help }: { id: string; error?: string; help?: string }) {
  if (error) {
    return (
      <p id={`${id}-error`} className="mt-1.5 text-sm text-accent-700">
        {error}
      </p>
    );
  }

  if (help) {
    return (
      <p id={`${id}-help`} className="mt-1.5 text-xs leading-relaxed text-ink-3">
        {help}
      </p>
    );
  }

  return null;
}

function describedBy(id: string, error?: string, help?: string) {
  const ids = [help && `${id}-help`, error && `${id}-error`].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

export function TruthFieldInput({ field, value, onChange, error, disabled, currency }: TruthFieldInputProps) {
  const id = useId();
  const description = describedBy(id, error, field.help);

  if (field.type === "boolean") {
    return (
      <div>
        <label className={cn("flex cursor-pointer items-start gap-3 rounded-sm border px-4 py-3.5 transition", error ? "border-accent-500 bg-accent-50" : "border-line-strong bg-surface hover:border-brand-300")}>
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 rounded-sm accent-brand-600 focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-50" checked={value === true} onChange={(e) => onChange(e.target.checked)} disabled={disabled} aria-describedby={description} />
          <span className="flex flex-col">
            <span className="text-sm font-medium text-ink">{field.label}</span>
            {field.help && <span className="mt-0.5 text-xs leading-relaxed text-ink-3">{field.help}</span>}
          </span>
        </label>
        {error && <p className="mt-1.5 text-sm text-accent-700">{error}</p>}
      </div>
    );
  }

  if (field.type === "textarea") {
    const textValue = typeof value === "string" ? value : "";
    return (
      <div>
        <FieldLabel id={id} field={field} />
        <textarea id={id} className={cn(inputBase, "min-h-28 resize-y", error && inputError)} placeholder={field.placeholder} value={textValue} onChange={(e) => onChange(e.target.value)} disabled={disabled} aria-describedby={description} aria-invalid={Boolean(error)} />
        <FieldNote id={id} error={error} help={field.help} />
      </div>
    );
  }

  if (field.type === "select") {
    const textValue = typeof value === "string" ? value : "";
    return (
      <div>
        <FieldLabel id={id} field={field} />
        <CustomSelect id={id} value={textValue} options={field.options} onChange={(next) => onChange(next)} placeholder="— Select —" disabled={disabled} invalid={Boolean(error)} describedBy={description} allowCustom />
        <FieldNote id={id} error={error} help={field.help} />
      </div>
    );
  }

  if (field.type === "date") {
    const textValue = typeof value === "string" ? value : "";
    return (
      <div>
        <FieldLabel id={id} field={field} />
        <CustomDatePicker id={id} value={textValue} onChange={(next) => onChange(next)} disabled={disabled} invalid={Boolean(error)} describedBy={description} />
        <FieldNote id={id} error={error} help={field.help} />
      </div>
    );
  }

  if (field.type === "amount") {
    const textValue = typeof value === "number" ? String(value) : "";
    const symbol = currencySymbol(currency);

    return (
      <div>
        <FieldLabel id={id} field={field} />
        <div className="relative">
          {symbol && <span className="absolute top-1/2 left-4 -translate-y-1/2 text-sm font-medium text-ink-3">{symbol}</span>}
          <input
            id={id}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className={cn(inputBase, symbol && "pl-9", error && inputError)}
            placeholder={field.placeholder ?? "0"}
            value={textValue}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                onChange(null);
                return;
              }
              const num = Number(raw);
              if (Number.isFinite(num) && num >= 0) {
                onChange(num);
              }
            }}
            disabled={disabled}
            aria-describedby={description}
            aria-invalid={Boolean(error)}
          />
        </div>
        <FieldNote id={id} error={error} help={field.help} />
      </div>
    );
  }

  return (
    <div>
      <FieldLabel id={id} field={field} />
      <input id={id} type="text" className={cn(inputBase, error && inputError)} placeholder={field.placeholder} value={asString(value)} onChange={(e) => onChange(e.target.value)} disabled={disabled} aria-describedby={description} aria-invalid={Boolean(error)} />
      <FieldNote id={id} error={error} help={field.help} />
    </div>
  );
}
