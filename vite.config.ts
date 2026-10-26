import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

const ID_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";
const ID_LENGTH = 8;
const TTL_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_PAYLOAD_LENGTH = 4000;
const PAYLOAD_PATTERN = /^[A-Za-z0-9\-_]+$/;
const RECORD_PATTERN = /^trc_[A-Za-z0-9\-_]{1,64}$/;
const CODE_PATTERN = /^[A-Za-z0-9]{6}$/;
const MAX_ACK_PARTY = 11;
const MAX_WHEN_LENGTH = 40;

/**
 * The same short-link contract as `api/share.ts`, kept in memory — including the
 * acknowledgment channel both devices read and write.
 *
 * `npm run dev` has no serverless functions, and short links are the default
 * way to share, so without this every local link would fall back to the long
 * self-contained form. Nothing is persisted: restarting the dev server clears it.
 */
function devShareApi(): Plugin {
  const store = new Map<string, { payload: string; expiresAt: number }>();
  const acks = new Map<string, { values: Map<number, string>; expiresAt: number }>();
  const codes = new Map<string, { code: string; expiresAt: number }>();

  const reply = (response: ServerResponse, status: number, body: unknown) => {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(body));
  };

  const readBody = (request: IncomingMessage) =>
    new Promise<string>((resolve, reject) => {
      let body = "";
      request.on("data", (chunk: Buffer) => {
        body += chunk.toString("utf8");
      });
      request.on("end", () => resolve(body));
      request.on("error", reject);
    });

  /** One acknowledgment write, validated the way `api/share.ts` validates it. */
  const writeAck = (body: Record<string, unknown>) => {
    const record = typeof body.record === "string" ? body.record.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const when = typeof body.when === "string" ? body.when.trim() : "";
    const party = typeof body.party === "number" ? body.party : Number.NaN;

    if (!RECORD_PATTERN.test(record)) return { status: 400, body: { error: "invalid record" } };
    if (!Number.isInteger(party) || party < 0 || party > MAX_ACK_PARTY) return { status: 400, body: { error: "invalid party" } };
    if (when.length === 0 || when.length > MAX_WHEN_LENGTH || !Number.isFinite(Date.parse(when))) return { status: 400, body: { error: "invalid time" } };
    if (!CODE_PATTERN.test(code)) return { status: 400, body: { error: "invalid code" } };

    const known = codes.get(record);
    if (known && known.expiresAt < Date.now()) codes.delete(record);

    const pinned = codes.get(record)?.code;
    if (pinned && pinned !== code) return { status: 403, body: { error: "code does not match" } };
    if (!pinned) codes.set(record, { code, expiresAt: Date.now() + TTL_MS });

    const held = acks.get(record);
    if (held && held.expiresAt < Date.now()) acks.delete(record);

    const values = acks.get(record)?.values ?? new Map<number, string>();
    values.set(party, when);
    acks.set(record, { values, expiresAt: Date.now() + TTL_MS });

    return { status: 200, body: { ok: true } };
  };

  return {
    name: "truthcap-dev-share-api",
    configureServer(server) {
      server.middlewares.use("/api/share", async (request, response) => {
        const url = new URL(request.url ?? "/", "http://localhost");

        if (request.method === "GET") {
          const record = (url.searchParams.get("record") ?? "").trim();

          if (record) {
            if (!RECORD_PATTERN.test(record)) {
              reply(response, 400, { error: "invalid record" });
              return;
            }

            const held = acks.get(record);
            if (held && held.expiresAt < Date.now()) acks.delete(record);

            const values = acks.get(record)?.values ?? new Map<number, string>();
            const list = [...values.entries()].map(([party, when]) => ({ party, when })).sort((left, right) => left.party - right.party);

            reply(response, 200, { acks: list });
            return;
          }

          const id = url.searchParams.get("id") ?? "";
          const entry = store.get(id);

          if (!entry || entry.expiresAt < Date.now()) {
            store.delete(id);
            reply(response, 404, { error: "not found" });
            return;
          }

          reply(response, 200, { payload: entry.payload });
          return;
        }

        if (request.method !== "POST") {
          reply(response, 405, { error: "method not allowed" });
          return;
        }

        let body: Record<string, unknown>;

        try {
          body = JSON.parse(await readBody(request)) as Record<string, unknown>;
        } catch {
          reply(response, 400, { error: "invalid body" });
          return;
        }

        // A body without a payload is an acknowledgment; with one it stores a link.
        if (body && typeof body === "object" && body.payload === undefined) {
          const result = writeAck(body);
          reply(response, result.status, result.body);
          return;
        }

        const payload: unknown = body?.payload;

        if (typeof payload !== "string" || payload.length === 0 || payload.length > MAX_PAYLOAD_LENGTH || !PAYLOAD_PATTERN.test(payload)) {
          reply(response, 400, { error: "invalid payload" });
          return;
        }

        let id = Array.from(randomBytes(ID_LENGTH), (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join("");
        while (store.has(id)) {
          id = Array.from(randomBytes(ID_LENGTH), (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join("");
        }

        store.set(id, { payload, expiresAt: Date.now() + TTL_MS });
        reply(response, 201, { id, expiresInDays: TTL_MS / 86_400_000 });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devShareApi()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
