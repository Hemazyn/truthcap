import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, expect, it } from "vitest";
import { GET, POST } from "./route";

function listen(server: Server): Promise<string> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`));
  });
}

function collect(request: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString("utf8")));
    request.on("end", () => resolve(body));
  });
}

// Stand-in for Upstash: same JSON command array over POST, same RESP-shaped replies.
const values = new Map<string, string>();
const hashes = new Map<string, Map<string, string>>();

let upstash: Server;
let api: Server;
let upstashUrl = "";
let apiUrl = "";

beforeAll(async () => {
  upstash = createServer(async (request: IncomingMessage, response: ServerResponse) => {
    const command = JSON.parse(await collect(request)) as (string | number)[];
    const [name, ...args] = command;
    const key = String(args[0]);
    const send = (result: unknown) => response.end(JSON.stringify({ result }));

    if (name === "SET") {
      const [setKey, value, ...options] = args as string[];
      if (options.includes("NX") && values.has(setKey)) return send(null);
      values.set(setKey, value);
      return send("OK");
    }

    if (name === "GET") return send(values.get(key) ?? null);

    if (name === "HSET") {
      const [, field, value] = args as [string, string, string];
      const hash = hashes.get(key) ?? new Map<string, string>();
      hash.set(field, value);
      hashes.set(key, hash);
      return send(1);
    }

    // Real Redis answers HGETALL with a flat [field, value, …] array.
    if (name === "HGETALL") return send([...(hashes.get(key) ?? new Map<string, string>()).entries()].flat());
    if (name === "EXPIRE") return send(1);

    response.statusCode = 400;
    return response.end(JSON.stringify({ error: "unexpected" }));
  });

  upstashUrl = await listen(upstash);
  process.env.UPSTASH_REDIS_REST_URL = upstashUrl;
  process.env.UPSTASH_REDIS_REST_TOKEN = "smoke-token";

  // What Vercel does: hand the incoming request to the named method export.
  api = createServer(async (request: IncomingMessage, response: ServerResponse) => {
    const body = request.method === "POST" ? await collect(request) : undefined;
    const headers = new Headers();
    if (request.headers["content-type"]) headers.set("content-type", request.headers["content-type"]);
    if (request.headers.origin) headers.set("origin", request.headers.origin);

    const incoming = new Request(new URL(request.url ?? "/", apiUrl), {
      method: request.method,
      headers,
      body,
    });

    const outgoing = request.method === "POST" ? await POST(incoming) : await GET(incoming);
    response.writeHead(outgoing.status, Object.fromEntries(outgoing.headers.entries()));
    response.end(Buffer.from(await outgoing.arrayBuffer()));
  });

  apiUrl = await listen(api);
});

afterAll(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  upstash.close();
  api.close();
});

const json = (body: unknown, headers: Record<string, string> = {}) => ({
  method: "POST",
  headers: { "content-type": "application/json", origin: apiUrl, ...headers },
  body: JSON.stringify(body),
});

it("short link: create, then open on another device", async () => {
  const created = await fetch(`${apiUrl}/api/share`, json({ payload: "zVcvBCgFBGMBxFin2oJQDl" }));

  expect(created.status).toBe(201);
  const { id, expiresInDays } = (await created.json()) as { id: string; expiresInDays: number };
  expect(id).toMatch(/^[23456789abcdefghijkmnpqrstuvwxyz]{8}$/);
  expect(expiresInDays).toBe(90);

  const opened = await fetch(`${apiUrl}/api/share?id=${id}`);

  expect(opened.status).toBe(200);
  expect(await opened.json()).toEqual({ payload: "zVcvBCgFBGMBxFin2oJQDl" });
});

it("acknowledgments cross between the two parties", async () => {
  const record = "trc_smoke123";
  const initiatorWhen = "2026-10-27T09:00:00.000Z";
  const counterpartyWhen = "2026-10-27T09:05:00.000Z";

  expect((await fetch(`${apiUrl}/api/share`, json({ record, party: 0, when: initiatorWhen, code: "ABC123" }))).status).toBe(200);
  // The other device opens the record and sees the initiator's confirmation.
  expect(await (await fetch(`${apiUrl}/api/share?record=${record}`)).json()).toEqual({ acks: [{ party: 0, when: initiatorWhen }] });

  expect((await fetch(`${apiUrl}/api/share`, json({ record, party: 1, when: counterpartyWhen, code: "ABC123" }))).status).toBe(200);
  // The initiator's screen polls and sees both.
  expect(await (await fetch(`${apiUrl}/api/share?record=${record}`)).json()).toEqual({
    acks: [
      { party: 0, when: initiatorWhen },
      { party: 1, when: counterpartyWhen },
    ],
  });

  // A different code cannot write to this record.
  expect((await fetch(`${apiUrl}/api/share`, json({ record, party: 1, when: counterpartyWhen, code: "ZZZ999" }))).status).toBe(403);
});
