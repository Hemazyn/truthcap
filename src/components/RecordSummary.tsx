import { formatDate, formatFieldValue } from "@/lib/validate";
import type { TruthCapture, TruthTemplate } from "@/types/truth";

interface RecordSummaryProps {
  capture: TruthCapture;
  template: TruthTemplate;
  showMeta?: boolean;
  framed?: boolean;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[190px_1fr] sm:gap-4">
      <dt className="text-sm text-ink-3">{label}</dt>
      <dd className="text-sm font-medium break-words text-ink">{value}</dd>
    </div>
  );
}

export function RecordSummary({ capture, template, showMeta = true, framed = true }: RecordSummaryProps) {
  const currency = typeof capture.values.currency === "string" ? capture.values.currency : "NGN";

  const rows = template.fields.map((field) => ({
    key: field.key,
    label: field.label,
    value: formatFieldValue(field, capture.values[field.key] ?? null, "—", currency),
  }));

  return (
    <div className={framed ? "overflow-hidden rounded-2xl border border-line bg-surface shadow-(--shadow-card)" : "overflow-hidden bg-surface"}>
      <dl className="divide-y divide-line">
        {showMeta && (
          <>
            <Row label="Record" value={capture.title} />
            <Row label="Initiated by" value={capture.initiator || "The initiator"} />
            <Row label="Created at" value={formatDate(capture.createdAt)} />
          </>
        )}
        {rows.map((row) => (
          <Row key={row.key} label={row.label} value={row.value} />
        ))}
      </dl>
    </div>
  );
}
