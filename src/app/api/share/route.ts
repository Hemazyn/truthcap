/// <reference types="node" />

// ── constants
const ID_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";
const ID_LENGTH = 8;
const TTL_SECONDS = 60 * 60 * 24 * 90;
const MAX_PAYLOAD_LENGTH = 4000;
const PAYLOAD_PATTERN = /^[A-Za-z0-9\-_]+$/;
const ID_PATTERN = new RegExp(`^[${ID_ALPHABET}]{${ID_LENGTH}}$`);
const RECORD_PATTERN = /^trc_[A-Za-z0-9\-_]{1,64}$/;
const CODE_PATTERN = /^[A-Za-z0-9]{6}$/;
/** The payload allows up to 12 parties on a record. */
const MAX_PARTY = 11;
const MAX_WHEN_LENGTH = 40;

// ── types
type RedisReply = { result?: unknown } | null;
type Body = Record<string, unknown>;

// ── Next.js edge runtime
// Runs at the Edge so crypto.getRandomValues and fetch are native.
export const runtime = "edge";

// ── helpers
function ackKey(record: string): string {
  return `ack:${record}`;
}

function codeKey(record: string): string {
  return `code:${record}`;
}

function makeId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH));
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
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
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

/** `HGETALL` answers with a field → value map; anything else reads as empty. */
function readAcks(reply: RedisReply): { party: number; when: string }[] {
  const entries = reply?.result && typeof reply.result === "object" && !Array.isArray(reply.result) ? (reply.result as Record<string, unknown>) : {};

  return Object.entries(entries)
    .map(([party, when]) => ({
      party: Number(party),
      when: typeof when === "string" ? when : "",
    }))
    .filter((ack) => Number.isInteger(ack.party) && ack.party >= 0 && ack.party <= MAX_PARTY && ack.when.length > 0 && ack.when.length <= MAX_WHEN_LENGTH && Number.isFinite(Date.parse(ack.when)))
    .sort((left, right) => left.party - right.party);
}

// ── domain logic (unchanged)
async function readRecordAcks(record: string): Promise<Response> {
  const reply = await redisCommand(["HGETALL", ackKey(record)]);

  if (reply === null) return json(503, { error: "acknowledgments are not configured" });
  return json(200, { acks: readAcks(reply) }, { "Cache-Control": "no-store" });
}

async function writeAck(body: Body): Promise<Response> {
  const record = typeof body.record === "string" ? body.record.trim() : "";
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const when = typeof body.when === "string" ? body.when.trim() : "";
  const party = typeof body.party === "number" ? body.party : Number.NaN;

  if (!RECORD_PATTERN.test(record)) return json(400, { error: "invalid record" });
  if (!Number.isInteger(party) || party < 0 || party > MAX_PARTY) return json(400, { error: "invalid party" });
  if (when.length === 0 || when.length > MAX_WHEN_LENGTH || !Number.isFinite(Date.parse(when))) return json(400, { error: "invalid time" });
  if (!CODE_PATTERN.test(code)) return json(400, { error: "invalid code" });

  const stored = await redisCommand(["GET", codeKey(record)]);
  if (stored === null) return json(503, { error: "acknowledgments are not configured" });

  const known = typeof stored.result === "string" ? stored.result.trim().toUpperCase() : "";
  if (known && known !== code) return json(403, { error: "code does not match" });

  if (!known) {
    const pinned = await redisCommand(["SET", codeKey(record), code, "EX", TTL_SECONDS]);
    if (pinned === null) return json(503, { error: "acknowledgments are not configured" });
  }

  const written = await redisCommand(["HSET", ackKey(record), String(party), when]);
  if (written === null) return json(503, { error: "acknowledgments are not configured" });

  await redisCommand(["EXPIRE", ackKey(record), TTL_SECONDS]);
  return json(200, { ok: true });
}

async function storePayload(payload: unknown): Promise<Response> {
  if (typeof payload !== "string" || payload.length === 0 || payload.length > MAX_PAYLOAD_LENGTH || !PAYLOAD_PATTERN.test(payload)) {
    return json(400, { error: "invalid payload" });
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    const id = makeId();
    const reply = await redisCommand(["SET", `share:${id}`, payload, "EX", TTL_SECONDS, "NX"]);

    if (reply === null) return json(503, { error: "short links are not configured" });
    if (reply.result === "OK") return json(201, { id, expiresInDays: TTL_SECONDS / 86400 });
  }

  return json(503, { error: "could not allocate an id" });
}

// ── internal router (unchanged)
async function route(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "GET") {
    const record = (url.searchParams.get("record") ?? "").trim();

    if (record) {
      if (!RECORD_PATTERN.test(record)) return json(400, { error: "invalid record" });
      return readRecordAcks(record);
    }

    const id = (url.searchParams.get("id") ?? "").trim();

    if (!ID_PATTERN.test(id)) return json(400, { error: "invalid id" });

    const reply = await redisCommand(["GET", `share:${id}`]);

    if (reply === null) return json(503, { error: "short links are not configured" });
    if (typeof reply.result !== "string" || reply.result === "") return json(404, { error: "not found" });

    return json(
      200,
      { payload: reply.result },
      {
        "Cache-Control": "public, max-age=300, s-maxage=86400",
      },
    );
  }

  if (request.method === "POST") {
    if (!isSameOrigin(request)) return json(403, { error: "cross-origin writes are not allowed" });

    let body: Body;

    try {
      body = (await request.json()) as Body;
    } catch {
      return json(400, { error: "invalid body" });
    }

    if (!body || typeof body !== "object") return json(400, { error: "invalid body" });

    return body.payload === undefined ? writeAck(body) : storePayload(body.payload);
  }

  return json(405, { error: "method not allowed" }, { Allow: "GET, POST" });
}

// ── Next.js App Router exports
// These replace the old Cloudflare Workers `export default { fetch }`.
export async function GET(request: Request): Promise<Response> {
  return route(request);
}

export async function POST(request: Request): Promise<Response> {
  return route(request);
}

export { route };
