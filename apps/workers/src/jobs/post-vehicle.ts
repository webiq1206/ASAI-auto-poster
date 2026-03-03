import type { Page } from "playwright";
import { logger } from "../lib/logger.js";
import type { Vehicle, PostingConfig } from "../lib/dashboard-api.js";

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function humanType(page: Page, selector: string, text: string, config: PostingConfig): Promise<void> {
  await page.click(selector);
  await page.waitForTimeout(randomBetween(200, 400));

  for (const char of text) {
    await page.keyboard.type(char, {
      delay: randomBetween(config.delays.keystroke_min, config.delays.keystroke_max),
    });
  }
}

async function pauseBetweenFields(config: PostingConfig): Promise<void> {
  const pause = randomBetween(config.delays.field_pause_min, config.delays.field_pause_max);
  await new Promise((r) => setTimeout(r, pause));
}

export async function postVehicle(
  page: Page,
  vehicle: Vehicle,
  postingConfig: PostingConfig,
): Promise<{ screenshotBuffer: Buffer; success: boolean }> {
  const selectors = postingConfig.selectors;

  logger.info("Navigating to FBMP create listing", { vehicleId: vehicle.id });
  await page.goto("https://www.facebook.com/marketplace/create/vehicle", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForTimeout(randomBetween(2000, 4000));

  // Year
  if (selectors.year) {
    logger.debug("Filling year", { year: vehicle.year });
    await humanType(page, selectors.year, String(vehicle.year), postingConfig);
    await pauseBetweenFields(postingConfig);
  }

  // Make
  if (selectors.make) {
    logger.debug("Filling make", { make: vehicle.make });
    await humanType(page, selectors.make, vehicle.make, postingConfig);
    await page.waitForTimeout(1000);
    await page.keyboard.press("Enter");
    await pauseBetweenFields(postingConfig);
  }

  // Model
  if (selectors.model) {
    logger.debug("Filling model", { model: vehicle.model });
    await humanType(page, selectors.model, vehicle.model, postingConfig);
    await page.waitForTimeout(1000);
    await page.keyboard.press("Enter");
    await pauseBetweenFields(postingConfig);
  }

  // Trim
  if (selectors.trim && vehicle.trim) {
    logger.debug("Filling trim", { trim: vehicle.trim });
    await humanType(page, selectors.trim, vehicle.trim, postingConfig);
    await pauseBetweenFields(postingConfig);
  }

  // Price
  if (selectors.price && vehicle.price) {
    logger.debug("Filling price", { price: vehicle.price });
    await humanType(page, selectors.price, String(vehicle.price), postingConfig);
    await pauseBetweenFields(postingConfig);
  }

  // Mileage
  if (selectors.mileage && vehicle.mileage) {
    logger.debug("Filling mileage", { mileage: vehicle.mileage });
    await humanType(page, selectors.mileage, String(vehicle.mileage), postingConfig);
    await pauseBetweenFields(postingConfig);
  }

  // Description
  if (selectors.description && vehicle.description) {
    logger.debug("Filling description");
    await humanType(page, selectors.description, vehicle.description, postingConfig);
    await pauseBetweenFields(postingConfig);
  }

  // Upload photos one at a time
  if (selectors.photo_input && vehicle.photo_urls.length > 0) {
    logger.info("Uploading photos", { count: vehicle.photo_urls.length });
    for (let i = 0; i < vehicle.photo_urls.length; i++) {
      const photoUrl = vehicle.photo_urls[i];
      logger.debug("Uploading photo", { index: i + 1, url: photoUrl });

      const fileInput = page.locator(selectors.photo_input);
      await fileInput.setInputFiles(photoUrl);
      await page.waitForTimeout(1500);
    }
    await pauseBetweenFields(postingConfig);
  }

  // VIN
  if (selectors.vin && vehicle.vin) {
    logger.debug("Filling VIN", { vin: vehicle.vin });
    await humanType(page, selectors.vin, vehicle.vin, postingConfig);
    await pauseBetweenFields(postingConfig);
  }

  // Click publish
  logger.info("Clicking publish", { vehicleId: vehicle.id });
  if (selectors.publish_button) {
    await page.click(selectors.publish_button);
  } else {
    const publishButton = page.locator('div[aria-label="Publish"], button:has-text("Publish")');
    await publishButton.click();
  }

  await page.waitForTimeout(3000);

  // Take confirmation screenshot
  const screenshotBuffer = await page.screenshot({ fullPage: false });
  logger.info("Post submitted, screenshot captured", { vehicleId: vehicle.id });

  return { screenshotBuffer: Buffer.from(screenshotBuffer), success: true };
}
