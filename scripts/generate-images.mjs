/**
 * Renders the static brand images that crawlers and iOS need.
 *
 *   node scripts/generate-images.mjs
 *
 * Requires the local Chrome install (same channel the e2e tests use).
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const PUBLIC_DIR = new URL("../public/", import.meta.url);
const ICON_SVG = new URL("icon.svg", PUBLIC_DIR);

const mark = (size) => `
  <svg width="${size}" height="${size}" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="11" fill="#1c6f43"/>
    <rect x="17.5" y="8" width="14" height="18" rx="3.5" fill="#4fa477"/>
    <rect x="8.5" y="13" width="16" height="20" rx="4" fill="#eef7f1"/>
    <path d="M12.9 23.3l3.1 3.1 5.3-6" fill="none" stroke="#175a37" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="30.5" cy="29.5" r="2.4" fill="#fbbf24"/>
  </svg>`;

const fontLinks = `
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />`;

const ogHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    ${fontLinks}
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1200px;
        height: 630px;
        overflow: hidden;
        background: #07130c;
        color: #eef7f1;
        font-family: Inter, -apple-system, "Segoe UI", sans-serif;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 68px 76px 58px;
        position: relative;
      }
      .glow {
        position: absolute;
        inset: -20% -10% auto -10%;
        height: 620px;
        background: radial-gradient(58% 62% at 22% 8%, rgba(47, 138, 88, 0.55), transparent 68%),
                    radial-gradient(48% 58% at 88% 4%, rgba(251, 191, 36, 0.16), transparent 70%);
      }
      .grid {
        position: absolute;
        inset: 0;
        background-image: linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
        background-size: 64px 64px;
        mask-image: radial-gradient(78% 78% at 30% 10%, #000 20%, transparent 78%);
      }
      .top, .bottom, h1, p { position: relative; }
      .top { display: flex; align-items: center; gap: 14px; }
      .wordmark { font-size: 27px; font-weight: 600; letter-spacing: -0.02em; }
      .tag {
        margin-left: auto;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: #9fd0b4;
      }
      h1 {
        margin-top: auto;
        font-family: "Instrument Serif", Georgia, serif;
        font-weight: 400;
        font-size: 78px;
        line-height: 1.06;
        letter-spacing: -0.015em;
        max-width: 960px;
      }
      h1 em { font-style: italic; color: #7fc79f; }
      p {
        margin-top: 26px;
        font-size: 26px;
        line-height: 1.45;
        color: #b9ccc0;
        max-width: 800px;
      }
      .bottom {
        margin-top: auto;
        display: flex;
        align-items: center;
        gap: 12px;
        padding-top: 26px;
        border-top: 1px solid rgba(255, 255, 255, 0.12);
        font-size: 19px;
        color: #8fae9b;
      }
      .dot { width: 5px; height: 5px; border-radius: 50%; background: #4f9d72; }
      .url { margin-left: auto; font-weight: 600; color: #d8ece1; }
    </style>
  </head>
  <body>
    <div class="glow"></div>
    <div class="grid"></div>
    <div class="top">
      ${mark(56)}
      <span class="wordmark">TruthCap</span>
      <span class="tag">Shared agreement records</span>
    </div>
    <div>
      <h1>What you agreed,<br />written down.<br /><em>Both keep a copy.</em></h1>
      <p>Timestamped records two people read and acknowledge. No account, no dashboard.</p>
    </div>
    <div class="bottom">
      <span>Agree it</span><span class="dot"></span>
      <span>Write it down</span><span class="dot"></span>
      <span>Acknowledge it</span>
      <span class="url">truthcap.vercel.app</span>
    </div>
  </body>
</html>`;

const iconHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      * { margin: 0; padding: 0; }
      body { width: 180px; height: 180px; background: #f5f9f6; display: grid; place-items: center; }
      svg { width: 148px; height: 148px; }
    </style>
  </head>
  <body>${mark(148)}</body>
</html>`;

await mkdir(PUBLIC_DIR, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });

async function capture(html, { width, height, path }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path, clip: { x: 0, y: 0, width, height } });
  await page.close();
  console.log(`wrote ${path}`);
}

await capture(ogHtml, { width: 1200, height: 630, path: new URL("og-image.png", PUBLIC_DIR).pathname });
await capture(iconHtml, { width: 180, height: 180, path: new URL("apple-touch-icon.png", PUBLIC_DIR).pathname });

await browser.close();
console.log(`source icon: ${ICON_SVG.pathname}`);
