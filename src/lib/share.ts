import { getTemplate } from "@/data/templates";
import { decodePayload, encodePayload } from "@/lib/payload";
import { isCaptureRecord } from "@/lib/storage";
import type { TruthCapture, TruthStatus } from "@/types/truth";

/**
 * Share links carry the record itself, so the other person can open it on any
 * device without an account or a server. Everything after the `#` stays in the
 * browser — it is never sent to a host.
 *
 * The record is packed into a binary payload (see `payload.ts`) and deflated
 * before being base64url-encoded. Links made by earlier versions — deflated
 * JSON, plain JSON, and the original `{ v: 1, record }` blob — still decode.
 */
const COMPRESSED_PREFIX = "z";
const RAW_BINARY_PREFIX = "b";
const PLAIN_PREFIX = "j";
const MAX_ENCODED_LENGTH = 12000;
const MAX_TEXT_LENGTH = 40000;
const STATUSES: TruthStatus[] = ["draft", "pending", "acknowledged", "expired", "revoked"];

type PartyTuple = [role: string, name: string, contact: string, acknowledged: string | 0];

/** The JSON envelope, used for templates this version does not know about. */
interface CompactRecord {
  v: 2;
  i: string;
  t: string;
  s: TruthStatus;
  c: string;
  n?: string;
  k?: string | null;
  p: PartyTuple[];
  w: TruthCapture["values"];
  a?: [who: string, when: string | null, method: "link" | "code" | null] | 0;
}

interface LegacyPayload {
  v: 1;
  record: TruthCapture;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const JSON_START = 0x7b; // "{"

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");

  try {
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function deflateBytes(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === "undefined") return null;

  try {
    const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function inflateBytes(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === "undefined") return null;

  try {
    const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

/** Empty answers cost link length and read back as blank anyway. */
function compactValues(values: TruthCapture["values"]): TruthCapture["values"] {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== "" && value !== null && value !== undefined));
}

function compress(capture: TruthCapture): CompactRecord {
  return {
    v: 2,
    i: capture.id,
    t: capture.templateId,
    s: capture.status,
    c: capture.createdAt,
    n: capture.initiator || undefined,
    k: capture.accessCode ?? undefined,
    p: capture.parties.map((party) => [party.role, party.name ?? "", party.contact ?? "", party.acknowledged ?? 0]),
    w: compactValues(capture.values),
    a: capture.acknowledgment ? [capture.acknowledgment.who, capture.acknowledgment.when, capture.acknowledgment.method] : 0,
  };
}

function expand(payload: unknown): TruthCapture | null {
  if (!payload || typeof payload !== "object") return null;

  const compact = payload as Partial<CompactRecord>;
  if (compact.v !== 2) return null;
  if (typeof compact.i !== "string" || typeof compact.t !== "string") return null;
  if (typeof compact.c !== "string" || !STATUSES.includes(compact.s as TruthStatus)) return null;
  if (!Array.isArray(compact.p) || !compact.w || typeof compact.w !== "object") return null;

  const parties = compact.p.map((party) => {
    if (!Array.isArray(party)) return null;
    const [role, name, contact, acknowledged] = party;

    return {
      role: String(role ?? ""),
      name: String(name ?? ""),
      contact: String(contact ?? ""),
      acknowledged: acknowledged ? String(acknowledged) : undefined,
    };
  });

  if (parties.some((party) => party === null)) return null;

  const capture: TruthCapture = {
    id: compact.i,
    templateId: compact.t,
    // Titles are never edited, so they are rebuilt from the template.
    title: getTemplate(compact.t)?.title ?? "Agreed record",
    status: compact.s as TruthStatus,
    createdAt: compact.c,
    initiator: compact.n ?? "",
    accessCode: compact.k ?? null,
    parties: parties as TruthCapture["parties"],
    values: compact.w,
    acknowledgment: Array.isArray(compact.a) ? { who: String(compact.a[0] ?? ""), when: compact.a[1] ? String(compact.a[1]) : null, method: compact.a[2] ?? null } : null,
  };

  return isCaptureRecord(capture) ? capture : null;
}

function fromJson(text: string | null): TruthCapture | null {
  if (!text || text.length > MAX_TEXT_LENGTH) return null;

  try {
    const parsed = JSON.parse(text) as Partial<CompactRecord> | Partial<LegacyPayload> | null;
    if (!parsed) return null;

    if ("record" in parsed) {
      const legacy = (parsed as LegacyPayload).record;
      return isCaptureRecord(legacy) ? legacy : null;
    }

    return expand(parsed);
  } catch {
    return null;
  }
}

/** Older browsers without DecompressionStream cannot open compressed links. */
export function canDecodeCompressedLinks(): boolean {
  return typeof DecompressionStream !== "undefined";
}

export async function encodeRecord(capture: TruthCapture): Promise<string> {
  const template = getTemplate(capture.templateId);
  const binary = template ? encodePayload(capture, template) : null;

  if (binary) {
    const compressed = await deflateBytes(binary);
    // Deflate costs a couple of bytes of framing; short records do better raw.
    if (compressed && compressed.length < binary.length) return `${COMPRESSED_PREFIX}${bytesToBase64Url(compressed)}`;
    return `${RAW_BINARY_PREFIX}${bytesToBase64Url(binary)}`;
  }

  const text = JSON.stringify(compress(capture));
  const compressed = await deflateBytes(textEncoder.encode(text));

  if (!compressed) return `${PLAIN_PREFIX}${bytesToBase64Url(textEncoder.encode(text))}`;
  return `${COMPRESSED_PREFIX}${bytesToBase64Url(compressed)}`;
}

export async function decodeRecord(encoded: string): Promise<TruthCapture | null> {
  const value = encoded.trim();
  if (!value || value.length > MAX_ENCODED_LENGTH) return null;
  if (!/^[A-Za-z0-9\-_]+$/.test(value)) return null;

  if (value.startsWith(COMPRESSED_PREFIX)) {
    const bytes = base64UrlToBytes(value.slice(1));
    const inflated = bytes ? await inflateBytes(bytes) : null;
    if (!inflated || inflated.length === 0) return null;

    // Deflated JSON from earlier versions starts with "{".
    return inflated[0] === JSON_START ? fromJson(textDecoder.decode(inflated)) : decodePayload(inflated);
  }

  if (value.startsWith(RAW_BINARY_PREFIX)) {
    const bytes = base64UrlToBytes(value.slice(1));
    return bytes ? decodePayload(bytes) : null;
  }

  if (value.startsWith(PLAIN_PREFIX)) {
    const bytes = base64UrlToBytes(value.slice(1));
    return fromJson(bytes ? textDecoder.decode(bytes) : null);
  }

  // Links created before compression existed: plain base64url of { v: 1, record }.
  const bytes = base64UrlToBytes(value);
  return fromJson(bytes ? textDecoder.decode(bytes) : null);
}
