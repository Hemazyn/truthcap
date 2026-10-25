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

/**
 * The same short-link contract as `api/share.ts`, kept in memory.
 *
 * `npm run dev` has no serverless functions, and short links are the default
 * way to share, so without this every local link would fall back to the long
 * self-contained form. Nothing is persisted: restarting the dev server clears it.
 */
function devShareApi(): Plugin {
  const store = new Map<string, { payload: string; expiresAt: number }>();

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

  return {
    name: "truthcap-dev-share-api",
    configureServer(server) {
      server.middlewares.use("/api/share", async (request, response) => {
        const url = new URL(request.url ?? "/", "http://localhost");

        if (request.method === "GET") {
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

        let payload: unknown;
        try {
          payload = (JSON.parse(await readBody(request)) as { payload?: unknown }).payload;
        } catch {
          reply(response, 400, { error: "invalid body" });
          return;
        }

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
