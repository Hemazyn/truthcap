import { routes } from "@/lib/router";

/**
 * Short links keep the record on the server, so the link stays something you
 * can read out loud. `api/share.ts` stores it for 90 days; the record screens
 * fall back to the self-contained `/shared#…` link when the API is unreachable
 * (offline, or a deploy without the store configured).
 */
const REQUEST_TIMEOUT_MS = 4000;
const ID_PATTERN = /^[23456789abcdefghijkmnpqrstuvwxyz]{8}$/;

function origin(): string {
  return typeof window === "undefined" ? "" : window.location.origin;
}

async function request(path: string, init?: RequestInit): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(path, { ...init, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Stores the encoded record and returns the short link, or null if it could not be stored. */
export async function createShortLink(payload: string): Promise<string | null> {
  const response = await request("/api/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });

  if (!response?.ok) return null;

  try {
    const data = (await response.json()) as { id?: unknown };
    if (typeof data.id !== "string" || !ID_PATTERN.test(data.id)) return null;
    return `${origin()}${routes.short(data.id)}`;
  } catch {
    return null;
  }
}

/** Reads the stored payload for a short link, or null when it expired or is unknown. */
export async function fetchSharedPayload(id: string): Promise<string | null> {
  if (!ID_PATTERN.test(id)) return null;

  const response = await request(`/api/share?id=${encodeURIComponent(id)}`);
  if (!response?.ok) return null;

  try {
    const data = (await response.json()) as { payload?: unknown };
    return typeof data.payload === "string" && data.payload.length > 0 ? data.payload : null;
  } catch {
    return null;
  }
}
