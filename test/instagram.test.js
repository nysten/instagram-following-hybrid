import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStructuredState,
  classifyInstagramHtml,
  extractCandidateUsernames,
  extractProfileSummary,
} from '../src/lib/instagram.js';

test('classifies private and login html', () => {
  assert.equal(classifyInstagramHtml('<html>This account is private</html>'), 'private');
  assert.equal(classifyInstagramHtml('<html>Please log in to continue</html>'), 'login_required');
});

test('extracts candidate usernames from anchors', () => {
  const html = `
    <a href="/therock/">The Rock</a>
    <a href="/zuck/">zuck</a>
    <a href="/explore/">Explore</a>
  `;
  const results = extractCandidateUsernames(html, 10);
  assert.deepEqual(results.map((item) => item.username), ['therock', 'zuck']);
});

test('extracts profile summary meta tags', () => {
  const html = `
    <meta property="og:title" content="zuck (@zuck) • Instagram photos and videos" />
    <meta property="og:description" content="2,345 followers, 120 following, 35 posts - see Instagram photos and videos from zuck" />
    <meta property="og:image" content="https://example.com/avatar.jpg" />
  `;
  const summary = extractProfileSummary(html, 'https://www.instagram.com/zuck/');
  assert.equal(summary.username, 'zuck');
  assert.equal(summary.title, 'zuck (@zuck) • Instagram photos and videos');
  assert.equal(summary.profilePicUrl, 'https://example.com/avatar.jpg');
});

test('builds structured state', () => {
  const state = buildStructuredState('<html>rate limit</html>');
  assert.equal(state.isBlocked, true);
});
