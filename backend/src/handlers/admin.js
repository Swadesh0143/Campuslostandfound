// Admin Handler: Protected Management & Moderation
import { ScanCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient } from '../db.js';
import { config } from '../config.js';
import { verifyAdminAuth } from '../auth.js';
import { createPresignedDownloadUrl } from '../s3.js';

/**
 * GET /admin/items - Full items list for administrators (includes flagged, hidden, private details)
 */
export async function listAdminItemsHandler(queryParams = {}, headers = {}, clientOverride = null) {
  const authHeader = headers['authorization'] || headers['Authorization'];
  const auth = await verifyAdminAuth(authHeader);

  if (!auth.isAuthenticated) {
    return {
      statusCode: 401,
      body: { success: false, error: auth.error || 'Admin authorization required' },
    };
  }

  const docClient = getDocClient(clientOverride);

  const scanParams = {
    TableName: config.tables.items,
    Limit: 100,
  };

  const result = await docClient.send(new ScanCommand(scanParams));
  const rawItems = result.Items || [];

  // Sort newest first
  rawItems.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  // Populate presigned image URLs
  const items = await Promise.all(
    rawItems.map(async (item) => {
      if (item.imageKey) {
        try {
          item.imageUrl = await createPresignedDownloadUrl({ objectKey: item.imageKey });
        } catch {
          item.imageUrl = null;
        }
      }
      return item;
    })
  );

  return {
    statusCode: 200,
    body: {
      success: true,
      items,
      count: items.length,
      adminUser: auth.user,
    },
  };
}

/**
 * PATCH /admin/items/:itemId/moderation - Moderate an item (approve, flag, hide, or archive)
 */
export async function updateModerationStatusHandler(itemId, body, headers = {}, clientOverride = null) {
  const authHeader = headers['authorization'] || headers['Authorization'];
  const auth = await verifyAdminAuth(authHeader);

  if (!auth.isAuthenticated) {
    return {
      statusCode: 401,
      body: { success: false, error: auth.error || 'Admin authorization required' },
    };
  }

  const { moderationStatus, status } = body || {};

  if (!moderationStatus && !status) {
    return {
      statusCode: 400,
      body: { success: false, error: "Either 'moderationStatus' or 'status' is required" },
    };
  }

  const docClient = getDocClient(clientOverride);
  const now = new Date().toISOString();

  const updateExpressions = ['#updatedAt = :now', '#moderatedBy = :modUser'];
  const expNames = { '#updatedAt': 'updatedAt', '#moderatedBy': 'moderatedBy' };
  const expValues = { ':now': now, ':modUser': auth.user.username };

  if (moderationStatus) {
    if (!['approved', 'flagged', 'hidden'].includes(moderationStatus)) {
      return {
        statusCode: 400,
        body: { success: false, error: "moderationStatus must be 'approved', 'flagged', or 'hidden'" },
      };
    }
    updateExpressions.push('#modStatus = :modStatus');
    expNames['#modStatus'] = 'moderationStatus';
    expValues[':modStatus'] = moderationStatus;
  }

  if (status) {
    if (!['active', 'under_review', 'returned', 'archived'].includes(status)) {
      return {
        statusCode: 400,
        body: { success: false, error: "status must be 'active', 'under_review', 'returned', or 'archived'" },
      };
    }
    updateExpressions.push('#status = :status');
    expNames['#status'] = 'status';
    expValues[':status'] = status;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: config.tables.items,
      Key: { itemId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expNames,
      ExpressionAttributeValues: expValues,
    })
  );

  return {
    statusCode: 200,
    body: {
      success: true,
      message: `Item ${itemId} moderation updated successfully.`,
      moderationStatus,
      status,
    },
  };
}
