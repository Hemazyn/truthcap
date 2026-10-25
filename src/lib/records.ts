import { getTemplate } from "@/data/templates";
import { routes } from "@/lib/router";
import { encodeRecord } from "@/lib/share";
import { createShortLink } from "@/lib/shortlink";
import type { TruthCapture, TruthTemplate } from "@/types/truth";

export function findRecord(records: TruthCapture[], id: string): TruthCapture | null {
  return records.find((record) => record.id === id) ?? null;
}

export function findRecordByCode(records: TruthCapture[], code: string): TruthCapture | null {
  const normalized = code.trim().toUpperCase();
  return records.find((record) => record.accessCode === normalized) ?? null;
}

export function findActiveRecord(records: TruthCapture[], activeId: string | null): TruthCapture | null {
  if (!activeId) return null;
  return findRecord(records, activeId);
}

export function templateFor(capture: TruthCapture | null): TruthTemplate | null {
  if (!capture) return null;
  return getTemplate(capture.templateId) ?? null;
}

export type ShareLink = { url: string; viaServer: boolean };

/**
 * A link anyone can open. Short links keep the record on the server; when that
 * is unreachable the record travels inside the URL fragment instead, so sharing
 * still works offline.
 */
export async function shareLinkFor(capture: TruthCapture): Promise<ShareLink> {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const payload = await encodeRecord(capture);
  const short = await createShortLink(payload);

  if (short) return { url: short, viaServer: true };
  return { url: `${origin}${routes.shared(payload)}`, viaServer: false };
}

export function recordUrlFor(id: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}${routes.record(id)}`;
}

export function partyLabel(capture: TruthCapture, index: number): string {
  const party = capture.parties[index];
  if (!party) return "";
  return party.name?.trim() || party.role;
}
