import { create } from "zustand";
import { getTemplate } from "@/data/templates";
import type { RemoteAck } from "@/lib/acks";
import { pushAck } from "@/lib/acks";
import { mergeSharedCopy, withParties } from "@/lib/records";
import { EMPTY_STATE, STORAGE_KEY, loadState, saveState } from "@/lib/storage";
import type { TruthCapture, TruthTemplate } from "@/types/truth";

type State = {
  records: TruthCapture[];
  activeId: string | null;
  /** False until this device's localStorage has been read (see `hydrate`). */
  hydrated: boolean;
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
  /** Merge acknowledgments the other device recorded for this record. */
  applyAcks: (recordId: string, acks: RemoteAck[]) => void;
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

// The first render has to match the HTML the server sent, and the server cannot
// read localStorage — so the store starts empty and the shell hydrates it on
// mount (`SiteShell` calls `hydrate`).
const initial = EMPTY_STATE;

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
    hydrated: false,

    hydrate: () => {
      const state = loadState();
      set({ records: state.records, activeId: state.activeId, hydrated: true });
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
      const acknowledged = withParties(record, parties);

      commit(
        records.map((candidate) => (candidate.id === recordId ? acknowledged : candidate)),
        activeId,
      );

      // The other device only learns about this from the shared store, so the
      // confirmation leaves right away. If the store is unreachable the record
      // still stands here, and the next pull or retry catches up.
      void pushAck(acknowledged, target);
      return true;
    },

    applyAcks: (recordId, acks) => {
      const { records, activeId } = get();
      const record = records.find((candidate) => candidate.id === recordId);

      if (!record || acks.length === 0) return;

      const parties = record.parties.map((party, index) => {
        // A stamp this device already holds is never rewritten.
        if (party.acknowledged) return party;

        const remote = acks.find((ack) => ack.party === index && Number.isFinite(Date.parse(ack.when)));
        return remote ? { ...party, acknowledged: new Date(remote.when).toISOString() } : party;
      });

      // Nothing new: leave the array alone so screens reading it stay put.
      if (parties.every((party, index) => party === record.parties[index])) return;

      commit(
        records.map((candidate) => (candidate.id === recordId ? withParties(record, parties) : candidate)),
        activeId,
      );
    },

    importRecord: (capture) => {
      const { records, activeId } = get();
      const existing = records.find((record) => record.id === capture.id) ?? null;

      // Never downgrade a copy that was already acknowledged here.
      if (existing?.status === "acknowledged") return;

      // The link's copy, merged with whatever this device already confirmed.
      const next = mergeSharedCopy(existing, capture);
      commit(existing ? records.map((record) => (record.id === capture.id ? next : record)) : [...records, next], activeId);
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
