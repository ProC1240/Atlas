import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authDestination, readOAuthTransaction } from '../src/lib/oauth';

test('OAuth return paths are restricted to ATLAS pages', () => {
  assert.equal(authDestination('/me'), '/me');
  for (const path of [
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/api/auth/signout',
    '/me?next=https://evil.example',
    null,
  ])
    assert.equal(authDestination(path), '/');
});
test('OAuth requires a matching, unexpired browser transaction', () => {
  const state = 'a'.repeat(64);
  const raw = JSON.stringify({ state, next: '/me', expires: 2000 });
  assert.equal(readOAuthTransaction(raw, state, 1000)?.next, '/me');
  assert.equal(readOAuthTransaction(raw, state, 2000), null);
  assert.equal(readOAuthTransaction(raw, 'b'.repeat(64), 1000), null);
  assert.equal(readOAuthTransaction(raw, null, 1000), null);
  assert.equal(readOAuthTransaction(undefined, state, 1000), null);
  assert.equal(readOAuthTransaction('broken', state, 1000), null);
});
