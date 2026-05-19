const MODE_LIMITS = {
  free: 25,
  plus: 250,
  vip: 1000,
};

function cleanUsername(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const maybeUrl = new URL(trimmed);
    if (maybeUrl.hostname.includes('instagram.com')) {
      const parts = maybeUrl.pathname.split('/').filter(Boolean);
      const username = parts[0] || '';
      return username.replace(/^@+/, '').toLowerCase();
    }
  } catch {
    // Not a URL.
  }
  return trimmed.replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
}

function profileUrlForUsername(username) {
  return `https://www.instagram.com/${username}/`;
}

function followingUrlForUsername(username) {
  return `https://www.instagram.com/${username}/following/`;
}

function normalizeArray(values) {
  if (!Array.isArray(values)) return [];
  return values.filter((value) => typeof value === 'string' && value.trim().length > 0);
}

export function normalizeTargets(input = {}) {
  const mode = String(input.mode || 'free').toLowerCase();
  const normalizedMode = Object.hasOwn(MODE_LIMITS, mode) ? mode : 'free';
  const maxCount = Number.isInteger(input.maxCount) && input.maxCount > 0
    ? input.maxCount
    : MODE_LIMITS[normalizedMode];
  const usernames = normalizeArray(input.usernames);
  const directUrls = normalizeArray(input.directUrls);
  const seen = new Set();
  const targets = [];

  for (const raw of [...usernames, ...directUrls]) {
    const username = cleanUsername(raw);
    if (!username || seen.has(username)) continue;
    seen.add(username);
    targets.push({
      username,
      profileUrl: profileUrlForUsername(username),
      followingUrl: followingUrlForUsername(username),
      sourceType: raw.includes('instagram.com') ? 'url' : 'username',
    });
  }

  return {
    mode: normalizedMode,
    maxCount: Math.min(maxCount, MODE_LIMITS[normalizedMode]),
    cookies: typeof input.cookies === 'string' ? input.cookies.trim() : '',
    includeProfile: input.includeProfile !== false,
    includeDiagnostics: input.includeDiagnostics !== false,
    targets,
  };
}

export { cleanUsername, profileUrlForUsername, followingUrlForUsername, MODE_LIMITS };
