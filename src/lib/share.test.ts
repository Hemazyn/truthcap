import { describe, expect, it } from "vitest";
import { decodeRecord, encodeRecord } from "./share";
import type { TruthCapture } from "@/types/truth";

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

    expect(encoded.startsWith("z")).toBe(true);
    expect(encoded.length).toBeLessThan(legacy.length * 0.6);
  });

  it("still opens links made before compression", async () => {
    expect(await decodeRecord(legacyLink(capture))).toEqual(capture);
  });

  it("rejects truncated or invalid payloads", async () => {
    const encoded = await encodeRecord(capture);

    expect(await decodeRecord("")).toBeNull();
    expect(await decodeRecord("not a payload")).toBeNull();
    expect(await decodeRecord("1234")).toBeNull();
    expect(await decodeRecord(encoded.slice(0, 30))).toBeNull();
    expect(await decodeRecord(encoded.slice(0, -6))).toBeNull();
    expect(await decodeRecord(`z${"a".repeat(40)}`)).toBeNull();
  });
});
