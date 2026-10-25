import type { TruthField, TruthCapture } from "@/types/truth";

export type FieldError = { key: string; message: string };

export function validateCapture(template: { fields: TruthField[] }, values: TruthCapture["values"]): FieldError[] {
  const errors: FieldError[] = [];

  for (const field of template.fields) {
    const value = values[field.key];
    if (!field.required) continue;

    if (value === null || value === undefined || value === "") {
      errors.push({ key: field.key, message: `${field.label} is required.` });
      continue;
    }

    if (field.type === "amount") {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0) {
        errors.push({
          key: field.key,
          message: `${field.label} must be a valid amount.`,
        });
      }
    }

    // Selects accept a typed custom value as well as the listed options.

    if (field.type === "date" && typeof value === "string") {
      if (!Date.parse(value)) {
        errors.push({
          key: field.key,
          message: `${field.label} must be a valid date.`,
        });
      }
    }

    if (field.type === "boolean" && typeof value !== "boolean" && value !== null) {
      errors.push({
        key: field.key,
        message: `${field.label} must be yes or no.`,
      });
    }
  }

  return errors;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export function currencySymbol(code?: string | null): string {
  const key = (code ?? "NGN").toUpperCase();
  return CURRENCY_SYMBOLS[key] ?? "";
}

export function formatMoney(value: number, code?: string | null): string {
  const currency = (code ?? "").toUpperCase();

  if (Object.prototype.hasOwnProperty.call(CURRENCY_SYMBOLS, currency)) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  }

  return new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(value);
}

export function formatFieldValue(field: TruthField, value: string | number | boolean | null | undefined, defaultWhenEmpty: string = "—", currency?: string | null): string {
  if (value === null || value === undefined || value === "") return defaultWhenEmpty;

  if (field.type === "boolean") {
    if (value === true || value === false) {
      return value ? "Yes" : "No";
    }
    return defaultWhenEmpty;
  }

  if (field.type === "date" && typeof value === "string" && value !== "") {
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }

    return value;
  }

  if (field.type === "select" && field.options) {
    const stringValue = typeof value === "string" ? value : "";
    if (stringValue !== "") {
      const option = field.options.find((o) => o.value === stringValue);
      return option?.label ?? stringValue;
    }
    return defaultWhenEmpty;
  }

  if (field.type === "amount" && typeof value === "number") {
    return formatMoney(value, currency);
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return String(value);
  }

  return defaultWhenEmpty;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
