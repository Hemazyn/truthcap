export type TruthStatus = "draft" | "pending" | "acknowledged" | "expired" | "revoked";

export interface Party {
  role: string;
  name?: string;
  contact?: string;
}

export interface TruthTemplate {
  id: string;
  title: string;
  subtitle: string;
  purpose: string;
  fields: TruthField[];
  defaultParties: Party[];
}

export interface TruthField {
  key: string;
  label: string;
  type: "text" | "textarea" | "amount" | "currency" | "date" | "select" | "boolean";
  placeholder?: string;
  help?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  default?: string | number | boolean;
}

export interface TruthCapture {
  id: string;
  templateId: string;
  title: string;
  status: TruthStatus;
  createdAt: string;
  initiator: string;
  /** Six-character code the other person uses to acknowledge the record. */
  accessCode: string | null;
  parties: { role: string; name?: string; contact?: string; acknowledged?: string }[];
  values: Record<string, string | number | boolean | null | undefined>;
  acknowledgment: {
    who: string;
    when: string | null;
    method: "link" | "code" | null;
  } | null;
}
