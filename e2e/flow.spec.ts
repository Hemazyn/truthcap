import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
});

/** Creates a pending item-condition record and returns its share link and code. */
async function createPendingRecord(page: Page): Promise<{ title: string; shareUrl: string; code: string }> {
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
  const code = (await page.locator("p.font-mono").first().innerText()).trim();
  expect(code).toMatch(/^[A-Z0-9]{6}$/);

  const link = page.locator("code").first();
  await expect(link).toHaveText(/\/s\/[23456789abcdefghijkmnpqrstuvwxyz]{8}$/);
  const shareUrl = (await link.innerText()).trim();

  // The link has to stay small enough to type out or read over the phone.
  expect(shareUrl.length).toBeLessThan(80);
  await expect(page.getByRole("img", { name: "QR code for the share link" })).toBeVisible();

  return { title: "Item condition agreed", shareUrl, code };
}

test("a /create visit starts a new record instead of resuming a waiting one", async ({ page }) => {
  await createPendingRecord(page);

  // The record is saved, but going back to create begins something new.
  await page.goto("/create");
  await expect(page.getByRole("heading", { name: "What are you capturing?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Send Bola the code" })).toHaveCount(0);

  // A draft in progress is still picked back up.
  await page.goto("/create");
  await page.getByRole("button", { name: /Handover acknowledged/ }).click();
  await page.getByRole("button", { name: "Start this record" }).click();
  await expect(page.getByRole("heading", { name: "Fill in the details" })).toBeVisible();
  await page.goto("/records");
  const draftRow = page.getByRole("listitem").filter({ hasText: "Handover acknowledged" });
  await expect(draftRow.getByText("Draft", { exact: true })).toBeVisible();
});

test("a share link stays locked until the acknowledgment code is entered", async ({ page, browser }) => {
  const { title, shareUrl, code } = await createPendingRecord(page);

  const otherDevice = await browser.newContext();
  const otherPage = await otherDevice.newPage();
  await otherPage.goto(shareUrl);

  // The link on its own shows none of the agreement.
  await expect(otherPage.getByRole("heading", { name: "This agreement is locked" })).toBeVisible();
  await expect(otherPage.getByRole("heading", { name: title })).toHaveCount(0);
  await expect(otherPage.getByText("₦420,000")).toHaveCount(0);
  await expect(otherPage.getByText("MacBook Pro 2019")).toHaveCount(0);
  await expect(otherPage.getByRole("button", { name: "Enter 6-char code" })).toBeDisabled();
  await expect(otherPage.getByRole("button", { name: "Acknowledge this copy" })).toHaveCount(0);

  // A wrong code opens nothing and acknowledges nothing.
  await otherPage.getByLabel("Acknowledgment code").fill("WRONG1");
  await otherPage.getByRole("button", { name: "Open this agreement" }).click();
  await expect(otherPage.getByText("That code does not match this record. Check it and try again.")).toBeVisible();
  await expect(otherPage.getByText("₦420,000")).toHaveCount(0);
  await expect(otherPage.getByText("Acknowledged by both", { exact: true })).toHaveCount(0);

  // The code the initiator sent is what opens the record.
  await otherPage.getByLabel("Acknowledgment code").fill(code);
  await otherPage.getByRole("button", { name: "Open this agreement" }).click();
  await expect(otherPage.getByRole("heading", { name: title })).toBeVisible();
  await expect(otherPage.getByText("₦420,000")).toBeVisible();
  await expect(otherPage.getByText("Waiting for acknowledgment")).toBeVisible();

  // Reading it is not acknowledging it: the code is only entered once.
  await expect(otherPage.getByLabel("Acknowledgment code")).toHaveCount(0);
  await otherPage.getByRole("button", { name: "Acknowledge this copy" }).click();

  // This side is acknowledged now, and the screen says whose side is left.
  await expect(otherPage.getByText("Waiting for Ada", { exact: true })).toBeVisible();
  await expect(otherPage.getByRole("button", { name: "Acknowledge this copy" })).toHaveCount(0);

  await otherDevice.close();
});

test("the initiator acknowledges once and the record then waits on the other party", async ({ page }) => {
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

  await page.getByRole("button", { name: "Acknowledge this record" }).click();
  await expect(page.getByRole("heading", { name: "Review before you acknowledge" })).toBeVisible();
  await expect(page.getByLabel("Acknowledgment code")).toHaveValue(code);

  await page.getByRole("button", { name: "Acknowledge this record" }).click();

  // That side is done, the record is not: it now waits for Bola, and the
  // acknowledgment form does not come back for the person who already confirmed.
  await expect(page).toHaveURL(/\/record\/trc_/);
  await expect(page.getByRole("heading", { name: "Waiting for Bola to acknowledge" })).toBeVisible();
  await expect(page.getByText(/You acknowledged this record on/)).toBeVisible();
  await expect(page.getByText(/Bola's acknowledgment is the last one left/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Acknowledge this record" })).toHaveCount(0);
  await expect(page.getByText("Acknowledged", { exact: true })).toBeVisible();
  await expect(page.getByText("Pending", { exact: true })).toBeVisible();
  await expect(page.getByText("₦420,000")).toBeVisible();
  await expect(page.getByRole("img", { name: "QR code for the share link" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Waiting for Bola to acknowledge" })).toBeVisible();
  await expect(page.getByText("Ada", { exact: true }).first()).toBeVisible();

  const stored = await page.evaluate(() => window.localStorage.getItem("truthcap.records.v1"));
  expect(stored).toContain("acknowledged");
  expect(stored).toContain("MacBook Pro 2019");

  await page.getByRole("button", { name: "Records", exact: true }).click();
  const row = page.getByRole("listitem").filter({ hasText: "Item condition agreed" });
  await expect(row.getByText("Waiting for Bola", { exact: true })).toBeVisible();

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

  await page.getByRole("button", { name: "Acknowledge this record" }).click();
  await page.getByLabel("Acknowledgment code").fill("WRONG1");
  await page.getByRole("button", { name: "Acknowledge this record" }).click();

  await expect(page.getByText("That code does not match this record. Check it and try again.")).toBeVisible();
  await expect(page.getByText("Acknowledged", { exact: true })).toHaveCount(0);
});

test("walks back through the create steps", async ({ page }) => {
  await page.goto("/create");
  await page.getByRole("button", { name: /Item condition agreed/ }).click();
  await page.getByRole("button", { name: "Start this record" }).click();

  await expect(page.getByRole("heading", { name: "Fill in the details" })).toBeVisible();
  await page.getByRole("button", { name: "Back to templates" }).click();
  await expect(page.getByRole("heading", { name: "What are you capturing?" })).toBeVisible();
});

test("a party name keeps the spaces typed into it", async ({ page }) => {
  await page.goto("/create");
  await page.getByRole("button", { name: /Item condition agreed/ }).click();
  await page.getByRole("button", { name: "Start this record" }).click();

  const name = page.getByLabel("Person handing over the item name");
  await name.pressSequentially("Ada Bola ");
  await expect(name).toHaveValue("Ada Bola ");

  await page.getByLabel("Person receiving the item name").fill("Bola Ade");
  await page.getByLabel(/Item/).fill("MacBook Pro 2019");
  await page.getByLabel(/Condition we both agreed it was in/).click();
  await page.getByRole("option", { name: "Good", exact: true }).click();
  await page.getByLabel(/Date of handover/).fill("2026-10-22");
  await page.getByRole("button", { name: "Create the record" }).click();

  // The name the record carries keeps the space and drops the stray one.
  await expect(page.getByRole("heading", { name: "Send Bola Ade the code" })).toBeVisible();
  await expect(page.getByText("Ada Bola", { exact: true }).first()).toBeVisible();
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
  expect(shareUrl).toMatch(/\/s\/[23456789abcdefghijkmnpqrstuvwxyz]{8}$/);

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
  const { title, shareUrl, code } = await createPendingRecord(page);

  const otherDevice = await browser.newContext();
  const otherPage = await otherDevice.newPage();
  await otherPage.goto(shareUrl);

  // The link alone is not enough, so it lands on the locked copy.
  await expect(otherPage.getByRole("heading", { name: "This agreement is locked" })).toBeVisible();

  // The code the initiator sent opens it, and the copy says where it lives.
  await otherPage.getByLabel("Acknowledgment code").fill(code);
  await otherPage.getByRole("button", { name: "Open this agreement" }).click();

  await expect(otherPage.getByRole("heading", { name: title })).toBeVisible();
  await expect(otherPage.getByText("₦420,000")).toBeVisible();
  await expect(otherPage.getByText("Waiting for acknowledgment")).toBeVisible();
  await expect(otherPage.getByText(/stays for 90 days/)).toBeVisible();

  await otherPage.getByRole("button", { name: "Acknowledge this copy" }).click();
  await expect(otherPage.getByText("Waiting for Ada", { exact: true })).toBeVisible();

  await otherPage.getByRole("button", { name: "All your records" }).click();
  await expect(otherPage.getByRole("heading", { name: "Records on this device" })).toBeVisible();
  // The acknowledgment is recorded for Bola, the party who opened the copy.
  const row = otherPage.getByRole("listitem").filter({ hasText: title });
  await expect(row).toBeVisible();
  await expect(row.getByText("Waiting for Ada", { exact: true })).toBeVisible();

  const stored = await otherPage.evaluate(() => window.localStorage.getItem("truthcap.records.v1"));
  expect(stored).toContain("MacBook Pro 2019");
  expect(stored).toContain("acknowledged");

  await otherDevice.close();
});

test("an acknowledgment the initiator made travels in the link they send", async ({ page, browser }) => {
  const { code } = await createPendingRecord(page);

  // The initiator confirms first, so the link they send carries their side.
  await page.getByRole("button", { name: "Acknowledge this record" }).click();
  await page.getByRole("button", { name: "Acknowledge this record" }).click();
  await expect(page.getByRole("heading", { name: "Waiting for Bola to acknowledge" })).toBeVisible();

  const link = page.locator("code").first();
  await expect(link).toHaveText(/\/s\//);
  const freshUrl = (await link.innerText()).trim();

  const otherDevice = await browser.newContext();
  const otherPage = await otherDevice.newPage();
  await otherPage.goto(freshUrl);

  await otherPage.getByLabel("Acknowledgment code").fill(code);
  await otherPage.getByRole("button", { name: "Open this agreement" }).click();

  // This copy knows the initiator has confirmed, and that its own side is left.
  await expect(otherPage.getByText(/Ada acknowledged this record on/)).toBeVisible();
  await expect(otherPage.getByText("Waiting for Bola", { exact: true })).toBeVisible();

  await otherPage.getByRole("button", { name: "Acknowledge this copy" }).click();
  await expect(otherPage.getByText("Acknowledged by both", { exact: true })).toBeVisible();
  await expect(otherPage.getByText(/Timestamped/)).toBeVisible();

  await otherDevice.close();
});

test("the link, not this browser's history, decides what the shared copy shows", async ({ page }) => {
  const { title, shareUrl, code } = await createPendingRecord(page);

  // This browser already holds an older copy of the same record, from an
  // earlier session: same id, marked acknowledged by both people.
  await page.evaluate(() => {
    const key = "truthcap.records.v1";
    const state = JSON.parse(window.localStorage.getItem(key) ?? "{}") as { records: { parties: { acknowledged?: string }[]; [key: string]: unknown }[] };
    const now = new Date().toISOString();

    for (const record of state.records) {
      record.status = "acknowledged";
      record.parties = record.parties.map((party) => ({ ...party, acknowledged: now }));
    }

    window.localStorage.setItem(key, JSON.stringify(state));
  });

  // Same profile, fresh tab: the link is still pending, so it still opens locked.
  const second = await page.context().newPage();
  await second.goto(shareUrl);
  await expect(second.getByRole("heading", { name: "This agreement is locked" })).toBeVisible();

  await second.getByLabel("Acknowledgment code").fill(code);
  await second.getByRole("button", { name: "Open this agreement" }).click();

  // The record itself comes from the link, and this device's own confirmations
  // are kept instead of being overwritten by the older payload.
  await expect(second.getByRole("heading", { name: title })).toBeVisible();
  await expect(second.getByText("₦420,000")).toBeVisible();
  await expect(second.getByText("Acknowledged by both", { exact: true })).toBeVisible();
  await expect(second.getByRole("button", { name: "Acknowledge this copy" })).toHaveCount(0);

  await second.close();
});

test("explains a damaged share link", async ({ page }) => {
  await page.goto("/shared#not-a-real-payload");
  await expect(page.getByRole("heading", { name: "This link is incomplete" })).toBeVisible();
});

test("explains a short link that has expired or never existed", async ({ page }) => {
  await page.goto("/s/abcd2345");
  await expect(page.getByRole("heading", { name: "We can't find that record" })).toBeVisible();
  await expect(page.getByText(/expire 90 days/)).toBeVisible();
});
