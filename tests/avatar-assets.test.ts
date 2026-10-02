import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assets from '../src/domain/avatar-assets.json';
import { avatars } from '../src/domain/avatars';

test('every avatar has an original, versioned, self-contained GLB and concept fallback', () => {
  assert.deepEqual(Object.keys(assets).sort(), avatars.map((avatar) => avatar.id).sort());
  const hashes = new Set();
  for (const avatar of avatars) {
    const asset = assets[avatar.id];
    const model = readFileSync(new URL(`../public${asset.model}`, import.meta.url));
    const hash = createHash('sha256').update(model).digest('hex').slice(0, 12);
    assert.ok(asset.model.endsWith(`-${hash}.glb`));
    hashes.add(hash);
    assert.equal(model.readUInt32LE(0), 0x46546c67);
    assert.equal(model.readUInt32LE(4), 2);
    assert.equal(model.readUInt32LE(8), model.length);
    assert.equal(asset.bytes, model.length);
    assert.ok(model.length < 3 * 1024 * 1024);
    assert.ok(asset.draws <= 20);
    assert.ok(asset.triangles < 130000);
    const json = JSON.parse(model.subarray(20, 20 + model.readUInt32LE(12)).toString());
    assert.equal(json.asset.version, '2.0');
    assert.ok(json.buffers.every((buffer: { uri?: string }) => !buffer.uri));
    assert.ok(!json.images?.length);
    for (const part of ['Body', 'Head', 'Cape'])
      assert.ok(json.nodes.some((node: { name: string }) => node.name === part));
    const poster = readFileSync(
      new URL(`../public/avatars/${avatar.id}-concept.webp`, import.meta.url),
    );
    assert.equal(poster.toString('ascii', 8, 12), 'WEBP');
  }
  assert.equal(hashes.size, 5);
});
