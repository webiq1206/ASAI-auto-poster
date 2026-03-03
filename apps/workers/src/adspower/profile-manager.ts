import { chromium, type Browser } from "playwright";
import { logger } from "../lib/logger.js";
import * as adspower from "../lib/adspower.js";
import { decrypt } from "../lib/encryption.js";
import { getDb } from "../lib/db.js";

export interface Rep {
  id: number;
  dealer_id: number;
  name: string;
  adspower_profile_id?: string;
  proxy_host?: string;
  proxy_port?: number;
  proxy_user?: string;
  proxy_password?: string;
  fb_email?: string;
  fb_password?: string;
  status: string;
}

export async function createRepProfile(rep: Rep): Promise<string> {
  const proxyConfig = rep.proxy_host
    ? {
        proxy_soft: "other",
        proxy_type: "http",
        proxy_host: rep.proxy_host,
        proxy_port: String(rep.proxy_port ?? 80),
        proxy_user: rep.proxy_user,
        proxy_password: rep.proxy_password ? decrypt(rep.proxy_password) : undefined,
      }
    : undefined;

  const profileId = await adspower.createProfile({
    name: `QC-Rep-${rep.id}-${rep.name}`,
    user_proxy_config: proxyConfig,
    fingerprint_config: {
      automatic_timezone: "1",
      language: ["en-US", "en"],
      ua: "random",
    },
  });

  const db = getDb();
  await db.query("UPDATE sales_reps SET adspower_profile_id = $1 WHERE id = $2", [profileId, rep.id]);

  logger.info("Created AdsPower profile for rep", { repId: rep.id, profileId });
  return profileId;
}

export async function onboardRep(rep: Rep): Promise<void> {
  const steps = [
    "create_profile",
    "assign_proxy",
    "install_extension",
    "test_login",
    "set_status",
  ] as const;

  let profileId = rep.adspower_profile_id;
  let browser: Browser | undefined;

  try {
    // Step 1: Create profile
    logger.info("Onboarding step 1/5: Creating profile", { repId: rep.id });
    if (!profileId) {
      profileId = await createRepProfile(rep);
    }

    // Step 2: Assign proxy (already done during profile creation if proxy exists)
    logger.info("Onboarding step 2/5: Proxy assigned", { repId: rep.id, hasProxy: !!rep.proxy_host });

    // Step 3: Install extension
    logger.info("Onboarding step 3/5: Installing extension", { repId: rep.id });
    const { installExtension } = await import("./extension-installer.js");
    await installExtension(profileId);

    // Step 4: Test login
    logger.info("Onboarding step 4/5: Testing login", { repId: rep.id });
    const wsUrl = await adspower.startBrowser(profileId);
    browser = await chromium.connectOverCDP(wsUrl);
    const context = browser.contexts()[0];
    const page = context?.pages()[0] ?? (await context.newPage());

    await page.goto("https://www.facebook.com/", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(2000);

    const loggedIn = await page.evaluate(() => {
      return !document.querySelector('input[name="email"]');
    });

    if (!loggedIn && rep.fb_email && rep.fb_password) {
      logger.info("Not logged in, attempting login", { repId: rep.id });
      await page.fill('input[name="email"]', decrypt(rep.fb_email));
      await page.fill('input[name="pass"]', decrypt(rep.fb_password));
      await page.click('button[name="login"]');
      await page.waitForTimeout(5000);
    }

    logger.info("Login test completed", { repId: rep.id, loggedIn });

    await browser.close();
    browser = undefined;
    await adspower.stopBrowser(profileId);

    // Step 5: Set status
    logger.info("Onboarding step 5/5: Setting status", { repId: rep.id });
    const db = getDb();
    await db.query(
      "UPDATE sales_reps SET status = 'warming', updated_at = NOW() WHERE id = $1",
      [rep.id],
    );

    logger.info("Rep onboarding complete", { repId: rep.id, profileId });
  } catch (err: any) {
    logger.error("Onboarding failed", { repId: rep.id, step: steps, error: err.message });
    if (browser) {
      try { await browser.close(); } catch {}
    }
    if (profileId) {
      try { await adspower.stopBrowser(profileId); } catch {}
    }

    const db = getDb();
    await db.query(
      "UPDATE sales_reps SET status = 'pending', notes = $1, updated_at = NOW() WHERE id = $2",
      [`Onboarding failed: ${err.message}`, rep.id],
    );
    throw err;
  }
}
