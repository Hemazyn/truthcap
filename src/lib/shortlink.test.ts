import { afterEach, describe, expect, it, vi } from "vitest";
import { createShortLink, fetchSharedPayload } from "./shortlink";
import { shareLinkFor } from "./records";
import type { TruthCapture } from "@/types/truth";

const capture: TruthCapture = {
  id: "trc_abc12345",
  templateId: "item-condition-agreement",
  title: "Item condition agreed",
  status: "pending",
  createdAt: "2026-10-24T09:00:00.000Z",
  initiator: "Ada",
  accessCode: "K7M2QP",
  parties: [
    { role: "Person handing over the item", name: "Ada", contact: "" },
    { role: "Person receiving the item", name: "Bola", contact: "" },
  ],
  values: { currency: "NGN", item: "Laptop", condition: "good", price: 50000, date: "2026-10-22" },
  acknowledgment: null,
};

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function stubOrigin(): void {
  vi.stubGlobal("window", { location: { origin: "https://truthcap.app" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("short links", () => {
  it("returns the short link the api allocates", async () => {
    stubOrigin();
    const fetchMock = vi.fn(async () => jsonResponse(201, { id: "ab23cd45" }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await createShortLink("zabc")).toBe("https://truthcap.app/s/ab23cd45");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/share");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ payload: "zabc" });
  });

  it("returns null when the store is unavailable or unconfigured", async () => {
    stubOrigin();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(503, { error: "not configured" })),
    );

    expect(await createShortLink("zabc")).toBeNull();
  });

  it("survives a network failure", async () => {
    stubOrigin();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );

    expect(await createShortLink("zabc")).toBeNull();
  });

  it("ignores ids it did not expect", async () => {
    stubOrigin();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(201, { id: "not-an-id" })),
    );

    expect(await createShortLink("zabc")).toBeNull();
  });

  it("reads a stored payload back and rejects unknown links quietly", async () => {
    stubOrigin();
    const fetchMock = vi.fn(async (url: string) => (url.includes("abcd2345") ? jsonResponse(200, { payload: "zstored" }) : jsonResponse(404, { error: "not found" })));
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchSharedPayload("abcd2345")).toBe("zstored");
    expect(await fetchSharedPayload("wxyz6789")).toBeNull();
  });

  it("does not call the api for malformed ids", async () => {
    stubOrigin();
    const fetchMock = vi.fn(async () => jsonResponse(200, { payload: "zstored" }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchSharedPayload("../etc/passwd")).toBeNull();
    expect(await fetchSharedPayload("short")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("share links", () => {
  it("prefers a short link when the record can be stored", async () => {
    stubOrigin();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(201, { id: "ab23cd45" })),
    );

    const link = await shareLinkFor(capture);

    expect(link).toEqual({ url: "https://truthcap.app/s/ab23cd45", viaServer: true });
  });

  it("falls back to the self-contained link when storing fails", async () => {
    stubOrigin();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(503, { error: "not configured" })),
    );

    const link = await shareLinkFor(capture);

    expect(link.viaServer).toBe(false);
    expect(link.url.startsWith("https://truthcap.app/shared#")).toBe(true);
    expect(link.url.length).toBeGreaterThan(60);
  });
});
