import { create } from "zustand";
import { getTemplate } from "@/data/templates";
import { STORAGE_KEY, loadState, saveState } from "@/lib/storage";
import type { TruthCapture, TruthTemplate } from "@/types/truth";

type State = {
  records: TruthCapture[];
  activeId: string | null;
};

type Actions = {
  startCapture: (templateId: string) => void;
  setField: (key: string, value: string | number | boolean | null) => void;
  setPartyName: (partyIndex: number, name: string) => void;
  setPartyContact: (partyIndex: number, contact: string) => void;
  initiate: () => void;
  reopenDraft: () => void;
  acknowledge: (recordId: string, code: string) => boolean;
  discardDraft: () => void;
  clearActive: () => void;
  hydrate: () => void;
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const FALLBACK_INITIATOR = "The initiator";

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

function normalizeName(name: string): string {
  return name.trim().slice(0, 40);
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
        parties: capture.parties.map((party, index) => (index === partyIndex ? { ...party, name: normalizeName(name) } : party)),
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

        const initiator = capture.parties[0]?.name?.trim() || FALLBACK_INITIATOR;
        return {
          ...capture,
          status: "pending",
          accessCode: capture.accessCode ?? makeCode(),
          initiator,
        };
      });
    },

    reopenDraft: () => {
      updateActive((capture) => (capture.status === "pending" ? { ...capture, status: "draft" } : capture));
    },

    acknowledge: (recordId, code) => {
      const { records, activeId } = get();
      const record = records.find((candidate) => candidate.id === recordId);

      if (!record || record.status !== "pending" || !record.accessCode) return false;
      if (record.accessCode.toUpperCase() !== code.trim().toUpperCase()) return false;

      const now = new Date().toISOString();
      const acknowledged: TruthCapture = {
        ...record,
        status: "acknowledged",
        parties: record.parties.map((party) => ({ ...party, acknowledged: now })),
        acknowledgment: {
          who: record.parties[1]?.name?.trim() || "The other person",
          when: now,
          method: "code",
        },
      };

      commit(
        records.map((candidate) => (candidate.id === recordId ? acknowledged : candidate)),
        activeId,
      );
      return true;
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
