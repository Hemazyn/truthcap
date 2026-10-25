import type { TruthCapture } from "@/types/truth";

export const STORAGE_KEY = "truthcap.records.v1";
export const STORAGE_VERSION = 1;

export interface PersistedState {
  version: number;
  records: TruthCapture[];
  activeId: string | null;
}

export const EMPTY_STATE: PersistedState = {
  version: STORAGE_VERSION,
  records: [],
  activeId: null,
};

export function isCaptureRecord(value: unknown): value is TruthCapture {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<TruthCapture>;
  return typeof record.id === "string" && typeof record.templateId === "string" && typeof record.title === "string" && typeof record.status === "string" && typeof record.createdAt === "string" && Array.isArray(record.parties) && typeof record.values === "object" && record.values !== null;
}

export function loadState(): PersistedState {
  if (typeof window === "undefined") return EMPTY_STATE;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;

    const parsed = JSON.parse(raw) as Partial<PersistedState> | null;
    if (!parsed || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.records)) {
      return EMPTY_STATE;
    }

    const records = parsed.records.filter(isCaptureRecord);
    const activeId = typeof parsed.activeId === "string" && records.some((record) => record.id === parsed.activeId) ? parsed.activeId : null;

    return { version: STORAGE_VERSION, records, activeId };
  } catch {
    return EMPTY_STATE;
  }
}

export function saveState(state: Pick<PersistedState, "records" | "activeId">): void {
  if (typeof window === "undefined") return;

  try {
    const payload: PersistedState = {
      version: STORAGE_VERSION,
      records: state.records,
      activeId: state.activeId,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage can be unavailable (private mode, quota); the app keeps working in memory.
  }
}

export function clearStoredState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
