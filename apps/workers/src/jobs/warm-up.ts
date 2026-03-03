import type { Page } from "playwright";
import { logger } from "../lib/logger.js";

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function scrollFeed(page: Page, times: number): Promise<void> {
  for (let i = 0; i < times; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.8));
    await page.waitForTimeout(randomBetween(1500, 3500));
  }
}

async function clickRandomPosts(page: Page, count: number): Promise<void> {
  const posts = page.locator('div[role="article"] a[href*="/posts/"], div[role="article"] a[href*="/photo"]');
  const visible = await posts.count();
  const toClick = Math.min(count, visible);

  for (let i = 0; i < toClick; i++) {
    try {
      const index = randomBetween(0, visible - 1);
      await posts.nth(index).click();
      await page.waitForTimeout(randomBetween(3000, 6000));
      await page.goBack({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(randomBetween(1000, 2000));
    } catch {
      logger.debug("Failed to click post during warm-up, continuing");
    }
  }
}

export async function standardWarmUp(page: Page): Promise<void> {
  const startTime = Date.now();
  logger.info("Starting standard warm-up (2-5 min)");

  // Navigate to Facebook
  await page.goto("https://www.facebook.com/", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(randomBetween(2000, 4000));

  // Scroll feed 3-5 times
  await scrollFeed(page, randomBetween(3, 5));

  // Click 1-2 posts
  await clickRandomPosts(page, randomBetween(1, 2));

  // Navigate to Marketplace
  await page.goto("https://www.facebook.com/marketplace/", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForTimeout(randomBetween(2000, 4000));

  // Browse 2-3 listings
  const listings = page.locator('a[href*="/marketplace/item/"]');
  const listingCount = await listings.count();
  const toBrowse = Math.min(randomBetween(2, 3), listingCount);

  for (let i = 0; i < toBrowse; i++) {
    try {
      const index = randomBetween(0, listingCount - 1);
      await listings.nth(index).click();
      await page.waitForTimeout(randomBetween(3000, 6000));
      await page.goBack({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(randomBetween(1000, 2000));
    } catch {
      logger.debug("Failed to browse listing during warm-up, continuing");
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  // Pad to at least 2 minutes
  if (elapsed < 120) {
    const remaining = 120 - elapsed;
    logger.debug("Padding warm-up time", { remainingSeconds: remaining });
    await page.waitForTimeout(remaining * 1000);
  }

  logger.info("Standard warm-up completed", { durationSeconds: Math.round((Date.now() - startTime) / 1000) });
}

export async function extendedWarmUp(page: Page): Promise<void> {
  const startTime = Date.now();
  logger.info("Starting extended warm-up (5-8 min)");

  // Do standard warm-up first
  await standardWarmUp(page);

  // Visit profile
  try {
    await page.goto("https://www.facebook.com/me", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(randomBetween(3000, 5000));
    await scrollFeed(page, randomBetween(1, 2));
  } catch {
    logger.debug("Failed to visit profile during extended warm-up");
  }

  // Visit a group
  try {
    await page.goto("https://www.facebook.com/groups/feed/", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.waitForTimeout(randomBetween(3000, 5000));
    await scrollFeed(page, randomBetween(1, 3));
  } catch {
    logger.debug("Failed to visit groups during extended warm-up");
  }

  // Return to Marketplace
  await page.goto("https://www.facebook.com/marketplace/", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForTimeout(randomBetween(2000, 4000));

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  // Pad to at least 5 minutes total
  if (elapsed < 300) {
    const remaining = 300 - elapsed;
    logger.debug("Padding extended warm-up time", { remainingSeconds: remaining });
    await page.waitForTimeout(remaining * 1000);
  }

  logger.info("Extended warm-up completed", { durationSeconds: Math.round((Date.now() - startTime) / 1000) });
}
