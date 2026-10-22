// Authentication & Ownership Security Module
import crypto from 'crypto';
import { CognitoIdentityProviderClient, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { config } from './config.js';

let cognitoClientInstance = null;

function getCognitoClient() {
  if (!cognitoClientInstance) {
    cognitoClientInstance = new CognitoIdentityProviderClient({ region: config.region });
  }
  return cognitoClientInstance;
}

export function setCognitoClientForTesting(client) {
  cognitoClientInstance = client;
}

/**
 * Generates a cryptographically strong 256-bit management token and hash.
 * Returns the raw token (to be sent ONCE to the reporter) and the salt/hash (to be stored in DynamoDB).
 */
export function generateManagementToken() {
  const rawToken = crypto.randomBytes(32).toString('hex'); // 64 hex characters = 256 bits of entropy
  const salt = crypto.randomBytes(16).toString('hex');
  const tokenHash = hashToken(rawToken, salt);

  return {
    rawToken,
    salt,
    tokenHash,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Hashes a raw token with salt using SHA-256
 */
export function hashToken(rawToken, salt) {
  return crypto.createHash('sha256').update(`${rawToken}:${salt}`).digest('hex');
}

/**
 * Validates a user-supplied raw token against stored salt and tokenHash.
 * Uses constant-time comparison to prevent timing side-channel attacks.
 */
export function verifyManagementToken(rawToken, salt, storedHash) {
  if (!rawToken || !salt || !storedHash || typeof rawToken !== 'string') {
    return false;
  }

  // Raw token must be exactly 64 hex characters
  if (!/^[a-f0-9]{64}$/i.test(rawToken)) {
    return false;
  }

  const computedHash = hashToken(rawToken, salt);

  const bufA = Buffer.from(computedHash, 'utf8');
  const bufB = Buffer.from(storedHash, 'utf8');

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies admin credentials from Authorization header.
 * Supports Amazon Cognito Access Token / ID Token and local development override.
 */
export async function verifyAdminAuth(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') {
    return { isAuthenticated: false, error: 'Missing Authorization header' };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return { isAuthenticated: false, error: 'Invalid Authorization format. Expected Bearer <token>' };
  }

  const token = parts[1];

  // Check emergency/dev secret override if configured
  if (config.adminSecret && token === config.adminSecret) {
    return {
      isAuthenticated: true,
      user: {
        username: 'admin-dev',
        role: 'Administrator',
        email: 'admin@campusfind.local',
      },
    };
  }

  // Cognito Token Verification via GetUser API or JWT payload
  if (!config.cognito.userPoolId && !config.cognito.clientId) {
    // If Cognito is not yet configured, allow safe local mock admin if in local dev mode
    if (process.env.NODE_ENV === 'test' || process.env.LOCAL_DEV === 'true') {
      if (token === 'valid-admin-test-token') {
        return {
          isAuthenticated: true,
          user: { username: 'test-admin', role: 'Administrator', email: 'testadmin@campus.edu' },
        };
      }
    }
    return { isAuthenticated: false, error: 'Cognito authentication is not configured on this environment' };
  }

  try {
    const client = getCognitoClient();
    const command = new GetUserCommand({
      AccessToken: token,
    });
    const cognitoUser = await client.send(command);

    const emailAttr = cognitoUser.UserAttributes?.find((a) => a.Name === 'email');
    const roleAttr = cognitoUser.UserAttributes?.find((a) => a.Name === 'custom:role');

    return {
      isAuthenticated: true,
      user: {
        username: cognitoUser.Username,
        email: emailAttr ? emailAttr.Value : null,
        role: roleAttr ? roleAttr.Value : 'Administrator',
      },
    };
  } catch (err) {
    return {
      isAuthenticated: false,
      error: `Invalid or expired admin session token: ${err.message}`,
    };
  }
}
