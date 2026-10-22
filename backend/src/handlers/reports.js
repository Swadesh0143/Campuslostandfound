// Abuse Reporting & Moderation Handler
import crypto from 'crypto';
import {
  PutCommand,
  ScanCommand,
  UpdateCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import { getDocClient } from '../db.js';
import { config } from '../config.js';
import { validateReportInput } from '../validation.js';
import { verifyAdminAuth } from '../auth.js';

/**
 * POST /items/:itemId/report - Report suspicious or inappropriate listing
 */
export async function submitAbuseReportHandler(itemId, body, clientIp = 'unknown', clientOverride = null) {
  if (!itemId || typeof itemId !== 'string') {
    return { statusCode: 400, body: { success: false, error: 'Valid itemId parameter is required' } };
  }

  const validation = validateReportInput(body);
  if (!validation.isValid) {
    return {
      statusCode: 400,
      body: { success: false, error: 'Validation failed', details: validation.errors },
    };
  }

  const docClient = getDocClient(clientOverride);

  // Check item exists
  const itemCheck = await docClient.send(
    new GetCommand({
      TableName: config.tables.items,
      Key: { itemId },
    })
  );

  if (!itemCheck.Item) {
    return { statusCode: 404, body: { success: false, error: 'Item report not found' } };
  }

  const reportId = crypto.randomUUID();
  const now = new Date().toISOString();
  const ipHash = crypto.createHash('sha256').update(clientIp).digest('hex').substring(0, 16);

  const reportRecord = {
    reportId,
    itemId,
    itemName: itemCheck.Item.name,
    reason: validation.sanitized.reason,
    details: validation.sanitized.details,
    reporterIpHash: ipHash,
    status: 'pending',
    createdAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: config.tables.reports,
      Item: reportRecord,
    })
  );

  // Auto-flag item for moderation review if it gets reported
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: config.tables.items,
        Key: { itemId },
        UpdateExpression: 'SET #modStatus = :flagged, #flaggedAt = :now',
        ExpressionAttributeNames: { '#modStatus': 'moderationStatus', '#flaggedAt': 'flaggedAt' },
        ExpressionAttributeValues: { ':flagged': 'flagged', ':now': now },
      })
    );
  } catch (err) {
    console.warn(`Could not flag item ${itemId} on report:`, err.message);
  }

  return {
    statusCode: 201,
    body: {
      success: true,
      message: 'Thank you. Your report has been submitted to campus moderators for review.',
      reportId,
    },
  };
}

/**
 * GET /admin/reports - Moderation queue of pending reports (Admin only)
 */
export async function listAbuseReportsHandler(headers = {}, clientOverride = null) {
  const authHeader = headers['authorization'] || headers['Authorization'];
  const auth = await verifyAdminAuth(authHeader);

  if (!auth.isAuthenticated) {
    return {
      statusCode: 401,
      body: { success: false, error: auth.error || 'Admin authorization required' },
    };
  }

  const docClient = getDocClient(clientOverride);

  const result = await docClient.send(
    new ScanCommand({
      TableName: config.tables.reports,
      Limit: 50,
    })
  );

  const reports = result.Items || [];
  reports.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return {
    statusCode: 200,
    body: {
      success: true,
      reports,
      count: reports.length,
    },
  };
}

/**
 * PATCH /admin/reports/:reportId - Resolve or dismiss abuse report (Admin only)
 */
export async function resolveAbuseReportHandler(reportId, body, headers = {}, clientOverride = null) {
  const authHeader = headers['authorization'] || headers['Authorization'];
  const auth = await verifyAdminAuth(authHeader);

  if (!auth.isAuthenticated) {
    return {
      statusCode: 401,
      body: { success: false, error: auth.error || 'Admin authorization required' },
    };
  }

  const resolution = body?.status; // 'actioned' | 'dismissed'
  if (!['actioned', 'dismissed'].includes(resolution)) {
    return {
      statusCode: 400,
      body: { success: false, error: "Status must be 'actioned' or 'dismissed'" },
    };
  }

  const docClient = getDocClient(clientOverride);

  await docClient.send(
    new UpdateCommand({
      TableName: config.tables.reports,
      Key: { reportId },
      UpdateExpression: 'SET #status = :res, #resolvedAt = :now, #resolvedBy = :user',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#resolvedAt': 'resolvedAt',
        '#resolvedBy': 'resolvedBy',
      },
      ExpressionAttributeValues: {
        ':res': resolution,
        ':now': new Date().toISOString(),
        ':user': auth.user.username,
      },
    })
  );

  return {
    statusCode: 200,
    body: {
      success: true,
      message: `Report ${reportId} marked as ${resolution}`,
    },
  };
}
