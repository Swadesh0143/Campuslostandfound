// Management Handler: Report Ownership, Status Transitions, and Deletions
import { GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient } from '../db.js';
import { config } from '../config.js';
import { verifyManagementToken, verifyAdminAuth } from '../auth.js';
import { validateStatusTransition } from '../validation.js';
import { deleteS3Object } from '../s3.js';

/**
 * Helper to authenticate owner via token or administrator via Bearer token
 */
async function authenticateOwnerOrAdmin({ itemId, token, authHeader, docClient }) {
  // Check Admin first if authHeader provided
  if (authHeader) {
    const adminCheck = await verifyAdminAuth(authHeader);
    if (adminCheck.isAuthenticated) {
      return { authorized: true, isAdmin: true, user: adminCheck.user };
    }
  }

  // Token authentication
  if (!token) {
    return { authorized: false, statusCode: 401, error: 'Management token or admin authorization required' };
  }

  const ownershipResult = await docClient.send(
    new GetCommand({
      TableName: config.tables.ownership,
      Key: { itemId },
    })
  );

  const ownership = ownershipResult.Item;
  if (!ownership) {
    return { authorized: false, statusCode: 404, error: 'Ownership record not found for this report' };
  }

  // Check brute force lockout
  if (ownership.failedAttempts >= 5) {
    const lastFailed = new Date(ownership.lastFailedAt || 0).getTime();
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - lastFailed < oneHour) {
      return {
        authorized: false,
        statusCode: 429,
        error: 'Too many invalid attempts. Management for this item is temporarily locked. Try again later.',
      };
    }
  }

  const isValid = verifyManagementToken(token, ownership.salt, ownership.tokenHash);

  if (!isValid) {
    // Increment failed attempts
    try {
      await docClient.send(
        new UpdateCommand({
          TableName: config.tables.ownership,
          Key: { itemId },
          UpdateExpression: 'ADD #failed :inc SET #lastFailedAt = :now',
          ExpressionAttributeNames: { '#failed': 'failedAttempts', '#lastFailedAt': 'lastFailedAt' },
          ExpressionAttributeValues: { ':inc': 1, ':now': new Date().toISOString() },
        })
      );
    } catch (err) {
      console.warn('Failed to increment failed attempts:', err.message);
    }
    return { authorized: false, statusCode: 403, error: 'Invalid management token' };
  }

  // Record successful access and reset failed attempts
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: config.tables.ownership,
        Key: { itemId },
        UpdateExpression: 'SET #lastUsedAt = :now, #failed = :zero',
        ExpressionAttributeNames: { '#lastUsedAt': 'lastUsedAt', '#failed': 'failedAttempts' },
        ExpressionAttributeValues: { ':now': new Date().toISOString(), ':zero': 0 },
      })
    );
  } catch (err) {
    console.warn('Failed to update lastUsedAt:', err.message);
  }

  return { authorized: true, isAdmin: false, ownership };
}

/**
 * POST /manage/:itemId/verify - Check token validity
 */
export async function verifyTokenHandler(itemId, token, clientOverride = null) {
  if (!itemId || !token) {
    return {
      statusCode: 400,
      body: { success: false, valid: false, error: 'itemId and token are required' },
    };
  }

  const docClient = getDocClient(clientOverride);
  const auth = await authenticateOwnerOrAdmin({ itemId, token, docClient });

  if (!auth.authorized) {
    return {
      statusCode: auth.statusCode,
      body: { success: false, valid: false, error: auth.error },
    };
  }

  // Get item to return current title and status
  const itemResult = await docClient.send(
    new GetCommand({
      TableName: config.tables.items,
      Key: { itemId },
    })
  );

  return {
    statusCode: 200,
    body: {
      success: true,
      valid: true,
      allowedActions: auth.ownership?.allowedActions || ['update_status', 'delete_report'],
      item: itemResult.Item ? {
        itemId: itemResult.Item.itemId,
        name: itemResult.Item.name,
        type: itemResult.Item.type,
        status: itemResult.Item.status,
        eventDate: itemResult.Item.eventDate,
      } : null,
    },
  };
}

/**
 * PATCH /items/:itemId/status - Update item status (e.g. marked as 'returned' / 'recovered')
 */
export async function updateStatusHandler(itemId, body, headers = {}, clientOverride = null) {
  const token = headers['x-management-token'] || headers['X-Management-Token'] || body?.token;
  const authHeader = headers['authorization'] || headers['Authorization'];
  const newStatus = body?.status;

  if (!newStatus) {
    return { statusCode: 400, body: { success: false, error: "Field 'status' is required" } };
  }

  const docClient = getDocClient(clientOverride);
  const auth = await authenticateOwnerOrAdmin({ itemId, token, authHeader, docClient });

  if (!auth.authorized) {
    return { statusCode: auth.statusCode, body: { success: false, error: auth.error } };
  }

  // Get current item status
  const itemResult = await docClient.send(
    new GetCommand({
      TableName: config.tables.items,
      Key: { itemId },
    })
  );

  const currentItem = itemResult.Item;
  if (!currentItem) {
    return { statusCode: 404, body: { success: false, error: 'Item not found' } };
  }

  const transition = validateStatusTransition(currentItem.status, newStatus, auth.isAdmin);
  if (!transition.isAllowed) {
    return { statusCode: 400, body: { success: false, error: transition.reason } };
  }

  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: config.tables.items,
      Key: { itemId },
      UpdateExpression: 'SET #status = :newStatus, #updatedAt = :now, #resolvedAt = :now',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt',
        '#resolvedAt': 'resolvedAt',
      },
      ExpressionAttributeValues: {
        ':newStatus': newStatus,
        ':now': now,
      },
    })
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

/**
 * DELETE /items/:itemId - Delete or permanently archive an item
 */
export async function deleteItemHandler(itemId, headers = {}, clientOverride = null, s3Override = null) {
  const token = headers['x-management-token'] || headers['X-Management-Token'];
  const authHeader = headers['authorization'] || headers['Authorization'];

  const docClient = getDocClient(clientOverride);
  const auth = await authenticateOwnerOrAdmin({ itemId, token, authHeader, docClient });

  if (!auth.authorized) {
    return { statusCode: auth.statusCode, body: { success: false, error: auth.error } };
  }

  const itemResult = await docClient.send(
    new GetCommand({
      TableName: config.tables.items,
      Key: { itemId },
    })
  );

  const item = itemResult.Item;
  if (!item) {
    return { statusCode: 404, body: { success: false, error: 'Item not found' } };
  }

  // Delete associated S3 image if one exists
  if (item.imageKey) {
    try {
      await deleteS3Object({ objectKey: item.imageKey, client: s3Override });
    } catch (s3Err) {
      console.warn(`Could not delete S3 image ${item.imageKey}:`, s3Err.message);
    }
  }

  // Delete item record
  await docClient.send(
    new DeleteCommand({
      TableName: config.tables.items,
      Key: { itemId },
    })
  );

  // Delete ownership record
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: config.tables.ownership,
        Key: { itemId },
      })
    );
  } catch (err) {
    console.warn(`Could not delete ownership for ${itemId}:`, err.message);
  }

  return {
    statusCode: 200,
    body: {
      success: true,
      message: 'Item report successfully deleted and removed from database.',
    },
  };
}
