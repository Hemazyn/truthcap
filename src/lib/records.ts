import { getTemplate } from "@/data/templates";
import { routes } from "@/lib/router";
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

export function shareUrlFor(code: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}${routes.acknowledge(code)}`;
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
