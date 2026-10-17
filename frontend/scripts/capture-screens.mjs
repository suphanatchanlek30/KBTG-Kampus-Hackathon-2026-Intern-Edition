// Capture sharp PNGs of every L/T screen from the dev overlay page.
// Usage: start `npm run dev`, then `node scripts/capture-screens.mjs [outDir] [scale]`
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const OUT = path.resolve(process.argv[2] ?? "../screenshots");
const SCALE = Number(process.argv[3] ?? 3);

const SCREENS = {
  L1: "landlord-home",
  L2: "landlord-create-deal",
  L3: "landlord-review",
  L4: "landlord-share-qr",
  L5: "landlord-status",
  L6: "landlord-complete",
  T1: "tenant-home",
  T2: "tenant-review-deal",
  T3: "tenant-verify-identity",
  T4: "tenant-funds-locked",
  T5: "tenant-confirm-viewing",
  T6: "tenant-confirm-move-in",
  T7: "tenant-complete",
  T8: "tenant-off-deal-warning",
};

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: SCALE });

for (const [id, name] of Object.entries(SCREENS)) {
  await page.goto(`${BASE}/dev/overlay?screen=${id}&opacity=0&controls=0`, { waitUntil: "networkidle" });
  // Remove the Figma reference image layered on top of the real screen.
  await page.evaluate(() => document.querySelectorAll('img[src^="/dev/screens/"]').forEach((el) => el.remove()));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  const file = path.join(OUT, `${id}-${name}.png`);
  await page.locator("[data-phone-scope]").screenshot({ path: file, animations: "disabled", caret: "hide" });
  console.log("saved", file);
}

await browser.close();
