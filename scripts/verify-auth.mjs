import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { emptyData } from '../src/domain/training.ts';

// Mock provider exists only inside this test process; application routes remain unchanged.
const appPort = Number(process.env.ATLAS_AUTH_TEST_PORT || 3101);
const base = `http://127.0.0.1:${appPort}`;
const alice = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'alice@example.test',
  aud: 'authenticated',
  role: 'authenticated',
};
const bob = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'bob@example.test',
  aud: 'authenticated',
  role: 'authenticated',
};
const sessions = new Map(),
  refresh = new Map(),
  authCodes = new Map(),
  journals = new Map();
let refreshCount = 0,
  unavailable = false;
function issue(user, seconds = 3600) {
  const expires = Math.floor(Date.now() / 1000) + seconds;
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const access = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp: expires, iat: Math.floor(Date.now() / 1000), role: 'authenticated' })}.test-signature`;
  const token = randomUUID();
  sessions.set(access, user);
  refresh.set(token, user);
  return {
    access_token: access,
    refresh_token: token,
    token_type: 'bearer',
    expires_in: seconds,
    expires_at: expires,
    user,
  };
}
const upstream = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://provider.test');
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
  const answer = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };
  if (unavailable) return answer(503, { message: 'Provider temporarily unavailable' });
  if (url.pathname === '/auth/v1/authorize') {
    assert.equal(url.searchParams.get('provider'), 'google');
    assert.equal(url.searchParams.get('code_challenge_method'), 's256');
    const code = randomUUID();
    authCodes.set(code, url.searchParams.get('code_challenge'));
    const callback = new URL(url.searchParams.get('redirect_to'));
    callback.searchParams.set('code', code);
    res.writeHead(302, { Location: callback.href });
    return res.end();
  }
  if (url.pathname === '/auth/v1/otp') return answer(200, {});
  if (url.pathname === '/auth/v1/verify') {
    if (body.token !== '123456')
      return answer(403, { code: 'otp_expired', message: 'Invalid code' });
    return answer(200, issue(body.email === bob.email ? bob : alice));
  }
  if (url.pathname === '/auth/v1/token') {
    if (url.searchParams.get('grant_type') === 'pkce') {
      const challenge = authCodes.get(body.auth_code);
      authCodes.delete(body.auth_code);
      if (
        !challenge ||
        createHash('sha256')
          .update(body.code_verifier ?? '')
          .digest('base64url') !== challenge
      )
        return answer(400, { code: 'bad_code_verifier', message: 'Invalid PKCE exchange' });
      return answer(200, issue(alice));
    }
    const user = refresh.get(body.refresh_token);
    if (!user)
      return answer(400, { code: 'refresh_token_not_found', message: 'Invalid refresh token' });
    refresh.delete(body.refresh_token);
    refreshCount++;
    return answer(200, issue(user));
  }
  const access = (req.headers.authorization || '').replace('Bearer ', ''),
    user = sessions.get(access);
  if (!user) return answer(401, { code: 'bad_jwt', message: 'Unauthorized' });
  if (url.pathname === '/auth/v1/user') return answer(200, user);
  if (url.pathname === '/auth/v1/logout') {
    sessions.delete(access);
    for (const [token, owner] of refresh) if (owner.id === user.id) refresh.delete(token);
    return answer(200, {});
  }
  if (url.pathname === '/rest/v1/training_states') {
    assert.equal(url.searchParams.get('user_id'), `eq.${user.id}`);
    const row = journals.get(user.id);
    return answer(200, row ? [row] : []);
  }
  if (url.pathname === '/rest/v1/rpc/save_training_state') {
    const current = journals.get(user.id) ?? { revision: 0 };
    if (current.revision !== body.p_revision) return answer(409, { message: 'revision conflict' });
    const next = current.revision + 1;
    journals.set(user.id, { revision: next, payload: body.p_payload });
    return answer(200, next);
  }
  answer(404, { message: 'Not found' });
});
upstream.listen(0, '127.0.0.1');
await once(upstream, 'listening');
const service = `http://127.0.0.1:${upstream.address().port}`;
const app = spawn(
  process.execPath,
  [
    'node_modules/next/dist/bin/next',
    'start',
    '--hostname',
    '127.0.0.1',
    '--port',
    String(appPort),
  ],
  {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      SUPABASE_URL: service,
      SUPABASE_PUBLISHABLE_KEY: 'test-public-key',
      APP_ORIGIN: base,
      AUTH_GOOGLE_ENABLED: 'true',
      AUTH_EMAIL_ENABLED: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
let logs = '';
app.stdout.on('data', (d) => {
  logs += d;
});
app.stderr.on('data', (d) => {
  logs += d;
});
let browser;
const pass = (name) => console.log('PASS', name);
function api(context) {
  const send = async (url, method, options = {}) => {
    const cookie = (await context.cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
    return context.request.fetch(url, {
      ...options,
      method,
      headers: { Cookie: cookie, ...options.headers },
    });
  };
  return {
    get: (url, options) => send(url, 'GET', options),
    post: (url, options) => send(url, 'POST', options),
    put: (url, options) => send(url, 'PUT', options),
  };
}
const headers = { Origin: base, 'Content-Type': 'application/json', 'X-Atlas-Request': '1' };
try {
  for (let i = 0; i < 80; i++) {
    if (app.exitCode !== null) throw new Error(`Test server exited: ${logs}`);
    try {
      if ((await fetch(base + '/api/auth/session')).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Overview', exact: true }).waitFor();
  pass('Production app and server session endpoint load with no error overlay');
  assert.equal(
    (
      await api(context).get(base + '/api/journal', { headers: { 'X-Atlas-User': alice.id } })
    ).status(),
    401,
  );
  assert.equal(
    (
      await api(context).post(base + '/api/auth/otp', {
        headers: { ...headers, Origin: 'https://evil.example' },
        data: { email: alice.email },
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await api(context).post(base + '/api/auth/otp', {
        headers: { Origin: base },
        data: { email: alice.email },
      })
    ).status(),
    403,
  );
  pass('Unauthenticated journal access and cross-origin/missing-header mutations are rejected');

  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Email address', { exact: true }).fill(alice.email);
  await page.getByRole('button', { name: 'Email me a code', exact: true }).click();
  await page.getByLabel('Email verification code', { exact: true }).fill('000000');
  await page.getByRole('button', { name: 'Verify & sign in', exact: true }).click();
  await page
    .getByText('Code is invalid or expired. Request a new code.', { exact: true })
    .waitFor();
  await page.getByLabel('Email verification code', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verify & sign in', exact: true }).click();
  await page.getByText('Synced', { exact: true }).waitFor();
  const cookies = (await context.cookies()).filter((c) =>
    c.name.startsWith('__Host-atlas-session'),
  );
  assert.ok(cookies.length > 0);
  assert.ok(cookies.every((c) => c.httpOnly && c.secure && c.sameSite === 'Lax' && c.path === '/'));
  assert.equal(await page.evaluate(() => document.cookie.includes('atlas-session')), false);
  assert.equal(
    await page.evaluate(() =>
      Object.keys(localStorage).some((k) => /auth-token|atlas-session/.test(k)),
    ),
    false,
  );
  const sessionResponse = await api(context).get(base + '/api/auth/session');
  assert.match(sessionResponse.headers()['cache-control'], /private, no-store/);
  const status = await sessionResponse.json();
  assert.deepEqual(Object.keys(status.user).sort(), ['email', 'id']);
  assert.equal(JSON.stringify(status).includes('access_token'), false);
  pass('Email OTP UI issues HttpOnly/Secure/SameSite cookies; no tokens in JavaScript or JSON');

  await page.goto(base + '/me', { waitUntil: 'networkidle' });
  await page.getByLabel('Display name', { exact: true }).fill('Alice');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await page.getByText('Synced', { exact: true }).waitFor();
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.getByLabel('Display name', { exact: true }).inputValue(), 'Alice');
  assert.equal(journals.get(alice.id).payload.profile.name, 'Alice');
  pass('Browser → authenticated API → journal save → reload works end to end');

  await page.getByLabel('Display name', { exact: true }).fill('Recover me');
  unavailable = true;
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await page.locator('.save-error').waitFor();
  assert.ok(
    await page.evaluate(() =>
      Object.keys(localStorage).some((k) => k.startsWith('atlas.draft.v1:cloud')),
    ),
  );
  await page.getByLabel('Display name', { exact: true }).fill('Newer edit');
  unavailable = false;
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await page.getByText('Synced', { exact: true }).waitFor();
  assert.equal(journals.get(alice.id).payload.profile.name, 'Recover me');
  const unsavedName = await page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem(
          Object.keys(localStorage).find((k) => k.startsWith('atlas.draft.v1:cloud')),
        ),
      ).value.name,
  );
  assert.equal(unsavedName, 'Newer edit');
  await page.getByRole('button', { name: 'Discard draft', exact: true }).click();
  pass('Failed saves retain drafts; delayed save acknowledgements do not erase newer edits');

  const other = await browser.newContext();
  assert.equal(
    (
      await api(other).post(base + '/api/auth/verify', {
        headers,
        data: { email: bob.email, token: '123456' },
      })
    ).status(),
    200,
  );
  const bobRead = await api(other).get(base + '/api/journal', {
    headers: { 'X-Atlas-User': bob.id },
  });
  assert.equal((await bobRead.json()).data.profile.name, 'Athlete');
  assert.equal(
    (
      await api(other).put(base + '/api/journal', {
        headers: { ...headers, 'X-Atlas-User': alice.id },
        data: { data: emptyData, revision: 0 },
      })
    ).status(),
    409,
  );
  assert.equal(
    (
      await api(context).put(base + '/api/journal', {
        headers: { ...headers, 'X-Atlas-User': alice.id },
        data: { data: emptyData, revision: 0 },
      })
    ).status(),
    409,
  );
  assert.equal(
    (
      await api(context).put(base + '/api/journal', {
        headers: { ...headers, 'X-Atlas-User': alice.id },
        data: { data: { version: 99 }, revision: 1 },
      })
    ).status(),
    400,
  );
  pass(
    'Two accounts remain isolated; stale revisions, mismatched users, and invalid payloads fail',
  );

  const expired = issue(alice, -60);
  await context.clearCookies();
  await context.addCookies([
    {
      name: '__Host-atlas-session',
      value: 'base64-' + Buffer.from(JSON.stringify(expired)).toString('base64url'),
      domain: '127.0.0.1',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  const refreshed = await api(context).get(base + '/api/auth/session');
  assert.equal((await refreshed.json()).user.id, alice.id);
  assert.ok(refreshCount > 0);
  assert.match(refreshed.headers()['set-cookie'], /HttpOnly/);
  pass('Expired access token refreshes server-side and rotates the session cookie');

  await page.getByLabel('Display name', { exact: true }).fill('Private draft');
  assert.ok(
    await page.evaluate(() =>
      Object.keys(localStorage).some((k) => k.startsWith('atlas.draft.v1:cloud')),
    ),
  );
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor();
  assert.equal(
    await page.evaluate(() =>
      Object.keys(localStorage).some((k) => k.startsWith('atlas.draft.v1:cloud')),
    ),
    false,
  );
  assert.equal(
    (
      await api(context).get(base + '/api/journal', { headers: { 'X-Atlas-User': alice.id } })
    ).status(),
    401,
  );
  assert.equal(
    (await context.cookies()).filter((c) => c.name.startsWith('__Host-atlas-session')).length,
    0,
  );
  pass('Sign-out clears auth cookies and private drafts; protected requests fail afterward');

  await context.addCookies([
    {
      name: '__Host-atlas-session',
      value: 'base64-' + Buffer.from(JSON.stringify(issue(alice))).toString('base64url'),
      domain: '127.0.0.1',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  unavailable = true;
  const outage = await api(context).get(base + '/api/auth/session');
  assert.equal(outage.status(), 503);
  assert.ok((await context.cookies()).some((c) => c.name.startsWith('__Host-atlas-session')));
  unavailable = false;
  pass('Provider outages report an error without destroying a valid session');

  for (let i = 0; i < 3; i++)
    await api(other).post(base + '/api/auth/otp', {
      headers,
      data: { email: 'limit@example.test' },
    });
  assert.equal(
    (
      await api(other).post(base + '/api/auth/otp', {
        headers,
        data: { email: 'limit@example.test' },
      })
    ).status(),
    429,
  );
  assert.deepEqual(errors, []);
  pass('Repeated OTP attempts are throttled; no uncaught browser errors');
  const oauth = await browser.newContext();
  const oauthPage = await oauth.newPage();
  await oauthPage.goto(base + '/me', { waitUntil: 'networkidle' });
  await oauthPage.getByRole('button', { name: 'Sign in', exact: true }).click();
  await oauthPage.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  await oauthPage.getByText('Synced', { exact: true }).waitFor();
  assert.equal(new URL(oauthPage.url()).pathname, '/me');
  assert.equal(new URL(oauthPage.url()).search, '');
  assert.equal((await (await api(oauth).get(base + '/api/auth/session')).json()).user.id, alice.id);
  const oauthCookies = await oauth.cookies();
  assert.ok(
    oauthCookies.some(
      (cookie) =>
        cookie.name.startsWith('__Host-atlas-session') && cookie.httpOnly && cookie.secure,
    ),
  );
  assert.ok(!oauthCookies.some((cookie) => cookie.name === '__Host-atlas-oauth'));
  assert.equal(await oauthPage.evaluate(() => document.cookie.includes('atlas-session')), false);
  pass(
    'Google button → provider redirect → PKCE callback → cloud journal works without exposing tokens',
  );

  const denied = await browser.newContext();
  const start = await api(denied).post(base + '/api/auth/google', {
    headers,
    data: { next: '//evil.example' },
  });
  assert.equal(start.status(), 200);
  const authorize = new URL((await start.json()).url);
  const callback = new URL(authorize.searchParams.get('redirect_to'));
  const guardCookies = await denied.cookies();
  assert.ok(
    guardCookies.some(
      (cookie) => cookie.name === '__Host-atlas-oauth' && cookie.httpOnly && cookie.secure,
    ),
  );
  callback.searchParams.set('error', 'access_denied');
  const cancelled = await api(denied).get(callback.href, { maxRedirects: 0 });
  assert.equal(cancelled.status(), 303);
  assert.equal(cancelled.headers().location, base + '/?auth=failed');
  assert.match(cancelled.headers()['cache-control'], /no-store/);
  assert.equal((await (await api(denied).get(base + '/api/auth/session')).json()).user, null);
  const injected = await api(denied).get(
    base + '/auth/callback?code=forged&state=forged&next=https://evil.example',
    { maxRedirects: 0 },
  );
  assert.equal(injected.headers().location, base + '/?auth=failed');
  assert.equal((await (await api(denied).get(base + '/api/auth/session')).json()).user, null);
  assert.equal(
    (
      await api(denied).post(base + '/api/auth/google', {
        headers: { ...headers, Origin: 'https://evil.example' },
        data: {},
      })
    ).status(),
    403,
  );
  assert.equal(
    (await api(oauth).post(base + '/api/auth/google', { headers, data: {} })).status(),
    409,
  );
  pass(
    'OAuth cancellation, callback injection, external return URLs, CSRF, and signed-in account replacement are rejected',
  );
  console.log(
    'Auth integration verified against a local mock provider. Real Supabase email delivery and PostgreSQL RLS still require live verification.',
  );
} catch (error) {
  console.error(logs.slice(-3000));
  throw error;
} finally {
  await browser?.close();
  app.kill('SIGTERM');
  upstream.closeAllConnections();
  await new Promise((resolve) => upstream.close(resolve));
}
