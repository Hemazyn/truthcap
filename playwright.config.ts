import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  // The suite talks to one shared dev server that compiles routes on demand, so
  // running it one test at a time keeps the timings honest.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  // `next dev` compiles a route the first time it is visited, which can take a
  // few seconds more than the 5s default once the suite opens several routes.
  expect: { timeout: 15_000 },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4173",
    channel: "chrome",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- -H 127.0.0.1 -p 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
