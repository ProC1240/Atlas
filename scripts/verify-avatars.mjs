import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = process.env.ATLAS_BASE_URL || 'http://127.0.0.1:3000';
await mkdir('test-results/avatars', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
const requests = new Set();
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => {
  if (request.url().endsWith('.glb')) requests.add(request.url());
});
const ready = (god) =>
  page.locator(`.avatar-render[data-avatar="${god}"][data-ready="true"]`).waitFor();
try {
  await page.goto(`${base}/avatar`, { waitUntil: 'networkidle' });
  await ready('zeus');
  assert.equal(requests.size, 1, 'Only the selected character should be downloaded');
  for (const name of ['Zeus', 'Athena', 'Hermes', 'Poseidon', 'Ares']) {
    await page.locator('.god-option').filter({ hasText: name }).click();
    await ready(name.toLowerCase());
    await page.waitForTimeout(250);
    await page
      .locator('.avatar-showcase')
      .screenshot({ path: `test-results/avatars/${name.toLowerCase()}.png` });
  }
  assert.equal(requests.size, 5);
  const canvas = page.locator('canvas');
  const before = await canvas.screenshot();
  const rect = await canvas.boundingBox();
  await page.mouse.move(rect.x + rect.width * 0.45, rect.y + rect.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * 0.72, rect.y + rect.height * 0.5, { steps: 16 });
  await page.mouse.up();
  await page.waitForTimeout(350);
  assert.notDeepEqual(await canvas.screenshot(), before, 'Dragging should rotate actual geometry');
  await page
    .locator('.avatar-showcase')
    .screenshot({ path: 'test-results/avatars/ares-rotated.png' });
  assert.equal(await page.getByRole('button', { name: 'Choose Ares', exact: true }).count(), 0);
  console.log(
    'PASS five distinct GLB assets, on-demand loading, real orbit interaction, locked preview',
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.god-option').filter({ hasText: 'Poseidon' }).click();
  await ready('poseidon');
  await page.screenshot({ path: 'test-results/avatars/mobile.png', fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  console.log('PASS mobile canvas and layout without horizontal overflow');

  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await ready('zeus');
  await page.screenshot({ path: 'test-results/avatars/overview-mobile.png', fullPage: true });
  await page.goto(`${base}/bond`, { waitUntil: 'networkidle' });
  await ready('zeus');
  console.log('PASS shared overview and bond scenes');
  assert.deepEqual(errors, []);

  const fallback = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === 'webgl2' ? null : original.call(this, type, ...args);
    };
  });
  const fallbackPage = await fallback.newPage();
  await fallbackPage.goto(`${base}/avatar`);
  await fallbackPage.locator('.avatar-poster').waitFor();
  assert.ok(
    await fallbackPage
      .locator('.avatar-poster')
      .evaluate((image) => image.complete && image.naturalWidth > 0),
  );
  await fallbackPage.screenshot({ path: 'test-results/avatars/fallback.png', fullPage: true });
  console.log('PASS no-WebGL fallback preserves character artwork');
  await fallback.close();
} finally {
  await browser.close();
}
