import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTargets } from '../src/lib/normalize.js';

test('normalizes usernames and urls', () => {
  const result = normalizeTargets({
    usernames: [' zuck ', 'https://www.instagram.com/therock/'],
    mode: 'plus',
    maxCount: 25,
  });

  assert.equal(result.targets.length, 2);
  assert.equal(result.targets[0].username, 'zuck');
  assert.equal(result.targets[1].username, 'therock');
  assert.equal(result.mode, 'plus');
});

test('caps maxCount by mode limit', () => {
  const result = normalizeTargets({
    usernames: ['zuck'],
    mode: 'free',
    maxCount: 999,
  });

  assert.equal(result.maxCount, 25);
});
