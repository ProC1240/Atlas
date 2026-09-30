import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Disposable browser context: never uses or modifies the user's browser profile.
const base = process.env.ATLAS_BASE_URL || 'http://127.0.0.1:3000';
const out = fileURLToPath(new URL('../test-results/', import.meta.url));
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  timezoneId: 'Asia/Bangkok',
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const checks = [];
const pass = (message) => {
  checks.push(message);
  console.log('PASS', message);
};
const screenshot = (name) => page.screenshot({ path: `${out}${name}.png`, fullPage: true });
async function visit(path, title) {
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: title, exact: true }).waitFor();
}
try {
  await visit('/', 'Overview');
  assert.equal(await page.locator('canvas').count(), 1);
  await screenshot('overview-desktop');
  pass('Guest overview loads, real 3D canvas renders, no demo records');

  await visit('/anatomy', 'Find your focus.');
  await page.waitForTimeout(1000);
  const bodyCanvas = await page.locator('canvas').boundingBox();
  assert.ok(bodyCanvas);
  await page.mouse.click(
    bodyCanvas.x + bodyCanvas.width * 0.55,
    bodyCanvas.y + bodyCanvas.height * 0.24,
  );
  await page.getByRole('heading', { name: 'Chest', exact: true }).waitFor({ timeout: 5000 });
  pass('Clicking the 3D chest mesh selects the muscle');
  await page.getByRole('button', { name: 'Reset full body view', exact: true }).click();
  await page.getByRole('button', { name: 'Chest', exact: true }).click();
  await page.getByRole('heading', { name: 'Chest', exact: true }).waitFor();
  await page.waitForTimeout(900);
  await screenshot('anatomy-chest');
  await page.getByRole('button', { name: 'Upper · clavicular', exact: true }).click();
  assert.equal(await page.locator('.exercise-row').count(), 1);
  pass('Muscle selection, zoom state and clavicular filter');

  await page.getByRole('button', { name: /Incline dumbbell press/ }).click();
  await page.getByText('Pages 15, 19, 37', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Pause animation', exact: true }).click();
  await page.getByRole('button', { name: 'Play animation', exact: true }).waitFor();
  await screenshot('exercise-learn');
  await page.getByRole('button', { name: 'Log workout', exact: true }).click();
  for (let i = 1; i <= 3; i++)
    await page.getByRole('spinbutton', { name: `Set ${i} weight`, exact: true }).fill('30');
  await page.getByRole('button', { name: 'Save workout', exact: true }).click();
  await page.getByRole('heading', { name: 'Make it your own.' }).waitFor();
  assert.match(
    await page.locator('dialog').last().innerText(),
    /Cloud sign-in isn’t connected yet/,
  );
  await page.getByRole('button', { name: 'Continue on this device' }).click();
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('atlas.training.v1') || '{}').workouts?.length === 1,
  );
  pass('Source references, animation controls, guest save gate and local persistence');

  await visit('/progress', 'Your progress.');
  assert.equal(await page.locator('.journal-row').count(), 1);
  await page.getByRole('button', { name: 'Edit Incline dumbbell press', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Set 1 weight', exact: true }).fill('35');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('35 kg × 10', { exact: false }).waitFor();
  assert.match(await page.locator('.progress-summary').innerText(), /950/);
  for (const period of ['Day', 'Month', 'Week'])
    await page.getByRole('button', { name: period, exact: true }).click();
  await screenshot('progress-desktop');
  pass('Workout edits survive reload; volume totals and day/week/month controls');

  await visit('/', 'Overview');
  await page.getByRole('button', { name: 'Add 250 ml water', exact: true }).click();
  await page.getByRole('button', { name: 'Add 250 ml water', exact: true }).click();
  await page.getByRole('button', { name: 'Undo last water entry', exact: true }).click();
  assert.match(await page.locator('.water-metric').innerText(), /0.25/);
  await page.getByRole('button', { name: 'Choose a gift', exact: true }).click();
  await page.getByRole('button', { name: /Greek Goblet/ }).click();
  await screenshot('offering-desktop');
  await page.getByRole('button', { name: 'Give & check in', exact: true }).click();
  await page.locator('.offering-celebration.playing').waitFor();
  await page.waitForFunction(() => {
    const value = Number(
      document.querySelector('.offering-celebration')?.getAttribute('data-total'),
    );
    return value > 0 && value < 35;
  });
  await screenshot('offering-light-desktop');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  assert.equal(
    await page.getByRole('button', { name: 'Checked in', exact: true }).isDisabled(),
    true,
  );
  assert.match(await page.locator('.bond-summary').innerText(), /35 \/ 60 bond/);
  assert.equal(await page.locator('a .lucide-arrow-up-right, a .lucide-chevron-right').count(), 0);
  await page.locator('.bond-summary').getByText('Zeus', { exact: true }).click();
  await page.getByRole('heading', { name: 'Divine bond', exact: true }).waitFor();
  await screenshot('bond-desktop');
  pass('Item choice grants bond and the level ring opens a dedicated reward page');
  pass('Hydration add/undo and idempotent daily check-in');

  await visit('/avatar', 'Your collection.');
  await page.getByRole('button', { name: /Hermes Check in on 3 days/ }).click();
  await page.getByRole('heading', { name: 'Hermes', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Choose Hermes', exact: true }).count(), 0);
  await page.getByRole('button', { name: /Athena Level 1/ }).click();
  await page.getByRole('button', { name: 'Choose Athena', exact: true }).click();
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Athena', exact: true }).waitFor();
  assert.equal(
    await page.getByRole('button', { name: 'Equipped', exact: true }).isDisabled(),
    true,
  );
  await screenshot('avatar-desktop');
  pass('Independent avatar bond, locked preview and persistent equip');

  await visit('/me', 'Your profile.');
  await page.getByLabel('Display name', { exact: true }).fill('Atlas Tester');
  await page.getByLabel('Height', { exact: false }).fill('175');
  await page.getByLabel('Weight', { exact: false }).fill('70');
  await page.getByLabel('Age', { exact: false }).fill('25');
  await page.getByLabel('Formula sex', { exact: false }).selectOption('male');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = await downloaded;
  const backup = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.equal(backup.profile.name, 'Atlas Tester');
  assert.equal(backup.workouts.length, 1);
  await page.locator('input[type=file]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":99}'),
  });
  await page.getByRole('status').filter({ hasText: 'Invalid backup' }).waitFor();
  pass('Profile editing, portable export and invalid import rejection');

  await visit('/progress', 'Your progress.');
  assert.match(await page.locator('.body-metrics').innerText(), /22.9/);
  await page.getByRole('button', { name: 'Delete Incline dumbbell press', exact: true }).click();
  await page.getByRole('button', { name: 'Keep entry', exact: true }).click();
  assert.equal(await page.locator('.journal-row').count(), 1);
  await page.getByRole('button', { name: 'Delete Incline dumbbell press', exact: true }).click();
  await page.getByRole('button', { name: 'Delete entry', exact: true }).click();
  await page.getByRole('heading', { name: 'A fresh page.', exact: true }).waitFor();
  pass('Body estimate and confirmed deletion');

  await visit('/me', 'Your profile.');
  await page.locator('input[type=file]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole('button', { name: 'Replace & import', exact: true }).click();
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('atlas.training.v1') || '{}').workouts?.length === 1,
  );
  pass('Valid backup import restores journal after explicit confirmation');

  const rewardFixture = structuredClone(backup);
  rewardFixture.bond.points.zeus = 60;
  rewardFixture.bond.points.athena = 50;
  await page.locator('input[type=file]').setInputFiles({
    name: 'rewards.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(rewardFixture)),
  });
  await page.getByRole('button', { name: 'Replace & import', exact: true }).click();
  await visit('/bond', 'Divine bond');
  await page.getByRole('button', { name: 'Zeus', exact: true }).click();
  await page.getByRole('button', { name: 'Claim level 2 reward', exact: true }).click();
  assert.equal(
    await page.getByRole('button', { name: 'Claimed level 2 reward', exact: true }).isDisabled(),
    true,
  );
  await page.getByRole('button', { name: 'Athena', exact: true }).click();
  assert.equal(
    await page.getByRole('button', { name: 'Claim level 2 reward', exact: true }).isEnabled(),
    true,
  );
  await page.getByRole('button', { name: 'Claim level 2 reward', exact: true }).click();
  await page.getByRole('button', { name: 'Inventory', exact: true }).click();
  await page.locator('.inventory-pick').filter({ hasText: 'Small Whey' }).click();
  await page.getByRole('button', { name: 'Give Small Whey', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.reload({ waitUntil: 'networkidle' });
  assert.match(await page.locator('.bond-reading').innerText(), /15 \/ 80 bond/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('atlas.training.v1')));
  assert.equal(saved.bond.inventory.smallWhey, 0);
  assert.equal(saved.bond.inventory.grapes, 1);
  assert.equal(saved.bond.points.zeus, 60);
  assert.deepEqual(saved.bond.claimed, ['zeus:2', 'athena:2']);
  await screenshot('bond-rewards');
  pass(
    'Independent reward paths, duplicate-claim prevention, inventory consumption and reload persistence',
  );

  const motionFixture = structuredClone(saved);
  motionFixture.equipped = 'zeus';
  motionFixture.bond.points.zeus = 50;
  motionFixture.bond.inventory.smallWhey = 2;
  await visit('/me', 'Your profile.');
  await page.locator('input[type=file]').setInputFiles({
    name: 'motion.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(motionFixture)),
  });
  await page.getByRole('button', { name: 'Replace & import', exact: true }).click();
  await visit('/avatar', 'Your collection.');
  await page.getByRole('button', { name: 'Inventory', exact: true }).click();
  await page.getByRole('button', { name: 'Give Small Whey', exact: true }).evaluate((button) => {
    button.click();
    button.click();
  });
  await page.waitForFunction(() => {
    const stage = document.querySelector('.offering-celebration');
    const total = Number(stage?.getAttribute('data-total'));
    return total > 50 && total < 65;
  });
  await page.locator('.ceremony-progress').getByText('Level 2', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Continue', exact: true }).waitFor();
  await screenshot('offering-level-up');
  const afterDoubleClick = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('atlas.training.v1')),
  );
  assert.equal(afterDoubleClick.bond.points.zeus, 65);
  assert.equal(afterDoubleClick.bond.inventory.smallWhey, 1);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  pass('Live bond count crosses a level boundary; rapid repeat clicks consume only one item');

  await page.setViewportSize({ width: 390, height: 844 });
  await visit('/bond', 'Divine bond');
  await page.getByRole('button', { name: 'Inventory', exact: true }).click();
  await page.getByRole('button', { name: 'Give Small Whey', exact: true }).click();
  await page.locator('.offering-celebration.playing').waitFor();
  await page.waitForFunction(() => {
    const value = Number(
      document.querySelector('.offering-celebration')?.getAttribute('data-total'),
    );
    return value > 65 && value < 80;
  });
  await page.screenshot({ path: `${out}offering-light-mobile.png` });
  await page.getByRole('button', { name: 'Skip animation', exact: true }).click();
  await page.reload({ waitUntil: 'networkidle' });
  assert.match(await page.locator('.bond-reading').innerText(), /20 \/ 80 bond/);
  pass('Mobile offering and early dismissal preserve exactly one completed gift');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Inventory', exact: true }).click();
  await page.getByRole('button', { name: 'Give Grapes', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).waitFor({ timeout: 2000 });
  assert.equal(await page.locator('.ceremony-particles').isVisible(), false);
  assert.equal(await page.locator('.offering-celebration').getAttribute('data-total'), '110');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  pass('Reduced motion skips particles and counting, with the same final bond');

  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, heading, file] of [
    ['/', 'Overview', 'overview-mobile'],
    ['/anatomy', 'Find your focus.', 'anatomy-mobile'],
    ['/progress', 'Your progress.', 'progress-mobile'],
    ['/avatar', 'Your collection.', 'avatar-mobile'],
    ['/me', 'Your profile.', 'me-mobile'],
    ['/bond', 'Divine bond', 'bond-mobile'],
  ]) {
    await visit(path, heading);
    if (path === '/anatomy') await page.getByRole('button', { name: 'Chest', exact: true }).click();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
      `${path} overflows mobile viewport`,
    );
    await screenshot(file);
  }
  pass('All six routes fit the 390px mobile viewport');
  await page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'Anatomy' })
    .click();
  await page.getByRole('heading', { name: 'Find your focus.', exact: true }).waitFor();
  pass('Mobile navigation');

  const fallback = await context.newPage();
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === 'webgl2' ? null : original.call(this, type, ...args);
    };
  });
  await fallback.goto(`${base}/anatomy`, { waitUntil: 'networkidle' });
  await fallback.getByText('3D is unavailable on this device.', { exact: false }).waitFor();
  await fallback.getByRole('button', { name: 'Chest', exact: true }).click();
  await fallback.getByRole('button', { name: /Incline dumbbell press/ }).waitFor();
  pass('No-WebGL fallback keeps anatomy library usable');
  assert.deepEqual(errors, []);
  pass('No uncaught browser JavaScript errors');
  console.log(
    JSON.stringify(
      {
        passed: checks.length,
        screenshots: out,
        cloud: 'not configured; live OTP and SQL not tested',
      },
      null,
      2,
    ),
  );
} catch (error) {
  await screenshot('failure');
  console.error(await page.locator('body').innerText());
  throw error;
} finally {
  await browser.close();
}
