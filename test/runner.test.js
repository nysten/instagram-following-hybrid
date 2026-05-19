import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFetchHeaders, buildResultEnvelope, collectFollowingForTarget, tierProfile } from '../src/lib/runner.js';

test('resolves tier profiles', () => {
  assert.deepEqual(tierProfile('free'), { mode: 'free', maxCount: 25, retryBudget: 1, useCookies: false });
  assert.deepEqual(tierProfile('plus'), { mode: 'plus', maxCount: 250, retryBudget: 2, useCookies: true });
  assert.deepEqual(tierProfile('vip'), { mode: 'vip', maxCount: 1000, retryBudget: 3, useCookies: true });
});

test('builds fetch headers with cookies only when provided', () => {
  const headers = buildFetchHeaders('  foo=bar; baz=qux  ');
  assert.equal(headers.cookie, 'foo=bar; baz=qux');
  const noCookieHeaders = buildFetchHeaders('');
  assert.equal(Object.hasOwn(noCookieHeaders, 'cookie'), false);
});

test('drops diagnostics when disabled', () => {
  const result = buildResultEnvelope({
    username: 'zuck',
    profileUrl: 'https://www.instagram.com/zuck/',
    mode: 'plus',
    success: true,
    profile: { username: 'zuck' },
    state: { state: 'public_or_unknown' },
    follows: [],
    followsCount: 0,
    warnings: ['w'],
    errors: ['e'],
    timing: { durationMs: 1 },
  }, false);

  assert.deepEqual(result, {
    username: 'zuck',
    profileUrl: 'https://www.instagram.com/zuck/',
    mode: 'plus',
    success: true,
    follows: [],
    followsCount: 0,
  });
});

test('retries transient fetch errors in plus/vip modes', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) {
      return {
        ok: false,
        status: 503,
        url: 'https://www.instagram.com/zuck/following/',
        text: async () => '<html>try again later</html>',
      };
    }
    return {
      ok: true,
      status: 200,
      url: 'https://www.instagram.com/zuck/following/',
      text: async () => `
        <a href="/therock/">The Rock</a>
        <meta property="og:title" content="zuck" />
      `,
    };
  };

  const result = await collectFollowingForTarget(
    { username: 'zuck', profileUrl: 'https://www.instagram.com/zuck/', followingUrl: 'https://www.instagram.com/zuck/following/' },
    { mode: 'plus', maxCount: 10, cookies: 'sessionid=abc', includeProfile: false, includeDiagnostics: true, retryBudget: 1 },
    { fetchImpl, sleepImpl: async () => {} },
  );

  assert.equal(calls, 2);
  assert.equal(result.success, true);
  assert.equal(result.followsCount, 1);
  assert.equal(result.follows[0].username, 'therock');
});
