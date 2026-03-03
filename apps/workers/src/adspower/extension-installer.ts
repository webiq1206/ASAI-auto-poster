import { chromium, type Browser } from "playwright";
import * as adspower from "../lib/adspower.js";
import { logger } from "../lib/logger.js";

const EXTENSION_ID = process.env.CHROME_EXTENSION_ID || "";
const EXTENSION_CRX_PATH = process.env.CHROME_EXTENSION_CRX_PATH || "";

export async function installExtension(profileId: string): Promise<void> {
  if (!EXTENSION_CRX_PATH && !EXTENSION_ID) {
    logger.info("No extension configured, skipping installation", { profileId });
    return;
  }

  let browser: Browser | undefined;

  try {
    const wsUrl = await adspower.startBrowser(profileId);
    browser = await chromium.connectOverCDP(wsUrl);
    const context = browser.contexts()[0];
    const page = context?.pages()[0] ?? (await context.newPage());

    if (EXTENSION_ID) {
      const extensionUrl = `https://chrome.google.com/webstore/detail/${EXTENSION_ID}`;
      await page.goto(extensionUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForTimeout(3000);

      const addButton = page.locator('button:has-text("Add to Chrome")');
      if (await addButton.isVisible({ timeout: 5000 })) {
        await addButton.click();
        await page.waitForTimeout(2000);

        const confirmButton = page.locator('button:has-text("Add extension")');
        if (await confirmButton.isVisible({ timeout: 5000 })) {
          await confirmButton.click();
          await page.waitForTimeout(5000);
        }
      }

      logger.info("Extension installation attempted via Chrome Web Store", { profileId, extensionId: EXTENSION_ID });
    }

    await browser.close();
    browser = undefined;
    await adspower.stopBrowser(profileId);

    logger.info("Extension installation completed", { profileId });
  } catch (err: any) {
    logger.error("Extension installation failed", { profileId, error: err.message });
    if (browser) {
      try { await browser.close(); } catch {}
    }
    try { await adspower.stopBrowser(profileId); } catch {}
  }
}
