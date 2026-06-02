import { test, expect } from '@playwright/test';

/**
 * E2e tests for the site index page.
 *
 * These run against a live servehere instance started by hosted_test.js.
 * The BASE_URL environment variable is set by the harness.
 *
 * @example
 *   // Successful run:
 *   // ✓ /index.html returns a 200 status
 *   // ✓ /index.html is a valid HTML document
 *   // ✓ /index.html loads the stylesheet
 *   // ✓ /index.html loads the application script
 */

test.describe('/index.html', () => {

  test('returns a 200 status', async ({ page }) => {
    const response = await page.goto('/index.html');
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test('is a valid HTML document', async ({ page }) => {
    await page.goto('/index.html');
    const doctype = await page.evaluate(() => {
      const node = document.doctype;
      return node ? node.name : null;
    });
    expect(doctype).toBe('html');

    const html = page.locator('html');
    await expect(html).toBeAttached();

    const head = page.locator('head');
    await expect(head).toBeAttached();

    const body = page.locator('body');
    await expect(body).toBeAttached();
  });

  test('loads the stylesheet', async ({ page }) => {
    await page.goto('/index.html');
    const stylesheet = page.locator('link[rel="stylesheet"][href="index.css"]');
    await expect(stylesheet).toBeAttached();
  });

  test('loads the application script', async ({ page }) => {
    await page.goto('/index.html');
    const script = page.locator('script[src="index.iife.js"]');
    await expect(script).toBeAttached();
  });

});
