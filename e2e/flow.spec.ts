import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
});

/** Creates a pending item-condition record and returns its share link. */
async function createPendingRecord(page: Page): Promise<{ title: string; shareUrl: string }> {
  await page.goto("/create");
  await page.getByRole("button", { name: /Item condition agreed/ }).click();
  await page.getByRole("button", { name: "Start this record" }).click();

  await page.getByLabel("Person handing over the item name").fill("Ada");
  await page.getByLabel("Person receiving the item name").fill("Bola");
  await page.getByLabel(/Item/).fill("MacBook Pro 2019");
  await page.getByLabel(/Condition we both agreed it was in/).click();
  await page.getByRole("option", { name: "Good", exact: true }).click();
  await page.getByLabel(/Agreed price before the exchange/).fill("420000");
  await page.getByLabel(/Date of handover/).fill("2026-10-22");
  await page.getByRole("button", { name: "Create the record" }).click();

  await expect(page.getByRole("heading", { name: "Send Bola the code" })).toBeVisible();
  const link = page.locator("code").first();
  await expect(link).toHaveText(/\/shared#[A-Za-z0-9\-_]+$/);
  const shareUrl = (await link.innerText()).trim();

  // The link has to stay small enough to type, paste or scan.
  expect(shareUrl.length).toBeLessThan(300);
  await expect(page.getByRole("img", { name: "QR code for the share link" })).toBeVisible();

  return { title: "Item condition agreed", shareUrl };
}

test("creates, shares and acknowledges a record that survives reload", async ({ page }) => {
  await page.goto("/create");
  await expect(page.getByRole("heading", { name: "What are you capturing?" })).toBeVisible();

  await page.getByRole("button", { name: /Item condition agreed/ }).click();
  await page.getByRole("button", { name: "Start this record" }).click();

  await expect(page.getByRole("heading", { name: "Fill in the details" })).toBeVisible();
  await page.getByLabel("Person handing over the item name").fill("Ada");
  await page.getByLabel("Person receiving the item name").fill("Bola");
  await page.getByLabel("Person receiving the item contact").fill("0807 111 1111");
  await page.getByLabel(/Item/).fill("MacBook Pro 2019");
  await page.getByLabel(/Condition we both agreed it was in/).click();
  await page.getByRole("option", { name: "Good", exact: true }).click();
  await page.getByLabel(/Agreed price before the exchange/).fill("420000");
  await page.getByLabel(/Date of handover/).fill("2026-10-22");

  await page.getByRole("button", { name: "Create the record" }).click();

  await expect(page.getByRole("heading", { name: "Send Bola the code" })).toBeVisible();
  const code = (await page.locator("p.font-mono").first().innerText()).trim();
  expect(code).toMatch(/^[A-Z0-9]{6}$/);

  await page.getByRole("button", { name: "Open acknowledgment page" }).click();
  await expect(page.getByRole("heading", { name: "Review before you acknowledge" })).toBeVisible();
  await expect(page.getByLabel("Acknowledgment code")).toHaveValue(code);

  await page.getByRole("button", { name: "Acknowledge this record" }).click();

  await expect(page.getByRole("heading", { name: "Item condition agreed" })).toBeVisible();
  await expect(page.getByText("Acknowledged by both", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/record\/trc_/);
  await expect(page.getByText("₦420,000")).toBeVisible();

  await expect(page.getByRole("img", { name: "QR code for the share link" })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Acknowledged by both", { exact: true })).toBeVisible();
  await expect(page.getByText("Ada", { exact: true })).toBeVisible();

  const stored = await page.evaluate(() => window.localStorage.getItem("truthcap.records.v1"));
  expect(stored).toContain("acknowledged");
  expect(stored).toContain("MacBook Pro 2019");
  await page.getByRole("button", { name: "Back home" }).click();
  await page.getByRole("button", { name: "Create a record" }).first().click();
  await expect(page.getByRole("heading", { name: "What are you capturing?" })).toBeVisible();
});

test("rejects a wrong acknowledgment code", async ({ page }) => {
  await page.goto("/create");
  await page.getByRole("button", { name: /Handover acknowledged/ }).click();
  await page.getByRole("button", { name: "Start this record" }).click();

  await page.getByLabel(/^What was handed over/).fill("Apartment keys");
  await page.getByLabel(/^Details/).fill("Two keys and an access card");
  await page.getByLabel(/State at handover|Condition at handover/).click();
  await page.getByRole("option", { name: "Complete and working", exact: true }).click();
  await page.getByLabel(/Date of handover/).fill("2026-10-24");
  await page.getByRole("button", { name: "Create the record" }).click();

  await page.getByRole("button", { name: "Open acknowledgment page" }).click();
  await page.getByLabel("Acknowledgment code").fill("WRONG1");
  await page.getByRole("button", { name: "Acknowledge this record" }).click();

  await expect(page.getByText("That code does not match this record. Check it and try again.")).toBeVisible();
  await expect(page.getByText("Acknowledged by both", { exact: true })).toHaveCount(0);
});

test("walks back through the create steps", async ({ page }) => {
  await page.goto("/create");
  await page.getByRole("button", { name: /Item condition agreed/ }).click();
  await page.getByRole("button", { name: "Start this record" }).click();

  await expect(page.getByRole("heading", { name: "Fill in the details" })).toBeVisible();
  await page.getByRole("button", { name: "Back to templates" }).click();
  await expect(page.getByRole("heading", { name: "What are you capturing?" })).toBeVisible();
});

test("flags unknown paths as 404", async ({ page }) => {
  await page.goto("/kk");
  await expect(page.getByRole("heading", { name: "This page does not exist." })).toBeVisible();
  await expect(page.getByText("404", { exact: true })).toBeVisible();
});

test("redirects legacy hash URLs to clean paths", async ({ page }) => {
  await page.goto("/#/create");
  await expect(page.getByRole("heading", { name: "What are you capturing?" })).toBeVisible();
  await expect(page).toHaveURL(/\/create$/);
});

test("shows an empty state for an unknown record", async ({ page }) => {
  await page.goto("/record/trc_missing1");
  await expect(page.getByRole("heading", { name: "Record not found" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("button", { name: "Create a record" })).toBeVisible();
});

test("shows an empty state for an unknown acknowledgment code", async ({ page }) => {
  await page.goto("/acknowledge/ZZZZZZ");
  await expect(page.getByRole("heading", { name: "We can't find that record" })).toBeVisible();
  await expect(page.getByText("ZZZZZZ")).toBeVisible();
});

test("lists records on /records and opens one", async ({ page }) => {
  const { title, shareUrl } = await createPendingRecord(page);
  expect(shareUrl).toMatch(/\/shared#[A-Za-z0-9\-_]+$/);

  await page.getByRole("button", { name: "Records", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Records on this device" })).toBeVisible();
  const row = page.getByRole("listitem").filter({ hasText: title });
  await expect(row).toBeVisible();
  await expect(row.getByText("Waiting", { exact: true })).toBeVisible();

  await page.getByPlaceholder("Search by title, person or record ID").fill("nobody");
  await expect(page.getByRole("heading", { name: "Nothing matches that" })).toBeVisible();

  await page.getByRole("button", { name: "Clear search" }).click();
  await row.click();
  await expect(page.getByRole("heading", { name: "Send Bola the code" })).toBeVisible();
  await expect(page).toHaveURL(/\/record\/trc_/);
});

test("a share link opens the record on another device", async ({ page, browser }) => {
  const { title, shareUrl } = await createPendingRecord(page);

  const otherDevice = await browser.newContext();
  const otherPage = await otherDevice.newPage();
  await otherPage.goto(shareUrl);

  await expect(otherPage.getByRole("heading", { name: title })).toBeVisible();
  await expect(otherPage.getByText("₦420,000")).toBeVisible();
  await expect(otherPage.getByText("Waiting for acknowledgment")).toBeVisible();

  await otherPage.getByRole("button", { name: "Acknowledge this copy" }).click();
  await expect(otherPage.getByText("Acknowledged by both", { exact: true })).toBeVisible();

  await otherPage.getByRole("button", { name: "All your records" }).click();
  await expect(otherPage.getByRole("heading", { name: "Records on this device" })).toBeVisible();
  await expect(otherPage.getByRole("listitem").filter({ hasText: title }).getByText("Acknowledged", { exact: true })).toBeVisible();

  const stored = await otherPage.evaluate(() => window.localStorage.getItem("truthcap.records.v1"));
  expect(stored).toContain("MacBook Pro 2019");
  expect(stored).toContain("acknowledged");

  await otherDevice.close();
});

test("explains a damaged share link", async ({ page }) => {
  await page.goto("/shared#not-a-real-payload");
  await expect(page.getByRole("heading", { name: "This link is incomplete" })).toBeVisible();
});
