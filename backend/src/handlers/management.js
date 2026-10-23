import { getDatabase, withTransaction } from '../db.js';
import { verifyManagementToken, verifyAdminAuth } from '../auth.js';
import { validateStatusTransition } from '../validation.js';
import { deleteS3Object } from '../s3.js';

function mapOwnership(row) {
  if (!row) return null;
  return {
    itemId: row.item_id,
    tokenHash: row.token_hash,
    salt: row.salt,
    allowedActions: row.allowed_actions,
    failedAttempts: row.failed_attempts,
    lastFailedAt: row.last_failed_at,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
  };
}

async function authenticateOwnerOrAdmin({ itemId, token, authHeader, database }) {
  if (authHeader) {
    const adminCheck = await verifyAdminAuth(authHeader);
    if (adminCheck.isAuthenticated) {
      return { authorized: true, isAdmin: true, user: adminCheck.user };
    }
  }

  if (!token) {
    return { authorized: false, statusCode: 401, error: 'Management token or admin authorization required' };
  }

  const result = await database.query('SELECT * FROM ownership WHERE item_id = $1', [itemId]);
  const ownership = mapOwnership(result.rows[0]);
  if (!ownership) {
    return { authorized: false, statusCode: 404, error: 'Ownership record not found for this report' };
  }

  if (ownership.failedAttempts >= 5) {
    const lastFailed = new Date(ownership.lastFailedAt || 0).getTime();
    if (Date.now() - lastFailed < 60 * 60 * 1000) {
      return {
        authorized: false,
        statusCode: 429,
        error: 'Too many invalid attempts. Management for this item is temporarily locked. Try again later.',
      };
    }
  }

  if (!verifyManagementToken(token, ownership.salt, ownership.tokenHash)) {
    try {
      await database.query(
        `UPDATE ownership
         SET failed_attempts = failed_attempts + 1, last_failed_at = $2
         WHERE item_id = $1`,
        [itemId, new Date().toISOString()]
      );
    } catch (error) {
      console.warn('Failed to increment failed attempts:', error.message);
    }
    return { authorized: false, statusCode: 403, error: 'Invalid management token' };
  }

  try {
    await database.query(
      'UPDATE ownership SET last_used_at = $2, failed_attempts = 0 WHERE item_id = $1',
      [itemId, new Date().toISOString()]
    );
  } catch (error) {
    console.warn('Failed to update last_used_at:', error.message);
  }

  return { authorized: true, isAdmin: false, ownership };
}

export async function verifyTokenHandler(itemId, token, clientOverride = null) {
  if (!itemId || !token) {
    return { statusCode: 400, body: { success: false, valid: false, error: 'itemId and token are required' } };
  }

  const database = getDatabase(clientOverride);
  const auth = await authenticateOwnerOrAdmin({ itemId, token, database });
  if (!auth.authorized) {
    return { statusCode: auth.statusCode, body: { success: false, valid: false, error: auth.error } };
  }

  const result = await database.query(
    'SELECT item_id, name, type, status, event_date FROM items WHERE item_id = $1',
    [itemId]
  );
  const row = result.rows[0];
  return {
    statusCode: 200,
    body: {
      success: true,
      valid: true,
      allowedActions: auth.ownership?.allowedActions || ['update_status', 'delete_report'],
      item: row ? {
        itemId: row.item_id,
        name: row.name,
        type: row.type,
        status: row.status,
        eventDate: row.event_date instanceof Date ? row.event_date.toISOString().slice(0, 10) : row.event_date,
      } : null,
    },
  };
}

export async function updateStatusHandler(itemId, body, headers = {}, clientOverride = null) {
  const token = headers['x-management-token'] || headers['X-Management-Token'] || body?.token;
  const authHeader = headers['authorization'] || headers['Authorization'];
  const newStatus = body?.status;
  if (!newStatus) {
    return { statusCode: 400, body: { success: false, error: "Field 'status' is required" } };
  }

  const database = getDatabase(clientOverride);
  const auth = await authenticateOwnerOrAdmin({ itemId, token, authHeader, database });
  if (!auth.authorized) {
    return { statusCode: auth.statusCode, body: { success: false, error: auth.error } };
  }

  const itemResult = await database.query('SELECT status FROM items WHERE item_id = $1', [itemId]);
  const currentItem = itemResult.rows[0];
  if (!currentItem) return { statusCode: 404, body: { success: false, error: 'Item not found' } };

  const transition = validateStatusTransition(currentItem.status, newStatus, auth.isAdmin);
  if (!transition.isAllowed) {
    return { statusCode: 400, body: { success: false, error: transition.reason } };
  }

  const now = new Date().toISOString();
  await database.query(
    `UPDATE items
     SET status = $2, updated_at = $3,
         resolved_at = CASE WHEN $2 IN ('returned', 'archived') THEN $3 ELSE resolved_at END
     WHERE item_id = $1`,
    [itemId, newStatus, now]
  );

  return {
    statusCode: 200,
    body: {
      success: true,
      message: `Item status successfully updated to '${newStatus}'.`,
      status: newStatus,
      updatedAt: now,
    },
  };
}

export async function deleteItemHandler(itemId, headers = {}, clientOverride = null, s3Override = null) {
  const token = headers['x-management-token'] || headers['X-Management-Token'];
  const authHeader = headers['authorization'] || headers['Authorization'];
  const database = getDatabase(clientOverride);
  const auth = await authenticateOwnerOrAdmin({ itemId, token, authHeader, database });
  if (!auth.authorized) {
    return { statusCode: auth.statusCode, body: { success: false, error: auth.error } };
  }

  const itemResult = await database.query('SELECT image_key FROM items WHERE item_id = $1', [itemId]);
  const item = itemResult.rows[0];
  if (!item) return { statusCode: 404, body: { success: false, error: 'Item not found' } };

  if (item.image_key) {
    try {
      await deleteS3Object({ objectKey: item.image_key, client: s3Override });
    } catch (error) {
      console.warn(`Could not delete S3 image ${item.image_key}:`, error.message);
    }
  }

  await withTransaction((client) => client.query('DELETE FROM items WHERE item_id = $1', [itemId]), database);
  return {
    statusCode: 200,
    body: { success: true, message: 'Item report successfully deleted and removed from database.' },
  };
}
