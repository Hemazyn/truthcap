import { describe, expect, it } from "vitest";
import { currencySymbol, formatFieldValue, formatMoney, validateCapture } from "@/lib/validate";
import type { TruthField } from "@/types/truth";

const textField: TruthField = { key: "item", label: "Item", type: "text", required: true };
const amountField: TruthField = {
  key: "price",
  label: "Agreed price",
  type: "amount",
  required: true,
};
const selectField: TruthField = {
  key: "condition",
  label: "Condition",
  type: "select",
  required: true,
  options: [
    { label: "Like new", value: "like-new" },
    { label: "Good", value: "good" },
  ],
};
const dateField: TruthField = { key: "date", label: "Date", type: "date", required: true };
const booleanField: TruthField = {
  key: "photos",
  label: "Photos taken",
  type: "boolean",
  required: true,
};

describe("validateCapture", () => {
  it("reports missing and empty required fields", () => {
    expect(validateCapture({ fields: [textField] }, {})).toEqual([{ key: "item", message: "Item is required." }]);
    expect(validateCapture({ fields: [textField] }, { item: "" })).toHaveLength(1);
  });

  it("accepts filled required fields", () => {
    expect(validateCapture({ fields: [textField] }, { item: "MacBook Pro" })).toHaveLength(0);
  });

  it("rejects negative and non-numeric amounts", () => {
    expect(validateCapture({ fields: [amountField] }, { price: -1 })[0].message).toBe("Agreed price must be a valid amount.");
    expect(validateCapture({ fields: [amountField] }, { price: "abc" })[0].key).toBe("price");
    expect(validateCapture({ fields: [amountField] }, { price: 0 })).toHaveLength(0);
    expect(validateCapture({ fields: [amountField] }, { price: 420000 })).toHaveLength(0);
  });

  it("rejects select values outside the declared options", () => {
    expect(validateCapture({ fields: [selectField] }, { condition: "broken" })[0].message).toBe("Condition must be a valid choice.");
    expect(validateCapture({ fields: [selectField] }, { condition: "good" })).toHaveLength(0);
  });

  it("rejects dates that cannot be parsed", () => {
    expect(validateCapture({ fields: [dateField] }, { date: "not-a-date" })[0].message).toBe("Date must be a valid date.");
    expect(validateCapture({ fields: [dateField] }, { date: "2026-10-22" })).toHaveLength(0);
  });

  it("rejects non-boolean values for boolean fields", () => {
    expect(validateCapture({ fields: [booleanField] }, { photos: "yes" })[0].message).toBe("Photos taken must be yes or no.");
    expect(validateCapture({ fields: [booleanField] }, { photos: false })).toHaveLength(0);
  });
});

describe("formatFieldValue", () => {
  it("falls back for empty values", () => {
    expect(formatFieldValue(textField, null)).toBe("—");
    expect(formatFieldValue(textField, "")).toBe("—");
    expect(formatFieldValue(textField, undefined, "Not provided")).toBe("Not provided");
  });

  it("renders booleans as yes or no", () => {
    expect(formatFieldValue(booleanField, true)).toBe("Yes");
    expect(formatFieldValue(booleanField, false)).toBe("No");
  });

  it("renders select labels instead of raw values", () => {
    expect(formatFieldValue(selectField, "like-new")).toBe("Like new");
  });

  it("renders dates in a readable form", () => {
    expect(formatFieldValue(dateField, "2026-10-22")).toBe("22 October 2026");
  });

  it("renders amounts with the selected currency", () => {
    expect(formatFieldValue(amountField, 420000, "—", "NGN")).toContain("420,000");
    expect(formatFieldValue(amountField, 420000, "—", "NGN")).toContain("₦");
    expect(formatFieldValue(amountField, 420000, "—", "USD")).toContain("$");
    expect(formatFieldValue(amountField, 420000)).toBe("420,000");
  });
});

describe("currency helpers", () => {
  it("maps supported currencies to symbols", () => {
    expect(currencySymbol("NGN")).toBe("₦");
    expect(currencySymbol("USD")).toBe("$");
    expect(currencySymbol("GBP")).toBe("£");
    expect(currencySymbol("XYZ")).toBe("");
  });

  it("formats money with and without a known currency", () => {
    expect(formatMoney(5000, "NGN")).toContain("5,000");
    expect(formatMoney(5000, "XYZ")).toBe("5,000");
  });
});
