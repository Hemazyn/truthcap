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
 * Puts a new set of parties on a record and recomputes what follows from them:
 * the record is acknowledged once every party has confirmed, and the completion
 * stamp is the last confirmation that got it there.
 */
export function withParties(capture: TruthCapture, parties: TruthCapture["parties"]): TruthCapture {
  const stamps = parties.map((party) => party.acknowledged).filter((stamp): stamp is string => Boolean(stamp));
  const latest = stamps.slice().sort().at(-1);

  if (stamps.length === 0) return { ...capture, parties };

  const last = parties.find((party) => party.acknowledged === latest);
  const complete = stamps.length === parties.length;

  return {
    ...capture,
    parties,
    status: capture.status === "pending" && complete ? "acknowledged" : capture.status,
    acknowledgment: {
      who: last?.name?.trim() || last?.role || "The other person",
      when: complete ? (latest ?? null) : null,
      method: capture.acknowledgment?.method ?? "code",
    },
  };
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

  return withParties(incoming, parties);
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
