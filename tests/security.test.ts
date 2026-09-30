import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, assertSameOrigin, createRateLimiter, readJson } from '../src/lib/api-security';
import { DRAFT_TTL, draftKey, readDraft, writeDraft, workoutDraftSchema } from '../src/lib/drafts';
const request = (headers: Record<string, string> = {}, body = '{}') =>
  new Request('https://atlas.example/api/auth/otp', {
    method: 'POST',
    body,
    headers: {
      origin: 'https://atlas.example',
      'content-type': 'application/json',
      'x-atlas-request': '1',
      ...headers,
    },
  });
test('mutations require exact configured origin and custom request header', () => {
  assert.doesNotThrow(() => assertSameOrigin(request(), 'https://atlas.example', true));
  const invalid: Record<string, string>[] = [
    { origin: 'https://evil.example' },
    { origin: 'null' },
    { 'x-atlas-request': '' },
    { 'sec-fetch-site': 'cross-site' },
  ];
  for (const headers of invalid)
    assert.throws(
      () => assertSameOrigin(request(headers)),
      (e: unknown) => e instanceof ApiError && e.status === 403,
    );
  assert.throws(() => assertSameOrigin(request(), undefined, true));
  assert.throws(() => assertSameOrigin(request({ 'content-type': 'text/plain' })));
});
test('JSON bodies are bounded by actual byte count, not content-length', async () => {
  assert.deepEqual(await readJson(request({}, '{"ok":true}')), { ok: true });
  await assert.rejects(() => readJson(request({}, 'no-json')), /Invalid JSON/);
  await assert.rejects(
    () => readJson(request({ 'content-length': '1' }, '"' + 'x'.repeat(100) + '"'), 50),
    /too large/,
  );
});
test('auth throttle rejects repeat attempts and recovers after window', () => {
  const limit = createRateLimiter();
  limit('a', 2, 1000, 0);
  limit('a', 2, 1000, 0);
  assert.throws(() => limit('a', 2, 1000, 1), /Too many/);
  assert.doesNotThrow(() => limit('b', 2, 1000, 1));
  assert.doesNotThrow(() => limit('a', 2, 1000, 1001));
});
test('drafts are scoped, schema-validated, and expire after seven days', () => {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
  const key = draftKey('cloud:alice', 'workout:bench:new');
  const value = { date: '2026-09-30', note: 'Draft', sets: [{ weight: 40, reps: null }] };
  writeDraft(storage, key, value, workoutDraftSchema);
  assert.deepEqual(readDraft(storage, key, workoutDraftSchema), value);
  assert.equal(
    readDraft(storage, draftKey('cloud:bob', 'workout:bench:new'), workoutDraftSchema),
    null,
  );
  assert.equal(readDraft(storage, key, workoutDraftSchema, Date.now() + DRAFT_TTL + 1), null);
  assert.equal(map.has(key), false);
  storage.setItem(key, '{"version":1,"savedAt":0,"value":{"password":"bad"}}');
  assert.equal(readDraft(storage, key, workoutDraftSchema), null);
  assert.equal(map.has(key), false);
});
