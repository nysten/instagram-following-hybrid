const PRIVATE_PATTERNS = [
  /this account is private/i,
  /private account/i,
  /login to see their photos and videos/i,
];

const LOGIN_PATTERNS = [
  /please log in/i,
  /log in to continue/i,
  /challenge required/i,
  /suspicious login attempt/i,
];

const BLOCKED_PATTERNS = [
  /rate limit/i,
  /too many requests/i,
  /please wait a few minutes/i,
  /try again later/i,
];

function extractMeta(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i'));
  return match ? match[1].trim() : '';
}

export function classifyInstagramHtml(html = '') {
  const text = String(html);
  if (PRIVATE_PATTERNS.some((re) => re.test(text))) return 'private';
  if (LOGIN_PATTERNS.some((re) => re.test(text))) return 'login_required';
  if (BLOCKED_PATTERNS.some((re) => re.test(text))) return 'blocked';
  if (/page not found/i.test(text)) return 'not_found';
  return 'public_or_unknown';
}

export function extractProfileSummary(html = '', profileUrl = '') {
  const title = extractMeta(html, 'og:title');
  const description = extractMeta(html, 'og:description');
  const image = extractMeta(html, 'og:image');
  const usernameMatch = profileUrl.match(/instagram\.com\/([^/]+)/i);
  return {
    username: usernameMatch ? usernameMatch[1].toLowerCase() : '',
    title,
    description,
    profilePicUrl: image,
  };
}

export function extractCandidateUsernames(html = '', maxCount = 25) {
  const results = [];
  const seen = new Set();
  const linkRegex = /href=["']\/([^/"'?#]+)\/?["']/gi;
  let match;
  while ((match = linkRegex.exec(String(html))) && results.length < maxCount) {
    const username = match[1].trim().replace(/^@+/, '').toLowerCase();
    if (!username) continue;
    if (['explore', 'accounts', 'p', 'reel', 'reels', 'stories', 'about', 'developer'].includes(username)) continue;
    if (!/^[a-z0-9._]+$/.test(username)) continue;
    if (seen.has(username)) continue;
    seen.add(username);
    results.push({
      username,
      profileUrl: `https://www.instagram.com/${username}/`,
    });
  }
  return results;
}

export function buildStructuredState(html = '') {
  const state = classifyInstagramHtml(html);
  return {
    state,
    isPrivate: state === 'private',
    requiresLogin: state === 'login_required',
    isBlocked: state === 'blocked',
    isNotFound: state === 'not_found',
  };
}
