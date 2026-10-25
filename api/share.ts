/**
 * Short share links.
 *
 * `POST /api/share` stores an encoded record payload and returns a short id;
 * `GET /api/share?id=…` reads it back. Records expire after 90 days, so a
 * shared link is a copy with a shelf life, not a permanent archive.
 *
 * The payload is the same encoded record the `/shared#…` links use, so nothing
 * here needs to understand the record format — and the long links keep working
 * when this store is unreachable or unconfigured.
 *
 * Storage is Upstash Redis over its REST API: `UPSTASH_REDIS_REST_URL` and
 * `UPSTASH_REDIS_REST_TOKEN`. Without them the endpoint answers 503 and the app
 * falls back to self-contained links.
 */

const ID_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz"; // 32 characters, no lookalikes
const ID_LENGTH = 8;
const TTL_SECONDS = 60 * 60 * 24 * 90;
const MAX_PAYLOAD_LENGTH = 4000;
const PAYLOAD_PATTERN = /^[A-Za-z0-9\-_]+$/;
const ID_PATTERN = new RegExp(`^[${ID_ALPHABET}]{${ID_LENGTH}}$`);

type RedisReply = { result?: unknown } | null;

function makeId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH));

  // 256 is a multiple of the 32-character alphabet, so this stays unbiased.
  return Array.from(bytes, (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join("");
}

/** Upstash Redis speaks a plain JSON command array over HTTP. */
async function redisCommand(command: (string | number)[]): Promise<RedisReply> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });

    if (!response.ok) return null;
    return (await response.json()) as RedisReply;
  } catch {
    return null;
  }
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

/** Browsers always send Origin; without it (curl, tests) the call is allowed. */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "GET") {
    const id = (url.searchParams.get("id") ?? "").trim();

    if (!ID_PATTERN.test(id)) return json(400, { error: "invalid id" });

    const reply = await redisCommand(["GET", `share:${id}`]);

    if (reply === null) return json(503, { error: "short links are not configured" });
    if (typeof reply.result !== "string" || reply.result === "") return json(404, { error: "not found" });

    return json(200, { payload: reply.result }, { "Cache-Control": "public, max-age=300, s-maxage=86400" });
  }

  if (request.method === "POST") {
    if (!isSameOrigin(request)) return json(403, { error: "cross-origin writes are not allowed" });

    let payload: unknown;

    try {
      payload = ((await request.json()) as { payload?: unknown }).payload;
    } catch {
      return json(400, { error: "invalid body" });
    }

    if (typeof payload !== "string" || payload.length === 0 || payload.length > MAX_PAYLOAD_LENGTH || !PAYLOAD_PATTERN.test(payload)) {
      return json(400, { error: "invalid payload" });
    }

    for (let attempt = 0; attempt < 4; attempt++) {
      const id = makeId();
      // NX keeps a rare collision from overwriting someone else's record.
      const reply = await redisCommand(["SET", `share:${id}`, payload, "EX", TTL_SECONDS, "NX"]);

      if (reply === null) return json(503, { error: "short links are not configured" });
      if (reply.result === "OK") return json(201, { id, expiresInDays: TTL_SECONDS / 86400 });
    }

    return json(503, { error: "could not allocate an id" });
  }

  return json(405, { error: "method not allowed" }, { Allow: "GET, POST" });
}
