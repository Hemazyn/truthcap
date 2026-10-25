import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeRecord, encodeRecord } from "./share";
import type { TruthCapture } from "@/types/truth";

afterEach(() => {
  vi.unstubAllGlobals();
});

const capture: TruthCapture = {
  id: "trc_abc12345",
  templateId: "item-condition-agreement",
  title: "Item condition agreed",
  status: "pending",
  createdAt: "2026-10-24T09:00:00.000Z",
  initiator: "Chinaza",
  accessCode: "K7M2QP",
  parties: [
    { role: "Person handing over the item", name: "Chinaza", contact: "0803 000 0000", acknowledged: undefined },
    { role: "Person receiving the item", name: "Tunde", contact: "", acknowledged: undefined },
  ],
  values: {
    currency: "NGN",
    item: "MacBook Air M1",
    condition: "good",
    price: 420000,
    date: "2026-10-22",
    photos: true,
    notes: "Battery cycle count 210 — as agreed on the day.",
  },
  acknowledgment: null,
};

/** Links produced before compression existed (plain base64url of the payload). */
function legacyLink(record: TruthCapture): string {
  const json = JSON.stringify({ v: 1, record });
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

describe("share link encoding", () => {
  it("round-trips the record", async () => {
    expect(await decodeRecord(await encodeRecord(capture))).toEqual(capture);
  });

  it("keeps acknowledgments", async () => {
    const acknowledged: TruthCapture = {
      ...capture,
      status: "acknowledged",
      parties: capture.parties.map((party) => ({ ...party, acknowledged: "2026-10-24T10:00:00.000Z" })),
      acknowledgment: { who: "Tunde", when: "2026-10-24T10:00:00.000Z", method: "code" },
    };

    expect(await decodeRecord(await encodeRecord(acknowledged))).toEqual(acknowledged);
  });

  it("survives non-latin names and emoji", async () => {
    const unicode: TruthCapture = {
      ...capture,
      parties: [
        { role: "Seller", name: "Олег 🚲", contact: "", acknowledged: undefined },
        { role: "Buyer", name: " Amina ", contact: "", acknowledged: undefined },
      ],
    };

    expect(await decodeRecord(await encodeRecord(unicode))).toEqual(unicode);
  });

  it("produces a url-safe payload", async () => {
    expect(await encodeRecord(capture)).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it("is much shorter than the uncompressed link", async () => {
    const encoded = await encodeRecord(capture);
    const legacy = legacyLink(capture);

    expect(encoded.length).toBeLessThan(legacy.length * 0.35);
    // Short enough that the whole link stays comfortably a QR code.
    expect(encoded.length).toBeLessThan(240);
  });

  it("keeps edited party roles", async () => {
    const customRoles: TruthCapture = {
      ...capture,
      parties: [
        { role: "Seller", name: "Chinaza", contact: "" },
        { role: "Buyer", name: "Tunde", contact: "" },
      ],
    };

    expect(await decodeRecord(await encodeRecord(customRoles))).toEqual(customRoles);
  });

  it("falls back to an uncompressed payload without CompressionStream", async () => {
    vi.stubGlobal("CompressionStream", undefined);
    const encoded = await encodeRecord(capture);
    vi.unstubAllGlobals();

    expect(encoded.startsWith("b")).toBe(true);
    expect(await decodeRecord(encoded)).toEqual(capture);
  });

  it("decodes a payload that was deflated but not compressed as JSON", async () => {
    const stream = new Blob([JSON.stringify({ v: 1, record: capture })]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    const deflated = new Uint8Array(await new Response(stream).arrayBuffer());
    const binary = Array.from(deflated, (byte) => String.fromCharCode(byte)).join("");
    const encoded = `z${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;

    expect(await decodeRecord(encoded)).toEqual(capture);
  });

  it("still opens links made before compression", async () => {
    expect(await decodeRecord(legacyLink(capture))).toEqual(capture);
  });

  it("rejects truncated, tampered or invalid payloads", async () => {
    const encoded = await encodeRecord(capture);

    expect(await decodeRecord("")).toBeNull();
    expect(await decodeRecord("not a payload")).toBeNull();
    expect(await decodeRecord("1234")).toBeNull();
    expect(await decodeRecord(encoded.slice(0, 30))).toBeNull();
    expect(await decodeRecord(encoded.slice(0, -6))).toBeNull();
    expect(await decodeRecord(`z${"a".repeat(40)}`)).toBeNull();
    expect(await decodeRecord(`b${"A".repeat(60)}`)).toBeNull();
  });
});
