import { normalizeTargets } from './normalize.js';
import { buildStructuredState, extractCandidateUsernames, extractProfileSummary } from './instagram.js';
import { pushDatasetItems, readInput, writeKeyValueRecord } from './apify-rest.js';

export function tierProfile(mode = 'free') {
  const normalizedMode = String(mode || 'free').toLowerCase();
  if (normalizedMode === 'vip') {
    return { mode: 'vip', maxCount: 1000, retryBudget: 3, useCookies: true };
  }
  if (normalizedMode === 'plus') {
    return { mode: 'plus', maxCount: 250, retryBudget: 2, useCookies: true };
  }
  return { mode: 'free', maxCount: 25, retryBudget: 1, useCookies: false };
}

export function buildFetchHeaders(cookies = '') {
  const headers = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'accept-language': 'en-US,en;q=0.9,pt-BR;q=0.8',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };
  const normalizedCookies = typeof cookies === 'string' ? cookies.trim() : '';
  if (normalizedCookies) headers.cookie = normalizedCookies;
  return headers;
}

export function buildResultEnvelope(result, includeDiagnostics) {
  if (includeDiagnostics) return result;
  const {
    profile,
    state,
    warnings,
    errors,
    timing,
    ...minimal
  } = result;
  return minimal;
}

async function sleep(ms) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtml(url, cookies, fetchImpl = fetch, retryBudget = 1, sleepImpl = sleep) {
  const attempts = Math.max(1, retryBudget + 1);
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: buildFetchHeaders(cookies),
        redirect: 'follow',
      });
      const text = await response.text();
      if ([429, 500, 502, 503, 504].includes(response.status) && attempt < attempts) {
        await sleepImpl(250 * attempt);
        continue;
      }
      return { ok: response.ok, status: response.status, text, url: response.url };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleepImpl(250 * attempt);
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('fetch failed');
}

export async function collectFollowingForTarget(target, config, deps = {}) {
  const startedAt = Date.now();
  const fetchImpl = deps.fetchImpl || fetch;
  const sleepImpl = deps.sleepImpl || sleep;
  const retryBudget = Number.isInteger(config.retryBudget) ? config.retryBudget : tierProfile(config.mode).retryBudget;
  const cookies = config.mode === 'free' ? '' : (typeof config.cookies === 'string' ? config.cookies.trim() : '');
  const fetchTargetUrl = target.followingUrl || target.profileUrl;
  const errors = [];
  const warnings = [];

  let page;
  try {
    page = await fetchHtml(fetchTargetUrl, cookies, fetchImpl, retryBudget, sleepImpl);
  } catch (error) {
    return buildResultEnvelope({
      username: target.username,
      profileUrl: target.profileUrl,
      mode: config.mode,
      success: false,
      profile: undefined,
      state: { state: 'fetch_failed', isPrivate: false, requiresLogin: false, isBlocked: false, isNotFound: false },
      follows: [],
      followsCount: 0,
      warnings,
      errors: [`fetch_failed: ${error.message}`],
      timing: { startedAt, finishedAt: Date.now(), durationMs: Date.now() - startedAt },
    }, config.includeDiagnostics);
  }

  const state = buildStructuredState(page.text);
  const profile = config.includeProfile ? extractProfileSummary(page.text, page.url || target.profileUrl) : undefined;
  const candidates = extractCandidateUsernames(page.text, config.maxCount);

  if (state.isPrivate) errors.push('private_profile');
  if (state.requiresLogin) errors.push('login_required');
  if (state.isBlocked) errors.push('blocked_or_rate_limited');
  if (!page.ok) warnings.push(`http_${page.status}`);
  if (candidates.length === 0) warnings.push('no_following_candidates_found');
  if (config.mode === 'free' && typeof config.cookies === 'string' && config.cookies.trim()) {
    warnings.push('cookies_ignored_in_free_mode');
  }

  const follows = candidates.slice(0, config.maxCount);
  const success = follows.length > 0 && errors.length === 0;
  const result = {
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

  return buildResultEnvelope(result, config.includeDiagnostics);
}

export async function runActor(deps = {}) {
  const rawInput = deps.readInput || readInput;
  const pushItems = deps.pushDatasetItems || pushDatasetItems;
  const writeRecord = deps.writeKeyValueRecord || writeKeyValueRecord;

  const raw = await rawInput();
  const normalized = normalizeTargets(raw);
  if (!normalized.complianceAck) {
    throw new Error('compliance_ack_required');
  }
  const tier = tierProfile(normalized.mode);
  const config = {
    ...normalized,
    maxCount: Math.min(normalized.maxCount || tier.maxCount, tier.maxCount),
    retryBudget: tier.retryBudget,
    cookies: normalized.cookies,
  };

  const results = [];
  for (const target of config.targets) {
    const result = await collectFollowingForTarget(target, config, deps);
    results.push(result);
  }

  await pushItems(results);
  await writeRecord('LAST_RUN_SUMMARY', {
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

  return results;
}
