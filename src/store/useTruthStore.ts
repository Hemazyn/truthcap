import { create } from "zustand";
import { getTemplate } from "@/data/templates";
import { STORAGE_KEY, loadState, saveState } from "@/lib/storage";
import type { TruthCapture, TruthTemplate } from "@/types/truth";

type State = {
  records: TruthCapture[];
  activeId: string | null;
};

/** Which side of the record is acknowledging it. */
export type Acknowledger = "initiator" | "other";

type Actions = {
  startCapture: (templateId: string) => void;
  setField: (key: string, value: string | number | boolean | null) => void;
  setPartyName: (partyIndex: number, name: string) => void;
  setPartyContact: (partyIndex: number, contact: string) => void;
  initiate: () => void;
  reopenDraft: () => void;
  /**
   * Records one party's acknowledgment. The initiator confirms on their own
   * copy; the person who opened a shared copy confirms as the other party. The
   * record only becomes acknowledged once every party has confirmed.
   */
  acknowledge: (recordId: string, code: string, as?: Acknowledger) => boolean;
  /** Bring a record that arrived through a share link into this browser. */
  importRecord: (capture: TruthCapture) => void;
  openRecord: (recordId: string) => void;
  discardDraft: () => void;
  clearActive: () => void;
  hydrate: () => void;
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const FALLBACK_INITIATOR = "The initiator";
const MAX_NAME_LENGTH = 40;

/** Party 0 is the initiator; the person who opens a shared copy is the other party. */
export const INITIATOR_PARTY = 0;
export const COUNTERPARTY_PARTY = 1;

function generateId(): string {
  return `trc_${Math.random().toString(36).slice(2, 10)}`;
}

function makeCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function buildCapture(template: TruthTemplate): TruthCapture {
  const now = new Date().toISOString();
  const values: Record<string, string | number | boolean> = {};

  for (const field of template.fields) {
    values[field.key] = field.default !== undefined ? field.default : "";
  }

  return {
    id: generateId(),
    templateId: template.id,
    title: template.title,
    status: "draft",
    createdAt: now,
    initiator: "",
    accessCode: null,
    parties: template.defaultParties.map((party) => ({
      role: party.role,
      name: party.name ?? "",
      contact: party.contact ?? "",
      acknowledged: undefined,
    })),
    values,
    acknowledgment: null,
  };
}

const initial = loadState();

export const useTruthStore = create<State & Actions>((set, get) => {
  const commit = (records: TruthCapture[], activeId: string | null) => {
    set({ records, activeId });
    saveState({ records, activeId });
  };

  const updateActive = (updater: (capture: TruthCapture) => TruthCapture): TruthCapture | null => {
    const { records, activeId } = get();
    if (!activeId) return null;

    const current = records.find((record) => record.id === activeId);
    if (!current) return null;

    const next = updater(current);
    commit(
      records.map((record) => (record.id === activeId ? next : record)),
      activeId,
    );
    return next;
  };

  return {
    records: initial.records,
    activeId: initial.activeId,

    hydrate: () => {
      const state = loadState();
      set({ records: state.records, activeId: state.activeId });
    },

    startCapture: (templateId) => {
      const template = getTemplate(templateId);
      if (!template) return;

      const capture = buildCapture(template);
      const kept = get().records.filter((record) => record.status !== "draft");
      commit([...kept, capture], capture.id);
    },

    setField: (key, value) => {
      updateActive((capture) => ({
        ...capture,
        values: { ...capture.values, [key]: value ?? "" },
      }));
    },

    setPartyName: (partyIndex, name) => {
      updateActive((capture) => ({
        ...capture,
        // Spaces are kept as they are typed; names are trimmed when the record is initiated.
        parties: capture.parties.map((party, index) => (index === partyIndex ? { ...party, name: name.slice(0, MAX_NAME_LENGTH) } : party)),
      }));
    },

    setPartyContact: (partyIndex, contact) => {
      updateActive((capture) => ({
        ...capture,
        parties: capture.parties.map((party, index) => (index === partyIndex ? { ...party, contact } : party)),
      }));
    },

    initiate: () => {
      updateActive((capture) => {
        if (capture.status !== "draft") return capture;

        // The draft is done being typed, so stray spacing is cleaned up here.
        const parties = capture.parties.map((party) => ({ ...party, name: party.name?.trim() ?? "", contact: party.contact?.trim() ?? "" }));
        const initiator = parties[INITIATOR_PARTY]?.name?.trim() || FALLBACK_INITIATOR;

        return {
          ...capture,
          status: "pending",
          accessCode: capture.accessCode ?? makeCode(),
          initiator,
          parties,
        };
      });
    },

    reopenDraft: () => {
      updateActive((capture) => (capture.status === "pending" ? { ...capture, status: "draft" } : capture));
    },

    acknowledge: (recordId, code, as = "initiator") => {
      const { records, activeId } = get();
      const record = records.find((candidate) => candidate.id === recordId);

      if (!record || (record.status !== "pending" && record.status !== "acknowledged")) return false;
      if (!record.accessCode || record.accessCode.toUpperCase() !== code.trim().toUpperCase()) return false;

      const target = as === "other" ? COUNTERPARTY_PARTY : INITIATOR_PARTY;
      const party = record.parties[target];

      if (!party) return false;
      // One party acknowledging never stands in for the other, and never twice.
      if (party.acknowledged) return true;

      const now = new Date().toISOString();
      const parties = record.parties.map((candidate, index) => (index === target ? { ...candidate, acknowledged: now } : candidate));
      const complete = parties.every((candidate) => Boolean(candidate.acknowledged));

      const acknowledged: TruthCapture = {
        ...record,
        status: complete ? "acknowledged" : "pending",
        parties,
        acknowledgment: {
          who: party.name?.trim() || party.role || "The other person",
          when: complete ? now : null,
          method: "code",
        },
      };

      commit(
        records.map((candidate) => (candidate.id === recordId ? acknowledged : candidate)),
        activeId,
      );
      return true;
    },

    importRecord: (capture) => {
      const { records, activeId } = get();
      const existing = records.find((record) => record.id === capture.id);

      // Never downgrade a copy that was already acknowledged here.
      if (existing?.status === "acknowledged") return;

      // A shared copy can arrive without the acknowledgments this device already
      // holds, so a party that acknowledged here keeps that acknowledgment.
      const next: TruthCapture = existing
        ? {
            ...capture,
            parties: capture.parties.map((party, index) => {
              const local = existing.parties[index];
              return !party.acknowledged && local?.acknowledged ? { ...party, acknowledged: local.acknowledged } : party;
            }),
          }
        : capture;

      commit(existing ? records.map((record) => (record.id === capture.id ? next : record)) : [...records, capture], activeId);
    },

    openRecord: (recordId) => {
      const { records } = get();
      if (!records.some((record) => record.id === recordId)) return;
      commit(records, recordId);
    },

    clearActive: () => {
      commit(get().records, null);
    },

    discardDraft: () => {
      const { records, activeId } = get();
      const active = records.find((record) => record.id === activeId);
      const kept = active && active.status !== "acknowledged" ? records.filter((record) => record.id !== activeId) : records;

      commit(kept, null);
    },
  };
});

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      useTruthStore.getState().hydrate();
    }
  });
}
