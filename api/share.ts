/**
 * Short share links, and the acknowledgment channel that runs beside them.
 *
 * `POST /api/share` with a `payload` stores an encoded record and returns a
 * short id; `GET /api/share?id=…` reads it back. Records expire after 90 days,
 * so a shared link is a copy with a shelf life, not a permanent archive.
 *
 * The two people who hold a record are on different devices with nothing
 * between them, so their acknowledgments travel through this same store:
 * `POST /api/share` with `{ record, party, when, code }` records that one side
 * has confirmed, and `GET /api/share?record=…` reads the set back. Entries are
 * keyed by the record id both sides already decode out of the payload, which
 * keeps the channel working whether the payload arrived as a short link or
 * inside a `#…` link, and the store still never has to understand the record
 * format — it holds a party index, a timestamp, and the six-character code that
 * gates the record (the payload sitting next to it carries the same code, so
 * checking it keeps out anyone who only guessed a record id without pretending
 * the store is anything but a bearer store).
 *
 * Storage is Upstash Redis over its REST API: `UPSTASH_REDIS_REST_URL` and
 * UPSTASH_REDIS_REST_TOKEN`. Without them the endpoint answers 503, short links
 * fall back to self-contained links, and acknowledgment state simply stays on
 * each device as it did before.
 */

const ID_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz"; // 32 characters, no lookalikes
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

type RedisReply = { result?: unknown } | null;
type Body = Record<string, unknown>;

function ackKey(record: string): string {
  return `ack:${record}`;
}

function codeKey(record: string): string {
  return `code:${record}`;
}

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

/** `HGETALL` answers with a field → value map; anything else reads as empty. */
function readAcks(reply: RedisReply): { party: number; when: string }[] {
  const entries = reply?.result && typeof reply.result === "object" && !Array.isArray(reply.result) ? (reply.result as Record<string, unknown>) : {};

  return Object.entries(entries)
    .map(([party, when]) => ({ party: Number(party), when: typeof when === "string" ? when : "" }))
    .filter((ack) => Number.isInteger(ack.party) && ack.party >= 0 && ack.party <= MAX_PARTY && ack.when.length > 0 && ack.when.length <= MAX_WHEN_LENGTH && Number.isFinite(Date.parse(ack.when)))
    .sort((left, right) => left.party - right.party);
}

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

  // Only someone holding the record's code may record a confirmation. The code
  // is pinned by whoever writes first — the parties send the same one, and a
  // caller who only knows the record id cannot set it.
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
    // NX keeps a rare collision from overwriting someone else's record.
    const reply = await redisCommand(["SET", `share:${id}`, payload, "EX", TTL_SECONDS, "NX"]);

    if (reply === null) return json(503, { error: "short links are not configured" });
    if (reply.result === "OK") return json(201, { id, expiresInDays: TTL_SECONDS / 86400 });
  }

  return json(503, { error: "could not allocate an id" });
}

/**
 * Vercel runs files under /api as web handlers: the default export is an object
 * with a `fetch` method that receives a standard Request and returns a Response.
 * Exporting a bare function made the runtime call it as the classic `(req, res)`
 * pair, so `new URL(request.url)` threw on the relative path and every call came
 * back as 500 FUNCTION_INVOCATION_FAILED — the app then fell back to long links.
 */
export default {
  async fetch(request: Request): Promise<Response> {
    return route(request);
  },
};

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

    return json(200, { payload: reply.result }, { "Cache-Control": "public, max-age=300, s-maxage=86400" });
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
    // A body without a payload is an acknowledgment; with one it stores a link.
    return body.payload === undefined ? writeAck(body) : storePayload(body.payload);
  }

  return json(405, { error: "method not allowed" }, { Allow: "GET, POST" });
}
