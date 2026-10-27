import type { IncomingMessage, ServerResponse } from "node:http";
import { GET, POST } from "../src/app/api/share/route";

interface VercelRequest extends IncomingMessage {
  body?: unknown;
}

function header(request: IncomingMessage, name: string): string | undefined {
  const value = request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function toWebRequest(request: VercelRequest): Request | null {
  const host = header(request, "x-forwarded-host") ?? header(request, "host");
  if (!host) return null;

  const protocol = header(request, "x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const headers = new Headers();

  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => headers.append(name, entry));
    } else if (value !== undefined) {
      headers.append(name, value);
    }
  }

  const method = request.method ?? "GET";
  const body = method === "GET" || method === "HEAD" || request.body === undefined ? undefined : JSON.stringify(request.body);

  return new Request(new URL(request.url ?? "/api/share", `${protocol}://${host}`), {
    method,
    headers,
    body,
  });
}

export default async function handler(request: VercelRequest, response: ServerResponse): Promise<void> {
  const webRequest = toWebRequest(request);
  if (!webRequest) {
    response.statusCode = 400;
    response.end(JSON.stringify({ error: "missing host" }));
    return;
  }

  const result = await (request.method === "GET" ? GET(webRequest) : POST(webRequest));
  response.statusCode = result.status;
  result.headers.forEach((value, name) => response.setHeader(name, value));
  response.end(await result.text());
}
