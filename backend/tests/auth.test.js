// Backend Unit Tests: Authentication & Ownership Security
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateManagementToken,
  hashToken,
  verifyManagementToken,
  verifyAdminAuth,
} from '../src/auth.js';

test('generateManagementToken generates 256 bits entropy raw token and salt', () => {
  const tokenData = generateManagementToken();
  assert.ok(tokenData.rawToken);
  assert.equal(tokenData.rawToken.length, 64); // 32 bytes hex = 64 hex chars
  assert.ok(/^[0-9a-f]{64}$/i.test(tokenData.rawToken));
  assert.ok(tokenData.salt);
  assert.equal(tokenData.salt.length, 32); // 16 bytes hex = 32 hex chars
  assert.ok(tokenData.tokenHash);
});

test('verifyManagementToken correctly compares token using constant-time check', () => {
  const { rawToken, salt, tokenHash } = generateManagementToken();

  // Valid token check
  const isMatch = verifyManagementToken(rawToken, salt, tokenHash);
  assert.equal(isMatch, true);

  // Altered token should fail
  const alteredToken = rawToken.substring(0, 63) + (rawToken[63] === 'a' ? 'b' : 'a');
  assert.equal(verifyManagementToken(alteredToken, salt, tokenHash), false);

  // Altered salt should fail
  const alteredSalt = salt.substring(0, 31) + (salt[31] === '0' ? '1' : '0');
  assert.equal(verifyManagementToken(rawToken, alteredSalt, tokenHash), false);

  // Invalid length or malformed token should fail safely
  assert.equal(verifyManagementToken('too-short', salt, tokenHash), false);
  assert.equal(verifyManagementToken(null, salt, tokenHash), false);
  assert.equal(verifyManagementToken(undefined, salt, tokenHash), false);
});

test('verifyAdminAuth rejects malformed or missing Authorization headers', async () => {
  const missingResult = await verifyAdminAuth(null);
  assert.equal(missingResult.isAuthenticated, false);

  const malformedResult = await verifyAdminAuth('Basic abc123');
  assert.equal(malformedResult.isAuthenticated, false);
});

test('verifyAdminAuth accepts valid test token in test mode', async () => {
  process.env.NODE_ENV = 'test';
  const result = await verifyAdminAuth('Bearer valid-admin-test-token');
  assert.equal(result.isAuthenticated, true);
  assert.equal(result.user.role, 'Administrator');
});
