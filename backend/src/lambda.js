// AWS Lambda Entry Point for API Gateway HTTP API v2
import { config } from './config.js';
import { listItemsHandler, getItemHandler, createItemHandler } from './handlers/items.js';
import { presignUploadHandler } from './handlers/uploads.js';
import { verifyTokenHandler, updateStatusHandler, deleteItemHandler } from './handlers/management.js';
import { getContactHandler } from './handlers/contact.js';
import { submitAbuseReportHandler, listAbuseReportsHandler, resolveAbuseReportHandler } from './handlers/reports.js';
import { listAdminItemsHandler, updateModerationStatusHandler } from './handlers/admin.js';
import { getStatsHandler } from './handlers/stats.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': config.cors.allowedOrigin,
  'Access-Control-Allow-Methods': config.cors.allowedMethods,
  'Access-Control-Allow-Headers': config.cors.allowedHeaders,
  'Access-Control-Allow-Credentials': 'false',
  'Content-Type': 'application/json',
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

/**
 * Normalizes HTTP API payload 2.0 or 1.0 events
 */
function extractRequestDetails(event) {
  const method = (
    event.requestContext?.http?.method ||
    event.httpMethod ||
    'GET'
  ).toUpperCase();

  const path = event.rawPath || event.path || '/';
  const queryParams = event.queryStringParameters || {};
  const headers = event.headers || {};
  const clientIp =
    event.requestContext?.http?.sourceIp ||
    event.requestContext?.identity?.sourceIp ||
    headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    '127.0.0.1';

  let body = {};
  if (event.body) {
    try {
      const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : event.body;
      body = JSON.parse(rawBody);
    } catch {
      body = {};
    }
  }

  return { method, path, queryParams, headers, clientIp, body };
}

/**
 * Main Lambda Handler
 */
export async function handler(event, context) {
  const { method, path, queryParams, headers, clientIp, body } = extractRequestDetails(event);

  // 1. Handle Preflight CORS Request
  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  try {
    // 2. Route matching
    // Health check
    if (path === '/health' || path === '/') {
      return jsonResponse(200, {
        success: true,
        message: 'CampusFind API is online',
        timestamp: new Date().toISOString(),
      });
    }

    // GET /stats
    if (method === 'GET' && path === '/stats') {
      const res = await getStatsHandler();
      return jsonResponse(res.statusCode, res.body);
    }

    // POST /uploads/presign
    if (method === 'POST' && path === '/uploads/presign') {
      const res = await presignUploadHandler(body);
      return jsonResponse(res.statusCode, res.body);
    }

    // GET /items
    if (method === 'GET' && path === '/items') {
      const res = await listItemsHandler(queryParams);
      return jsonResponse(res.statusCode, res.body);
    }

    // POST /items
    if (method === 'POST' && path === '/items') {
      const res = await createItemHandler(body, clientIp);
      return jsonResponse(res.statusCode, res.body);
    }

    // GET /contact/:itemId
    const contactMatch = path.match(/^\/contact\/([a-zA-Z0-9-]+)$/);
    if (method === 'GET' && contactMatch) {
      const itemId = contactMatch[1];
      const res = await getContactHandler(itemId);
      return jsonResponse(res.statusCode, res.body);
    }

    // POST /manage/:itemId/verify
    const manageVerifyMatch = path.match(/^\/manage\/([a-zA-Z0-9-]+)\/verify$/);
    if (method === 'POST' && manageVerifyMatch) {
      const itemId = manageVerifyMatch[1];
      const token = body?.token || headers['x-management-token'];
      const res = await verifyTokenHandler(itemId, token);
      return jsonResponse(res.statusCode, res.body);
    }

    // PATCH /items/:itemId/status
    const statusMatch = path.match(/^\/items\/([a-zA-Z0-9-]+)\/status$/);
    if (method === 'PATCH' && statusMatch) {
      const itemId = statusMatch[1];
      const res = await updateStatusHandler(itemId, body, headers);
      return jsonResponse(res.statusCode, res.body);
    }

    // POST /items/:itemId/report
    const reportMatch = path.match(/^\/items\/([a-zA-Z0-9-]+)\/report$/);
    if (method === 'POST' && reportMatch) {
      const itemId = reportMatch[1];
      const res = await submitAbuseReportHandler(itemId, body, clientIp);
      return jsonResponse(res.statusCode, res.body);
    }

    // DELETE /items/:itemId
    const deleteMatch = path.match(/^\/items\/([a-zA-Z0-9-]+)$/);
    if (method === 'DELETE' && deleteMatch) {
      const itemId = deleteMatch[1];
      const res = await deleteItemHandler(itemId, headers);
      return jsonResponse(res.statusCode, res.body);
    }

    // GET /items/:itemId
    const getItemMatch = path.match(/^\/items\/([a-zA-Z0-9-]+)$/);
    if (method === 'GET' && getItemMatch) {
      const itemId = getItemMatch[1];
      const res = await getItemHandler(itemId);
      return jsonResponse(res.statusCode, res.body);
    }

    // GET /admin/items
    if (method === 'GET' && path === '/admin/items') {
      const res = await listAdminItemsHandler(queryParams, headers);
      return jsonResponse(res.statusCode, res.body);
    }

    // PATCH /admin/items/:itemId/moderation
    const adminModMatch = path.match(/^\/admin\/items\/([a-zA-Z0-9-]+)\/moderation$/);
    if (method === 'PATCH' && adminModMatch) {
      const itemId = adminModMatch[1];
      const res = await updateModerationStatusHandler(itemId, body, headers);
      return jsonResponse(res.statusCode, res.body);
    }

    // GET /admin/reports
    if (method === 'GET' && path === '/admin/reports') {
      const res = await listAbuseReportsHandler(headers);
      return jsonResponse(res.statusCode, res.body);
    }

    // PATCH /admin/reports/:reportId
    const resolveReportMatch = path.match(/^\/admin\/reports\/([a-zA-Z0-9-]+)$/);
    if (method === 'PATCH' && resolveReportMatch) {
      const reportId = resolveReportMatch[1];
      const res = await resolveAbuseReportHandler(reportId, body, headers);
      return jsonResponse(res.statusCode, res.body);
    }

    // 404 Route Not Found
    return jsonResponse(404, {
      success: false,
      error: `Resource not found: ${method} ${path}`,
    });
  } catch (err) {
    console.error(`Unhandled API Error on ${method} ${path}:`, err);
    return jsonResponse(500, {
      success: false,
      error: 'An internal server error occurred. Please try again later.',
    });
  }
}
