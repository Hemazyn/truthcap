/**
 * URL builders shared by screens, share links and the QR codes: one place that
 * knows where each screen lives now that Next's file routes own the matching.
 */
export const routes = {
  home: () => "/",
  create: () => "/create",
  records: () => "/records",
  acknowledge: (code: string) => `/acknowledge/${encodeURIComponent(code)}`,
  record: (id: string) => `/record/${encodeURIComponent(id)}`,
  /** The record payload rides in the fragment so hosts never see it. */
  shared: (data: string) => `/shared#${data}`,
  /** A stored record: the link stays short and the payload comes from the API. */
  short: (id: string) => `/s/${encodeURIComponent(id)}`,
};
