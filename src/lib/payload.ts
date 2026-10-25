import { TEMPLATES } from "@/data/templates";
import type { TruthCapture, TruthField, TruthStatus, TruthTemplate } from "@/types/truth";

/**
 * A binary record payload.
 *
 * Share links carry the whole record, so every byte in the payload is a
 * character someone has to send. JSON spends its length on key names, ISO
 * timestamps and repeating the template's own party roles; this layout stores
 * the template as an index, times as milliseconds varints, dates as three
 * bytes, choices as the option they point at, and leaves out everything the
 * template already knows. Deflate still runs on top (see `share.ts`).
 *
 * Layout (all numbers are unsigned LEB128 varints unless noted):
 *
 *   byte    version
 *   byte    flags
 *   byte    template index
 *   byte    status index
 *   varint  createdAt (epoch ms)
 *   string  id
 *   [4]     access code, only when HAS_CODE
 *   string  initiator, only when HAS_INITIATOR
 *   string  acknowledgment who } only when HAS_ACK
 *   varint  acknowledgment when  }
 *   byte    acknowledgment method }
 *   varint  party count
 *   per party: [string role, only when CUSTOM_ROLES] string name, string contact, varint acknowledged (0 = none)
 *   [n/8]   which template fields carry a value
 *   per present field, in template order: the value for that field type
 *   varint  count of values whose key is not in the template (stale records), then per value:
 *           string key, byte kind, payload
 */

const VERSION = 3;

const FLAG_HAS_CODE = 0x01;
const FLAG_HAS_INITIATOR = 0x02;
const FLAG_HAS_ACK = 0x04;
const FLAG_CUSTOM_ROLES = 0x08;

const STATUSES: TruthStatus[] = ["draft", "pending", "acknowledged", "expired", "revoked"];
const ACK_METHODS: ("link" | "code" | null)[] = [null, "link", "code"];
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_TEXT_LENGTH = 4000;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

class DecodeError extends Error {}

class ByteWriter {
  private buffer = new Uint8Array(192);
  private length = 0;

  private ensure(size: number): void {
    if (this.length + size <= this.buffer.length) return;

    let capacity = this.buffer.length * 2;
    while (capacity < this.length + size) capacity *= 2;

    const grown = new Uint8Array(capacity);
    grown.set(this.buffer.subarray(0, this.length));
    this.buffer = grown;
  }

  byte(value: number): void {
    this.ensure(1);
    this.buffer[this.length] = value & 0xff;
    this.length += 1;
  }

  /** Division, not shifts: timestamps in ms are larger than 32 bits. */
  varint(value: number): void {
    let remaining = Math.max(0, Math.floor(value));

    while (remaining >= 0x80) {
      this.byte((remaining % 0x80) | 0x80);
      remaining = Math.floor(remaining / 0x80);
    }

    this.byte(remaining);
  }

  float(value: number): void {
    this.ensure(8);
    new DataView(this.buffer.buffer).setFloat64(this.length, value, true);
    this.length += 8;
  }

  string(value: string): void {
    const bytes = textEncoder.encode(value);
    this.varint(bytes.length);
    this.ensure(bytes.length);
    this.buffer.set(bytes, this.length);
    this.length += bytes.length;
  }

  bytes(value: Uint8Array): void {
    this.ensure(value.length);
    this.buffer.set(value, this.length);
    this.length += value.length;
  }

  finish(): Uint8Array {
    return this.buffer.slice(0, this.length);
  }
}

class ByteReader {
  private offset = 0;

  constructor(private readonly bytes: Uint8Array) {}

  byte(): number {
    if (this.offset >= this.bytes.length) throw new DecodeError("truncated");
    const value = this.bytes[this.offset];
    this.offset += 1;
    return value;
  }

  varint(): number {
    let result = 0;
    let factor = 1;

    for (let index = 0; index < 8; index++) {
      const byte = this.byte();
      result += (byte & 0x7f) * factor;
      if ((byte & 0x80) === 0) return result;
      factor *= 128;
    }

    throw new DecodeError("varint too long");
  }

  float(): number {
    if (this.offset + 8 > this.bytes.length) throw new DecodeError("truncated");
    const value = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.offset, 8).getFloat64(0, true);
    this.offset += 8;
    return value;
  }

  string(): string {
    const length = this.varint();
    if (length > MAX_TEXT_LENGTH || this.offset + length > this.bytes.length) throw new DecodeError("bad string");

    const value = textDecoder.decode(this.bytes.subarray(this.offset, this.offset + length));
    this.offset += length;
    return value;
  }

  atEnd(): boolean {
    return this.offset >= this.bytes.length;
  }
}

function packCode(code: string): Uint8Array | null {
  const packed = new Uint8Array(4);
  let bits = 0;

  for (const char of code.slice(0, 6).toUpperCase()) {
    const index = CODE_ALPHABET.indexOf(char);
    if (index < 0) return null;

    bits = bits * 32 + index;
  }

  packed[0] = Math.floor(bits / 2 ** 24) & 0xff;
  packed[1] = Math.floor(bits / 2 ** 16) & 0xff;
  packed[2] = Math.floor(bits / 2 ** 8) & 0xff;
  packed[3] = bits & 0xff;

  return packed;
}

function unpackCode(reader: ByteReader): string {
  const packed = [reader.byte(), reader.byte(), reader.byte(), reader.byte()];
  let bits = 0;
  for (const byte of packed) bits = bits * 256 + byte;

  let code = "";
  for (let index = 5; index >= 0; index--) {
    code += CODE_ALPHABET[Math.floor(bits / 32 ** index) % 32];
  }

  return code;
}

function toMillis(iso: string | null | undefined): number {
  if (!iso) return 0;
  const time = Date.parse(iso);
  return Number.isFinite(time) ? time : 0;
}

function fromMillis(value: number): string | undefined {
  return value > 0 ? new Date(value).toISOString() : undefined;
}

function fieldHasValue(value: TruthCapture["values"][string]): boolean {
  return value !== "" && value !== null && value !== undefined;
}

/** Values saved under keys the current template no longer has, kept as-is. */
function writeLooseValue(writer: ByteWriter, value: TruthCapture["values"][string]): void {
  if (typeof value === "boolean") {
    writer.byte(value ? 3 : 4);
    return;
  }

  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    writer.byte(1);
    writer.varint(value);
    return;
  }

  if (typeof value === "number") {
    writer.byte(2);
    writer.float(value);
    return;
  }

  writer.byte(0);
  writer.string(String(value));
}

function readLooseValue(reader: ByteReader): TruthCapture["values"][string] {
  switch (reader.byte()) {
    case 0:
      return reader.string();
    case 1:
      return reader.varint();
    case 2:
      return reader.float();
    case 3:
      return true;
    case 4:
      return false;
    default:
      throw new DecodeError("unknown value kind");
  }
}

function writeValue(writer: ByteWriter, field: TruthField, value: TruthCapture["values"][string]): void {
  switch (field.type) {
    case "boolean": {
      // 0 = yes, 1 = no, 2 = the stored value was not a boolean after all.
      if (typeof value === "boolean") {
        writer.byte(value ? 0 : 1);
        return;
      }
      writer.byte(2);
      writer.string(String(value));
      return;
    }

    case "date": {
      const match = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;

      if (match) {
        const year = Number(match[1]);
        if (year >= 2000 && year <= 2255) {
          writer.byte(year - 2000);
          writer.byte(Number(match[2]));
          writer.byte(Number(match[3]));
          return;
        }
      }

      // Month 0 cannot occur in a real date, so it marks a literal string.
      writer.byte(0);
      writer.byte(0);
      writer.byte(0);
      writer.string(typeof value === "string" ? value : String(value));
      return;
    }

    case "amount": {
      if (typeof value === "number" && Number.isFinite(value)) {
        if (Number.isInteger(value) && value >= 0) {
          writer.byte(0);
          writer.varint(value);
          return;
        }
        writer.byte(1);
        writer.float(value);
        return;
      }
      writer.byte(2);
      writer.string(String(value));
      return;
    }

    case "select": {
      // Option values like "damaged-working" cost one byte as an index.
      const index = typeof value === "string" ? (field.options?.findIndex((option) => option.value === value) ?? -1) : -1;

      if (index >= 0) {
        writer.varint(index + 1);
        return;
      }

      writer.varint(0);
      writer.string(typeof value === "string" ? value : String(value));
      return;
    }

    default:
      writer.string(typeof value === "string" ? value : String(value));
  }
}

function readValue(reader: ByteReader, field: TruthField): TruthCapture["values"][string] {
  switch (field.type) {
    case "boolean": {
      const kind = reader.byte();
      if (kind === 0) return true;
      if (kind === 1) return false;
      return reader.string();
    }

    case "date": {
      const year = reader.byte();
      const month = reader.byte();
      const day = reader.byte();

      if (month === 0) return reader.string();

      const pad = (value: number) => String(value).padStart(2, "0");
      return `${2000 + year}-${pad(month)}-${pad(day)}`;
    }

    case "amount": {
      const kind = reader.byte();
      if (kind === 0) return reader.varint();
      if (kind === 1) return reader.float();
      return reader.string();
    }

    case "select": {
      const index = reader.varint();
      if (index === 0) return reader.string();

      const option = field.options?.[index - 1];
      if (!option) throw new DecodeError("unknown option");
      return option.value;
    }

    default:
      return reader.string();
  }
}

export function encodePayload(capture: TruthCapture, template: TruthTemplate): Uint8Array | null {
  const writer = new ByteWriter();
  const code = capture.accessCode ? packCode(capture.accessCode) : null;
  const firstPartyName = capture.parties[0]?.name?.trim() ?? "";
  const initiator = capture.initiator ?? "";
  const customRoles = capture.parties.some((party, index) => party.role !== template.defaultParties[index]?.role);
  const statusIndex = STATUSES.indexOf(capture.status);

  if (statusIndex < 0) return null;

  const flags = (code ? FLAG_HAS_CODE : 0) | (initiator && initiator !== firstPartyName ? FLAG_HAS_INITIATOR : 0) | (capture.acknowledgment ? FLAG_HAS_ACK : 0) | (customRoles ? FLAG_CUSTOM_ROLES : 0);

  writer.byte(VERSION);
  writer.byte(flags);
  writer.byte(TEMPLATES.indexOf(template));
  writer.byte(statusIndex);
  writer.varint(toMillis(capture.createdAt));
  writer.string(capture.id);

  if (code) writer.bytes(code);
  if (flags & FLAG_HAS_INITIATOR) writer.string(initiator);

  if (capture.acknowledgment) {
    writer.string(capture.acknowledgment.who ?? "");
    writer.varint(toMillis(capture.acknowledgment.when));
    writer.byte(Math.max(0, ACK_METHODS.indexOf(capture.acknowledgment.method)));
  }

  writer.varint(capture.parties.length);

  capture.parties.forEach((party, index) => {
    if (customRoles) writer.string(party.role ?? template.defaultParties[index]?.role ?? "");
    writer.string(party.name ?? "");
    writer.string(party.contact ?? "");
    writer.varint(toMillis(party.acknowledged));
  });

  const present = template.fields.map((field) => fieldHasValue(capture.values[field.key]));
  const bitBytes = Math.ceil(present.length / 8);

  for (let index = 0; index < bitBytes; index++) {
    let bits = 0;
    for (let bit = 0; bit < 8; bit++) {
      if (present[index * 8 + bit]) bits |= 1 << bit;
    }
    writer.byte(bits);
  }

  template.fields.forEach((field, index) => {
    if (present[index]) writeValue(writer, field, capture.values[field.key]);
  });

  const known = new Set(template.fields.map((field) => field.key));
  const loose = Object.entries(capture.values).filter(([key, value]) => !known.has(key) && fieldHasValue(value));

  writer.varint(loose.length);
  loose.forEach(([key, value]) => {
    writer.string(key);
    writeLooseValue(writer, value);
  });

  return writer.finish();
}

export function decodePayload(bytes: Uint8Array): TruthCapture | null {
  try {
    const reader = new ByteReader(bytes);

    if (reader.byte() !== VERSION) return null;

    const flags = reader.byte();
    const template = TEMPLATES[reader.byte()];
    const status = STATUSES[reader.byte()];

    if (!template || !status) return null;

    const createdAt = fromMillis(reader.varint());
    if (!createdAt) return null;

    const id = reader.string();
    if (!id) return null;

    const accessCode = flags & FLAG_HAS_CODE ? unpackCode(reader) : null;
    const initiator = flags & FLAG_HAS_INITIATOR ? reader.string() : "";

    let acknowledgment: TruthCapture["acknowledgment"] = null;
    if (flags & FLAG_HAS_ACK) {
      const who = reader.string();
      const when = fromMillis(reader.varint()) ?? null;
      const method = ACK_METHODS[reader.byte()] ?? null;
      acknowledgment = { who, when, method };
    }

    const partyCount = reader.varint();
    if (partyCount > 12) return null;

    const customRoles = Boolean(flags & FLAG_CUSTOM_ROLES);
    const parties: TruthCapture["parties"] = [];

    for (let index = 0; index < partyCount; index++) {
      const role = customRoles ? reader.string() : (template.defaultParties[index]?.role ?? "");
      const name = reader.string();
      const contact = reader.string();
      const acknowledged = fromMillis(reader.varint());

      parties.push({ role, name, contact, acknowledged });
    }

    const bitBytes = Math.ceil(template.fields.length / 8);
    const present: boolean[] = [];

    for (let index = 0; index < bitBytes; index++) {
      const bits = reader.byte();
      for (let bit = 0; bit < 8; bit++) {
        present[index * 8 + bit] = Boolean(bits & (1 << bit));
      }
    }

    const values: TruthCapture["values"] = {};

    template.fields.forEach((field, index) => {
      if (present[index]) values[field.key] = readValue(reader, field);
    });

    const looseCount = reader.varint();
    if (looseCount > 40) return null;

    for (let index = 0; index < looseCount; index++) {
      const key = reader.string();
      values[key] = readLooseValue(reader);
    }

    if (!reader.atEnd()) return null;

    return {
      id,
      templateId: template.id,
      // Titles are never edited, so they are rebuilt from the template.
      title: template.title,
      status,
      createdAt,
      initiator: initiator || parties[0]?.name?.trim() || "The initiator",
      accessCode,
      parties,
      values,
      acknowledgment,
    };
  } catch {
    return null;
  }
}
