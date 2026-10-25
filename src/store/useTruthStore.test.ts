import { beforeEach, describe, expect, it } from "vitest";
import { useTruthStore } from "@/store/useTruthStore";
import { STORAGE_KEY } from "@/lib/storage";

const resetStore = () => {
  localStorage.clear();
  useTruthStore.setState({ records: [], activeId: null });
};

const getActive = () => {
  const { records, activeId } = useTruthStore.getState();
  return records.find((record) => record.id === activeId) ?? null;
};

beforeEach(resetStore);

describe("capture lifecycle", () => {
  it("starts a draft from a template with defaults", () => {
    useTruthStore.getState().startCapture("item-condition-agreement");
    const capture = getActive();

    expect(capture).not.toBeNull();
    expect(capture?.status).toBe("draft");
    expect(capture?.values.item).toBe("");
    expect(capture?.values.currency).toBe("NGN");
    expect(capture?.parties).toHaveLength(2);
    expect(capture?.accessCode).toBeNull();
  });

  it("writes field and party values and persists them", () => {
    const store = useTruthStore.getState();
    store.startCapture("payment-schedule-agreed");
    store.setField("total", 50000);
    store.setPartyName(0, "Ada");
    store.setPartyContact(1, "0803 000 0000");

    const capture = getActive();
    expect(capture?.values.total).toBe(50000);
    expect(capture?.parties[0].name).toBe("Ada");
    expect(capture?.parties[1].contact).toBe("0803 000 0000");

    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(persisted.version).toBe(1);
    expect(persisted.activeId).toBe(capture?.id);
    expect(persisted.records[0].values.total).toBe(50000);
  });

  it("moves to pending with a code and the initiator name", () => {
    const store = useTruthStore.getState();
    store.startCapture("handover-acknowledged");
    store.setPartyName(0, "Ada");
    store.initiate();

    const capture = getActive();
    expect(capture?.status).toBe("pending");
    expect(capture?.accessCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(capture?.initiator).toBe("Ada");
  });

  it("rejects a wrong code and accepts the issued one", () => {
    const store = useTruthStore.getState();
    store.startCapture("handover-acknowledged");
    store.setPartyName(0, "Ada");
    store.setPartyName(1, "Bola");
    store.initiate();

    const capture = getActive();
    expect(capture?.accessCode).toBeTruthy();

    expect(useTruthStore.getState().acknowledge(capture!.id, "WRONG1")).toBe(false);
    expect(getActive()?.status).toBe("pending");

    const accepted = useTruthStore.getState().acknowledge(capture!.id, capture!.accessCode!.toLowerCase());
    expect(accepted).toBe(true);

    const acknowledged = getActive();
    expect(acknowledged?.status).toBe("acknowledged");
    expect(acknowledged?.acknowledgment?.who).toBe("Bola");
    expect(acknowledged?.acknowledgment?.when).toBeTruthy();
    expect(acknowledged?.parties.every((party) => Boolean(party.acknowledged))).toBe(true);
  });

  it("discards a draft but keeps acknowledged records", () => {
    const store = useTruthStore.getState();
    store.startCapture("handover-acknowledged");
    store.initiate();

    const firstId = getActive()!.id;
    store.acknowledge(firstId, getActive()!.accessCode!);

    store.startCapture("repair-agreed");
    expect(useTruthStore.getState().records).toHaveLength(2);

    store.discardDraft();
    const { records, activeId } = useTruthStore.getState();
    expect(activeId).toBeNull();
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe(firstId);
    expect(records[0].status).toBe("acknowledged");
  });

  it("restores persisted records through hydrate", () => {
    const store = useTruthStore.getState();
    store.startCapture("work-delivered-accepted");
    store.setField("work", "Landing page");
    const capture = getActive();

    useTruthStore.setState({ records: [], activeId: null });
    useTruthStore.getState().hydrate();

    expect(useTruthStore.getState().activeId).toBe(capture?.id);
    expect(getActive()?.values.work).toBe("Landing page");
  });

  it("ignores corrupt storage payloads", () => {
    localStorage.setItem(STORAGE_KEY, "not-json");
    useTruthStore.getState().hydrate();
    expect(useTruthStore.getState().records).toHaveLength(0);
  });
});
