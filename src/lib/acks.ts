import type { TruthCapture } from "@/types/truth";

/**
 * The acknowledgment channel between the two devices that hold a record.
 *
 * Both sides decode the record id out of the payload, so acknowledgments are
 * keyed by it: the channel works whether the record arrived as a short link or
 * inside a `#…` link, and the store never has to understand the record format.
 * It keeps a party index, a timestamp, and the code that gates the record.
 *
 * Without the store configured (or reachable) every call simply reports failure
 * and acknowledgment state stays on each device, which is how it worked before.
 */

const REQUEST_TIMEOUT_MS = 4000;
const RECORD_PATTERN = /^trc_[A-Za-z0-9\-_]{1,64}$/;

export type RemoteAck = { party: number; when: string };

async function request(path: string, init?: RequestInit): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(path, { ...init, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** What the other device recorded for this record, or null when unreachable. */
export async function fetchAcks(recordId: string): Promise<RemoteAck[] | null> {
  if (!RECORD_PATTERN.test(recordId)) return null;

  const response = await request(`/api/share?record=${encodeURIComponent(recordId)}`);
  if (!response?.ok) return null;

  try {
    const data = (await response.json()) as { acks?: unknown };
    if (!Array.isArray(data.acks)) return null;

    return data.acks.filter((entry): entry is RemoteAck => Boolean(entry) && typeof entry === "object" && typeof (entry as RemoteAck).party === "number" && typeof (entry as RemoteAck).when === "string" && Number.isFinite(Date.parse((entry as RemoteAck).when)));
  } catch {
    return null;
  }
}

/** Tells the other device that this side has confirmed the record. */
export async function pushAck(record: TruthCapture, party: number): Promise<boolean> {
  const when = record.parties[party]?.acknowledged;
  const code = record.accessCode;

  if (!RECORD_PATTERN.test(record.id) || !when || !code) return false;

  const response = await request("/api/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ record: record.id, party, when, code }),
  });

  return response?.ok ?? false;
}
