import { request } from "@playwright/test";

/**
 * `next dev` compiles a route the first time it is requested. The suite runs in
 * parallel and the app gives the share API four seconds to answer, so the first
 * POST must not be the one paying for compilation. Compiling the routes here
 * keeps that cost out of the tests.
 */
export default async function globalSetup(): Promise<void> {
  const baseURL = "http://127.0.0.1:4173";
  const context = await request.newContext({ baseURL });

  try {
    for (const path of ["/", "/create", "/records", "/shared", "/acknowledge/AAAAAA", "/record/trc_warmup1", "/s/abcd2345", "/kk"]) {
      await context.get(path);
    }

    await context.post("/api/share", {
      data: { payload: "zVcvBCgFBGMBxFin2oJQDl" },
      headers: { origin: baseURL },
    });
  } finally {
    await context.dispose();
  }
}
