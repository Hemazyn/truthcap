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

/**
 * A copy that arrived over a share link, merged with the one this device already
 * holds. The link carries what the other side sent; this device keeps its own
 * acknowledgment stamps, so an older payload can never roll them back and a
 * stale local copy can never hide what the link says either.
 */
export function mergeSharedCopy(existing: TruthCapture | null, incoming: TruthCapture): TruthCapture {
  if (!existing) return incoming;

  const parties = incoming.parties.map((party, index) => {
    const local = existing.parties[index];
    return !party.acknowledged && local?.acknowledged ? { ...party, acknowledged: local.acknowledged } : party;
  });
  const complete = parties.length > 0 && parties.every((party) => Boolean(party.acknowledged));

  // Whoever recorded the moment both sides confirmed keeps the timestamp; a link
  // made before that carries an acknowledgment with no `when` and loses here.
  const localAcknowledgment = existing.acknowledgment ?? null;
  const incomingAcknowledgment = incoming.acknowledgment ?? null;
  const acknowledgment = localAcknowledgment?.when && !incomingAcknowledgment?.when ? localAcknowledgment : (incomingAcknowledgment ?? localAcknowledgment);

  return {
    ...incoming,
    parties,
    acknowledgment,
    status: incoming.status === "pending" && complete ? "acknowledged" : incoming.status,
  };
}

/** Names of the parties whose acknowledgment is still outstanding, in order. */
export function outstandingPartyLabels(capture: TruthCapture): string[] {
  return capture.parties.reduce<string[]>((labels, party, index) => {
    if (!party.acknowledged) labels.push(partyLabel(capture, index) || `Party ${index + 1}`);
    return labels;
  }, []);
}

/** How many parties have acknowledged, out of the parties on the record. */
export function acknowledgedPartyCount(capture: TruthCapture): number {
  return capture.parties.filter((party) => Boolean(party.acknowledged)).length;
}
