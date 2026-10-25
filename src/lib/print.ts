import type { TruthCapture } from "@/types/truth";

function filenamePart(value: string): string {
  const cleaned = value
    .replace(/[^\p{L}\p{N}\-_]/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  return cleaned || "party";
}

/**
 * Browsers derive the PDF filename from the document title, so the title is set
 * to `TruthCap_<first party>-<second party>` for the duration of the print.
 */
export function printRecord(capture: TruthCapture): void {
  const firstParty = filenamePart(capture.parties[0]?.name?.trim() || capture.parties[0]?.role || "Party1");
  const secondParty = filenamePart(capture.parties[1]?.name?.trim() || capture.parties[1]?.role || "Party2");

  const originalTitle = document.title;
  document.title = `TruthCap_${firstParty}-${secondParty}`;

  const restoreTitle = () => {
    document.title = originalTitle;
    window.removeEventListener("afterprint", restoreTitle);
  };

  window.addEventListener("afterprint", restoreTitle);
  window.print();
}
