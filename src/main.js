import { normalizeTargets } from './lib/normalize.js';
import { buildStructuredState, extractCandidateUsernames, extractProfileSummary } from './lib/instagram.js';
import { pushDatasetItems, readInput, writeKeyValueRecord } from './lib/apify-rest.js';

function cookiesFromInput(cookies) {
  return typeof cookies === 'string' && cookies.trim() ? cookies.trim() : '';
}

function buildFetchHeaders(cookies) {
  const headers = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'accept-language': 'en-US,en;q=0.9,pt-BR;q=0.8',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };
  if (cookies) headers.cookie = cookies;
  return headers;
}

async function fetchHtml(url, cookies) {
  const response = await fetch(url, { headers: buildFetchHeaders(cookies), redirect: 'follow' });
  const text = await response.text();
  return { ok: response.ok, status: response.status, text, url: response.url };
}

function tierDefaults(mode) {
  if (mode === 'vip') return { maxCount: 1000, retryBudget: 3 };
  if (mode === 'plus') return { maxCount: 250, retryBudget: 2 };
  return { maxCount: 25, retryBudget: 1 };
}

async function collectFollowingForTarget(target, config) {
  const startedAt = Date.now();
  const cookies = cookiesFromInput(config.cookies);
  const fetchTargetUrl = target.followingUrl || target.profileUrl;
  const errors = [];
  const warnings = [];

  let page;
  try {
    page = await fetchHtml(fetchTargetUrl, cookies);
  } catch (error) {
    return {
      username: target.username,
      profileUrl: target.profileUrl,
      mode: config.mode,
      success: false,
      follows: [],
      followsCount: 0,
      warnings,
      errors: [`fetch_failed: ${error.message}`],
      timing: { startedAt, finishedAt: Date.now(), durationMs: Date.now() - startedAt },
    };
  }

  const state = buildStructuredState(page.text);
  const profile = config.includeProfile ? extractProfileSummary(page.text, page.url || target.profileUrl) : undefined;
  const candidates = extractCandidateUsernames(page.text, config.maxCount);

  if (state.isPrivate) errors.push('private_profile');
  if (state.requiresLogin) errors.push('login_required');
  if (state.isBlocked) errors.push('blocked_or_rate_limited');
  if (!page.ok) warnings.push(`http_${page.status}`);
  if (candidates.length === 0) warnings.push('no_following_candidates_found');
  if (config.mode === 'free' && cookies) warnings.push('cookies_ignored_in_free_mode');

  const follows = candidates.slice(0, config.maxCount);
  const success = follows.length > 0 && errors.length === 0;

  return {
    username: target.username,
    profileUrl: target.profileUrl,
    mode: config.mode,
    success,
    profile,
    state,
    follows,
    followsCount: follows.length,
    warnings,
    errors,
    timing: {
      startedAt,
      finishedAt: Date.now(),
      durationMs: Date.now() - startedAt,
    },
  };
}

async function main() {
  const rawInput = await readInput();
  const normalized = normalizeTargets(rawInput);
  const defaults = tierDefaults(normalized.mode);
  const config = {
    ...normalized,
    maxCount: Math.min(normalized.maxCount || defaults.maxCount, defaults.maxCount),
    cookies: normalized.cookies,
  };

  const results = [];
  for (const target of config.targets) {
    const result = await collectFollowingForTarget(target, config);
    results.push(result);
  }

  await pushDatasetItems(results);
  await writeKeyValueRecord('LAST_RUN_SUMMARY', {
    mode: config.mode,
    targetCount: config.targets.length,
    resultCount: results.length,
    successCount: results.filter((item) => item.success).length,
    failureCount: results.filter((item) => !item.success).length,
    timestamp: new Date().toISOString(),
  });

  if (!process.env.APIFY_TOKEN) {
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
