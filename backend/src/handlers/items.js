// Items Handler: List, Get, Create
import crypto from 'crypto';
import {
  GetCommand,
  PutCommand,
  ScanCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { getDocClient } from '../db.js';
import { config } from '../config.js';
import { validateItemInput } from '../validation.js';
import { generateManagementToken } from '../auth.js';
import { createPresignedDownloadUrl } from '../s3.js';

/**
 * Strips sensitive contact details for public views
 */
function sanitizePublicItem(item) {
  if (!item) return null;
  const { contactMethod, ...publicItem } = item;
  return {
    ...publicItem,
    hasContactMethod: Boolean(contactMethod),
  };
}

/**
 * GET /items - Browse items with filtering, search and pagination
 */
export async function listItemsHandler(queryParams = {}, clientOverride = null) {
  const docClient = getDocClient(clientOverride);
  const {
    type,
    category,
    status = 'active',
    location,
    search,
    limit = 20,
    nextToken,
  } = queryParams;

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

  // Build filter expression
  const filterExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  // Status filter (unless 'all')
  if (status && status !== 'all') {
    filterExpressions.push('#status = :status');
    expressionAttributeNames['#status'] = 'status';
    expressionAttributeValues[':status'] = status;
  }

  // Type filter: 'lost' or 'found'
  if (type && ['lost', 'found'].includes(type)) {
    filterExpressions.push('#type = :type');
    expressionAttributeNames['#type'] = 'type';
    expressionAttributeValues[':type'] = type;
  }

  // Category filter
  if (category && category !== 'all') {
    filterExpressions.push('#category = :category');
    expressionAttributeNames['#category'] = 'category';
    expressionAttributeValues[':category'] = category;
  }

  // Location filter (partial match)
  if (location && location.trim()) {
    filterExpressions.push('contains(#location, :location)');
    expressionAttributeNames['#location'] = 'location';
    expressionAttributeValues[':location'] = location.trim();
  }

  // Search filter across name, description, location
  if (search && search.trim()) {
    const searchLower = search.trim().toLowerCase();
    filterExpressions.push('(contains(#nameLower, :search) OR contains(#descLower, :search) OR contains(#locationLower, :search))');
    expressionAttributeNames['#nameLower'] = 'nameLower';
    expressionAttributeNames['#descLower'] = 'descriptionLower';
    expressionAttributeNames['#locationLower'] = 'locationLower';
    expressionAttributeValues[':search'] = searchLower;
  }

  // Exclude hidden/moderated items from public list
  filterExpressions.push('(#moderationStatus = :modApproved OR attribute_not_exists(#moderationStatus))');
  expressionAttributeNames['#moderationStatus'] = 'moderationStatus';
  expressionAttributeValues[':modApproved'] = 'approved';

  const scanParams = {
    TableName: config.tables.items,
    Limit: parsedLimit,
  };

  if (filterExpressions.length > 0) {
    scanParams.FilterExpression = filterExpressions.join(' AND ');
    scanParams.ExpressionAttributeNames = expressionAttributeNames;
    scanParams.ExpressionAttributeValues = expressionAttributeValues;
  }

  if (nextToken) {
    try {
      scanParams.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf8'));
    } catch {
      return {
        statusCode: 400,
        body: { success: false, error: 'Invalid continuation nextToken format' },
      };
    }
  }

  const result = await docClient.send(new ScanCommand(scanParams));
  const rawItems = result.Items || [];

  // Sort newest first
  rawItems.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  // Sanitize public items and populate presigned image URLs
  const items = await Promise.all(
    rawItems.map(async (raw) => {
      const sanitized = sanitizePublicItem(raw);
      if (sanitized.imageKey) {
        try {
          sanitized.imageUrl = await createPresignedDownloadUrl({ objectKey: sanitized.imageKey });
        } catch {
          sanitized.imageUrl = null;
        }
      }
      return sanitized;
    })
  );

  let newNextToken = null;
  if (result.LastEvaluatedKey) {
    newNextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
  }

  return {
    statusCode: 200,
    body: {
      success: true,
      items,
      count: items.length,
      nextToken: newNextToken,
    },
  };
}

/**
 * GET /items/:itemId - Get single public item details
 */
export async function getItemHandler(itemId, clientOverride = null) {
  if (!itemId || typeof itemId !== 'string') {
    return { statusCode: 400, body: { success: false, error: 'Invalid or missing itemId' } };
  }

  const docClient = getDocClient(clientOverride);

  const getResult = await docClient.send(
    new GetCommand({
      TableName: config.tables.items,
      Key: { itemId },
    })
  );

  const rawItem = getResult.Item;
  if (!rawItem) {
    return {
      statusCode: 404,
      body: { success: false, error: 'Item report not found' },
    };
  }

  if (rawItem.moderationStatus === 'hidden') {
    return {
      statusCode: 404,
      body: { success: false, error: 'This item report has been removed or hidden by moderators.' },
    };
  }

  // Atomically increment view count
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: config.tables.items,
        Key: { itemId },
        UpdateExpression: 'ADD #views :inc',
        ExpressionAttributeNames: { '#views': 'viewCount' },
        ExpressionAttributeValues: { ':inc': 1 },
      })
    );
    rawItem.viewCount = (rawItem.viewCount || 0) + 1;
  } catch (err) {
    console.warn(`Could not increment view count for item ${itemId}:`, err.message);
  }

  const sanitized = sanitizePublicItem(rawItem);
  if (sanitized.imageKey) {
    try {
      sanitized.imageUrl = await createPresignedDownloadUrl({ objectKey: sanitized.imageKey });
    } catch {
      sanitized.imageUrl = null;
    }
  }

  return {
    statusCode: 200,
    body: {
      success: true,
      item: sanitized,
    },
  };
}

/**
 * POST /items - Create new lost or found report
 */
export async function createItemHandler(body, clientIp = 'unknown', clientOverride = null) {
  const validation = validateItemInput(body, true);
  if (!validation.isValid) {
    return {
      statusCode: 400,
      body: { success: false, error: 'Validation failed', details: validation.errors },
    };
  }

  const docClient = getDocClient(clientOverride);
  const now = new Date().toISOString();
  const itemId = crypto.randomUUID();

  // Cryptographically secure management token
  const { rawToken, salt, tokenHash } = generateManagementToken();

  const itemRecord = {
    itemId,
    name: validation.sanitized.name,
    nameLower: validation.sanitized.name.toLowerCase(),
    type: validation.sanitized.type,
    category: validation.sanitized.category,
    description: validation.sanitized.description,
    descriptionLower: validation.sanitized.description.toLowerCase(),
    location: validation.sanitized.location,
    locationLower: validation.sanitized.location.toLowerCase(),
    eventDate: validation.sanitized.eventDate,
    imageKey: validation.sanitized.imageKey,
    contactName: validation.sanitized.contactName,
    contactMethod: validation.sanitized.contactMethod,
    status: 'active',
    moderationStatus: 'approved',
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
    clientIpHash: crypto.createHash('sha256').update(clientIp).digest('hex').substring(0, 16),
  };

  const ownershipRecord = {
    itemId,
    tokenHash,
    salt,
    allowedActions: ['update_status', 'edit_details', 'delete_report'],
    failedAttempts: 0,
    createdAt: now,
    lastUsedAt: null,
  };

  // 1. Write item record
  await docClient.send(
    new PutCommand({
      TableName: config.tables.items,
      Item: itemRecord,
    })
  );

  // 2. Write ownership record
  try {
    await docClient.send(
      new PutCommand({
        TableName: config.tables.ownership,
        Item: ownershipRecord,
      })
    );
  } catch (ownershipError) {
    console.error('Failed to write ownership record. Rolling back item record...', ownershipError);
    // Cleanup to prevent orphaned records
    await docClient.send(
      new UpdateCommand({
        TableName: config.tables.items,
        Key: { itemId },
        UpdateExpression: 'SET #status = :archived',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':archived': 'archived' },
      })
    );
    return {
      statusCode: 500,
      body: { success: false, error: 'Failed to securely store report ownership record.' },
    };
  }

  const publicItem = sanitizePublicItem(itemRecord);
  if (publicItem.imageKey) {
    publicItem.imageUrl = await createPresignedDownloadUrl({ objectKey: publicItem.imageKey });
  }

  return {
    statusCode: 201,
    body: {
      success: true,
      message: 'Item reported successfully!',
      item: publicItem,
      management: {
        token: rawToken,
        manageUrl: `/manage/${itemId}?token=${rawToken}`,
        warning: 'Save this management link! Anyone with this link can update or resolve this report.',
      },
    },
  };
}
