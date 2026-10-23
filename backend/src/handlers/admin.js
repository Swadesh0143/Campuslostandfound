import { getDatabase } from '../db.js';
import { verifyAdminAuth } from '../auth.js';
import { createPresignedDownloadUrl } from '../s3.js';
import { mapItem } from './items.js';

export async function listAdminItemsHandler(queryParams = {}, headers = {}, clientOverride = null) {
  const authHeader = headers['authorization'] || headers['Authorization'];
  const auth = await verifyAdminAuth(authHeader);
  if (!auth.isAuthenticated) {
    return { statusCode: 401, body: { success: false, error: auth.error || 'Admin authorization required' } };
  }

  const database = getDatabase(clientOverride);
  const result = await database.query('SELECT * FROM items ORDER BY created_at DESC, item_id');
  const items = await Promise.all(result.rows.map(async (row) => {
    const item = mapItem(row);
    if (item.imageKey) {
      try {
        item.imageUrl = await createPresignedDownloadUrl({ objectKey: item.imageKey });
      } catch {
        item.imageUrl = null;
      }
    }
    return item;
  }));

  return {
    statusCode: 200,
    body: { success: true, items, count: items.length, adminUser: auth.user },
  };
}

export async function updateModerationStatusHandler(itemId, body, headers = {}, clientOverride = null) {
  const authHeader = headers['authorization'] || headers['Authorization'];
  const auth = await verifyAdminAuth(authHeader);
  if (!auth.isAuthenticated) {
    return { statusCode: 401, body: { success: false, error: auth.error || 'Admin authorization required' } };
  }

  const { moderationStatus, status } = body || {};
  if (!moderationStatus && !status) {
    return { statusCode: 400, body: { success: false, error: "Either 'moderationStatus' or 'status' is required" } };
  }
  if (moderationStatus && !['approved', 'flagged', 'hidden'].includes(moderationStatus)) {
    return { statusCode: 400, body: { success: false, error: "moderationStatus must be 'approved', 'flagged', or 'hidden'" } };
  }
  if (status && !['active', 'under_review', 'returned', 'archived'].includes(status)) {
    return { statusCode: 400, body: { success: false, error: "status must be 'active', 'under_review', 'returned', or 'archived'" } };
  }

  const database = getDatabase(clientOverride);
  const now = new Date().toISOString();
  const result = await database.query(
    `UPDATE items SET
       moderation_status = COALESCE($2, moderation_status),
       status = COALESCE($3, status),
       updated_at = $4,
       moderated_by = $5
     WHERE item_id = $1
     RETURNING item_id`,
    [itemId, moderationStatus || null, status || null, now, auth.user.username]
  );
  if (!result.rowCount) {
    return { statusCode: 404, body: { success: false, error: 'Item not found' } };
  }

  return {
    statusCode: 200,
    body: { success: true, message: `Item ${itemId} moderation updated successfully.`, moderationStatus, status },
  };
}
