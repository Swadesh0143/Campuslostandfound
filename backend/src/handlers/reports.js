import crypto from 'crypto';
import { getDatabase, withTransaction } from '../db.js';
import { validateReportInput } from '../validation.js';
import { verifyAdminAuth } from '../auth.js';

function mapReport(row) {
  return {
    reportId: row.report_id,
    itemId: row.item_id,
    itemName: row.item_name,
    reason: row.reason,
    details: row.details,
    reporterIpHash: row.reporter_ip_hash,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : undefined,
    resolvedBy: row.resolved_by || undefined,
  };
}

export async function submitAbuseReportHandler(itemId, body, clientIp = 'unknown', clientOverride = null) {
  if (!itemId || typeof itemId !== 'string') {
    return { statusCode: 400, body: { success: false, error: 'Valid itemId parameter is required' } };
  }

  const validation = validateReportInput(body);
  if (!validation.isValid) {
    return { statusCode: 400, body: { success: false, error: 'Validation failed', details: validation.errors } };
  }

  const database = getDatabase(clientOverride);
  const itemResult = await database.query('SELECT name FROM items WHERE item_id = $1', [itemId]);
  const item = itemResult.rows[0];
  if (!item) return { statusCode: 404, body: { success: false, error: 'Item report not found' } };

  const reportId = crypto.randomUUID();
  const now = new Date().toISOString();
  const ipHash = crypto.createHash('sha256').update(clientIp).digest('hex').substring(0, 16);
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO abuse_reports
       (report_id, item_id, item_name, reason, details, reporter_ip_hash, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)`,
      [reportId, itemId, item.name, validation.sanitized.reason, validation.sanitized.details, ipHash, now]
    );
    await client.query(
      `UPDATE items SET moderation_status = 'flagged', flagged_at = $2 WHERE item_id = $1`,
      [itemId, now]
    );
  }, database);

  return {
    statusCode: 201,
    body: {
      success: true,
      message: 'Thank you. Your report has been submitted to campus moderators for review.',
      reportId,
    },
  };
}

export async function listAbuseReportsHandler(headers = {}, clientOverride = null) {
  const authHeader = headers['authorization'] || headers['Authorization'];
  const auth = await verifyAdminAuth(authHeader);
  if (!auth.isAuthenticated) {
    return { statusCode: 401, body: { success: false, error: auth.error || 'Admin authorization required' } };
  }

  const database = getDatabase(clientOverride);
  const result = await database.query(
    'SELECT * FROM abuse_reports ORDER BY created_at DESC, report_id'
  );
  const reports = result.rows.map(mapReport);
  return { statusCode: 200, body: { success: true, reports, count: reports.length } };
}

export async function resolveAbuseReportHandler(reportId, body, headers = {}, clientOverride = null) {
  const authHeader = headers['authorization'] || headers['Authorization'];
  const auth = await verifyAdminAuth(authHeader);
  if (!auth.isAuthenticated) {
    return { statusCode: 401, body: { success: false, error: auth.error || 'Admin authorization required' } };
  }

  const resolution = body?.status;
  if (!['actioned', 'dismissed'].includes(resolution)) {
    return { statusCode: 400, body: { success: false, error: "Status must be 'actioned' or 'dismissed'" } };
  }

  const database = getDatabase(clientOverride);
  const result = await database.query(
    `UPDATE abuse_reports
     SET status = $2, resolved_at = $3, resolved_by = $4
     WHERE report_id = $1
     RETURNING report_id`,
    [reportId, resolution, new Date().toISOString(), auth.user.username]
  );
  if (!result.rowCount) {
    return { statusCode: 404, body: { success: false, error: 'Abuse report not found' } };
  }

  return { statusCode: 200, body: { success: true, message: `Report ${reportId} marked as ${resolution}` } };
}
