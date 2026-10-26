/// <reference types="node" />

import { afterEach, describe, expect, it, vi } from "vitest";
import { route } from "./route";

const ORIGIN = "https://truthcap.app";
const VALID_PAYLOAD = "zVcvBCgFBGMBxFin2oJQDl";

type Command = (string | number)[];

function configureStore(): Command[] {
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com/";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

  const calls: Command[] = [];
  const values = new Map<string, string>([["share:abcd2345", VALID_PAYLOAD]]);
  const hashes = new Map<string, Map<string, string>>();

  const reply = (result: unknown) => new Response(JSON.stringify({ result }), { status: 200 });

  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    const command = JSON.parse(String(init.body)) as Command;
    calls.push(command);

    const [name, ...args] = command;
    const key = String(args[0]);

    if (name === "SET") {
      const [setKey, value, ...options] = args as string[];
      if (options.includes("NX") && values.has(setKey)) return reply(null);
      values.set(setKey, value);
      return reply("OK");
    }

    if (name === "GET") return reply(values.get(key) ?? null);

    if (name === "HSET") {
      const [, field, value] = args as [string, string, string];
      const hash = hashes.get(key) ?? new Map<string, string>();
      hash.set(field, value);
      hashes.set(key, hash);
      return reply(1);
    }

    if (name === "HGETALL") return reply(Object.fromEntries(hashes.get(key) ?? new Map<string, string>()));
    if (name === "EXPIRE") return reply(1);

    return new Response(JSON.stringify({ error: "unexpected" }), {
      status: 500,
    });
  });

  return calls;
}

function post(body: unknown, headers: Record<string, string> = { origin: ORIGIN }): Request {
  return new Request(`${ORIGIN}/api/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  vi.unstubAllGlobals();
});

describe("POST /api/share", () => {
  it("stores the payload under a new short id", async () => {
    const calls = configureStore();

    const response = await route(post({ payload: VALID_PAYLOAD }));
    const body = (await response.json()) as {
      id: string;
      expiresInDays: number;
    };

    expect(response.status).toBe(201);
    expect(body.id).toMatch(/^[23456789abcdefghijkmnpqrstuvwxyz]{8}$/);
    expect(body.expiresInDays).toBe(90);
    expect(calls[0]).toEqual(["SET", `share:${body.id}`, VALID_PAYLOAD, "EX", 7776000, "NX"]);
  });

  it("rejects payloads it cannot store", async () => {
    configureStore();

    expect((await route(post({ payload: "has spaces" }))).status).toBe(400);
    expect((await route(post({ payload: "" }))).status).toBe(400);
    expect((await route(post({ payload: "a".repeat(5000) }))).status).toBe(400);
    expect((await route(post({ nothing: true }))).status).toBe(400);
  });

  it("rejects a body that is not json", async () => {
    configureStore();

    const response = await route(
      new Request(`${ORIGIN}/api/share`, {
        method: "POST",
        headers: { origin: ORIGIN, "Content-Type": "application/json" },
        body: "not json",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("refuses writes from another origin", async () => {
    configureStore();

    const response = await route(post({ payload: VALID_PAYLOAD }, { origin: "https://evil.example" }));

    expect(response.status).toBe(403);
  });

  it("answers 503 when the store is not configured, so the app can fall back", async () => {
    const response = await route(post({ payload: VALID_PAYLOAD }));

    expect(response.status).toBe(503);
  });
});

describe("GET /api/share", () => {
  it("returns the stored payload", async () => {
    const calls = configureStore();

    const response = await route(new Request(`${ORIGIN}/api/share?id=abcd2345`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ payload: VALID_PAYLOAD });
    expect(response.headers.get("cache-control")).toContain("max-age=300");
    expect(calls[0]).toEqual(["GET", "share:abcd2345"]);
  });

  it("answers 404 for an unknown or expired id", async () => {
    configureStore();

    expect((await route(new Request(`${ORIGIN}/api/share?id=wxyz6789`))).status).toBe(404);
  });

  it("rejects ids it would never have issued", async () => {
    const calls = configureStore();

    expect((await route(new Request(`${ORIGIN}/api/share?id=../../etc/passwd`))).status).toBe(400);
    expect((await route(new Request(`${ORIGIN}/api/share?id=abc`))).status).toBe(400);
    expect((await route(new Request(`${ORIGIN}/api/share?id=abcd23456`))).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("answers 503 when the store is not configured", async () => {
    expect((await route(new Request(`${ORIGIN}/api/share?id=abcd2345`))).status).toBe(503);
  });
});

describe("the acknowledgment channel", () => {
  const RECORD = "trc_abc123xyz";
  const WHEN = "2026-10-26T10:00:00.000Z";

  it("records one side and reads it back for the other", async () => {
    const calls = configureStore();

    const written = await route(post({ record: RECORD, party: 0, when: WHEN, code: "ABC123" }));
    expect(written.status).toBe(200);
    expect(calls).toContainEqual(["SET", `code:${RECORD}`, "ABC123", "EX", 7776000]);
    expect(calls).toContainEqual(["HSET", `ack:${RECORD}`, "0", WHEN]);

    const response = await route(new Request(`${ORIGIN}/api/share?record=${RECORD}`));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      acks: [{ party: 0, when: WHEN }],
    });
  });

  it("reads an empty list for a record nobody has confirmed", async () => {
    configureStore();

    const response = await route(new Request(`${ORIGIN}/api/share?record=${RECORD}`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ acks: [] });
  });

  it("refuses a write carrying someone else's code", async () => {
    configureStore();

    await route(post({ record: RECORD, party: 0, when: WHEN, code: "ABC123" }));
    const refused = await route(post({ record: RECORD, party: 1, when: WHEN, code: "WRONG1" }));

    expect(refused.status).toBe(403);
  });

  it("rejects records, parties, times and codes it would never accept", async () => {
    configureStore();

    expect(
      (
        await route(
          post({
            record: "../../etc/passwd",
            party: 0,
            when: WHEN,
            code: "ABC123",
          }),
        )
      ).status,
    ).toBe(400);
    expect((await route(post({ record: RECORD, party: 12, when: WHEN, code: "ABC123" }))).status).toBe(400);
    expect((await route(post({ record: RECORD, party: 1.5, when: WHEN, code: "ABC123" }))).status).toBe(400);
    expect(
      (
        await route(
          post({
            record: RECORD,
            party: 0,
            when: "sometime",
            code: "ABC123",
          }),
        )
      ).status,
    ).toBe(400);
    expect((await route(post({ record: RECORD, party: 0, when: WHEN, code: "short" }))).status).toBe(400);
  });

  it("answers 503 when the store is not configured", async () => {
    expect((await route(new Request(`${ORIGIN}/api/share?record=${RECORD}`))).status).toBe(503);
    expect((await route(post({ record: RECORD, party: 0, when: WHEN, code: "ABC123" }))).status).toBe(503);
  });
});

describe("other methods", () => {
  it("are refused", async () => {
    configureStore();

    const response = await route(new Request(`${ORIGIN}/api/share?id=abcd2345`, { method: "DELETE" }));

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, POST");
  });
});
