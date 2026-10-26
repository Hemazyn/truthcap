import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "./share";

const ORIGIN = "https://truthcap.app";
const VALID_PAYLOAD = "zVcvBCgFBGMBxFin2oJQDl";

type Command = (string | number)[];

function configureStore(): Command[] {
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com/";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

  const calls: Command[] = [];

  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    const command = JSON.parse(String(init.body)) as Command;
    calls.push(command);

    if (command[0] === "SET") return new Response(JSON.stringify({ result: "OK" }), { status: 200 });
    if (command[0] === "GET") return new Response(JSON.stringify({ result: command[1] === "share:abcd2345" ? VALID_PAYLOAD : null }), { status: 200 });

    return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
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

    const response = await handler.fetch(post({ payload: VALID_PAYLOAD }));
    const body = (await response.json()) as { id: string; expiresInDays: number };

    expect(response.status).toBe(201);
    expect(body.id).toMatch(/^[23456789abcdefghijkmnpqrstuvwxyz]{8}$/);
    expect(body.expiresInDays).toBe(90);
    expect(calls[0]).toEqual(["SET", `share:${body.id}`, VALID_PAYLOAD, "EX", 7776000, "NX"]);
  });

  it("rejects payloads it cannot store", async () => {
    configureStore();

    expect((await handler.fetch(post({ payload: "has spaces" }))).status).toBe(400);
    expect((await handler.fetch(post({ payload: "" }))).status).toBe(400);
    expect((await handler.fetch(post({ payload: "a".repeat(5000) }))).status).toBe(400);
    expect((await handler.fetch(post({ nothing: true }))).status).toBe(400);
  });

  it("rejects a body that is not json", async () => {
    configureStore();

    const response = await handler.fetch(
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

    const response = await handler.fetch(post({ payload: VALID_PAYLOAD }, { origin: "https://evil.example" }));

    expect(response.status).toBe(403);
  });

  it("answers 503 when the store is not configured, so the app can fall back", async () => {
    const response = await handler.fetch(post({ payload: VALID_PAYLOAD }));

    expect(response.status).toBe(503);
  });
});

describe("GET /api/share", () => {
  it("returns the stored payload", async () => {
    const calls = configureStore();

    const response = await handler.fetch(new Request(`${ORIGIN}/api/share?id=abcd2345`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ payload: VALID_PAYLOAD });
    expect(response.headers.get("cache-control")).toContain("max-age=300");
    expect(calls[0]).toEqual(["GET", "share:abcd2345"]);
  });

  it("answers 404 for an unknown or expired id", async () => {
    configureStore();

    expect((await handler.fetch(new Request(`${ORIGIN}/api/share?id=wxyz6789`))).status).toBe(404);
  });

  it("rejects ids it would never have issued", async () => {
    const calls = configureStore();

    expect((await handler.fetch(new Request(`${ORIGIN}/api/share?id=../../etc/passwd`))).status).toBe(400);
    expect((await handler.fetch(new Request(`${ORIGIN}/api/share?id=abc`))).status).toBe(400);
    expect((await handler.fetch(new Request(`${ORIGIN}/api/share?id=abcd23456`))).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("answers 503 when the store is not configured", async () => {
    expect((await handler.fetch(new Request(`${ORIGIN}/api/share?id=abcd2345`))).status).toBe(503);
  });
});

describe("other methods", () => {
  it("are refused", async () => {
    configureStore();

    const response = await handler.fetch(new Request(`${ORIGIN}/api/share?id=abcd2345`, { method: "DELETE" }));

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, POST");
  });
});
