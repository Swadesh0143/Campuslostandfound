// Frontend API Client: Connected to Real Backend
import { config } from '../config';

let rawBase = (config.apiBaseUrl || '').trim().replace(/\/+$/, '');
if (rawBase && !rawBase.startsWith('http://') && !rawBase.startsWith('https://') && !rawBase.startsWith('/')) {
  rawBase = `https://${rawBase}`;
}
const BASE_URL = rawBase;

class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Universal JSON fetch helper with timeout and standardized error handling
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 15000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Parse JSON safely
    let data;
    try {
      data = await response.json();
    } catch {
      data = { success: response.ok, message: response.statusText };
    }

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `Request failed with status ${response.status}`;
      throw new ApiError(errorMessage, response.status, data?.details);
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new ApiError('The request timed out. Please check your internet connection.', 408);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network error communicating with CampusFind server.', 0);
  }
}

// -------------------------------------------------------------
// Real API Endpoints
// -------------------------------------------------------------

/**
 * GET /stats - Fetch aggregate counts from PostgreSQL
 */
export async function getStats() {
  return request('/stats');
}

/**
 * GET /items - Browse items with filters & pagination
 */
export async function getItems({ type, category, status, location, search, limit = 20, nextToken } = {}) {
  const params = new URLSearchParams();
  if (type && type !== 'all') params.append('type', type);
  if (category && category !== 'all') params.append('category', category);
  if (status && status !== 'all') params.append('status', status);
  if (location) params.append('location', location);
  if (search) params.append('search', search);
  if (limit) params.append('limit', String(limit));
  if (nextToken) params.append('nextToken', nextToken);

  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`/items${query}`);
}

/**
 * GET /items/:itemId - Get single public item details
 */
export async function getItem(itemId) {
  return request(`/items/${encodeURIComponent(itemId)}`);
}

/**
 * POST /items - Create new lost or found report
 */
export async function createItem(itemData) {
  return request('/items', {
    method: 'POST',
    body: JSON.stringify(itemData),
  });
}

/**
 * POST /uploads/presign - Request presigned S3 upload authorization
 */
export async function getPresignedUploadUrl({ mimeType, fileExtension, fileSize }) {
  return request('/uploads/presign', {
    method: 'POST',
    body: JSON.stringify({ mimeType, fileExtension, fileSize }),
  });
}

/**
 * Direct S3 upload using XMLHttpRequest for accurate progress tracking
 */
export function uploadFileToS3(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type);

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new ApiError(`S3 Image upload failed with HTTP status ${xhr.status}`, xhr.status));
      }
    };

    xhr.onerror = () => reject(new ApiError('Network failure during S3 upload', 0));
    xhr.ontimeout = () => reject(new ApiError('S3 Image upload timed out', 408));
    xhr.timeout = 30000; // 30s

    xhr.send(file);
  });
}

/**
 * GET /contact/:itemId - Privacy-conscious contact detail reveal
 */
export async function getContactInfo(itemId) {
  return request(`/contact/${encodeURIComponent(itemId)}`);
}

/**
 * POST /manage/:itemId/verify - Verify owner management token
 */
export async function verifyManagementToken(itemId, token) {
  return request(`/manage/${encodeURIComponent(itemId)}/verify`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

/**
 * PATCH /items/:itemId/status - Update item status (e.g. 'returned', 'archived')
 */
export async function updateItemStatus(itemId, status, token, adminToken = null) {
  const headers = {};
  if (token) headers['X-Management-Token'] = token;
  if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

  return request(`/items/${encodeURIComponent(itemId)}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status, token }),
  });
}

/**
 * DELETE /items/:itemId - Delete item report
 */
export async function deleteItem(itemId, token, adminToken = null) {
  const headers = {};
  if (token) headers['X-Management-Token'] = token;
  if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

  return request(`/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    headers,
  });
}

/**
 * POST /items/:itemId/report - Report abuse or inappropriate content
 */
export async function submitAbuseReport(itemId, { reason, details }) {
  return request(`/items/${encodeURIComponent(itemId)}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason, details }),
  });
}

/**
 * GET /admin/items - Admin list with moderation controls
 */
export async function getAdminItems(adminToken) {
  return request('/admin/items', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
}

/**
 * PATCH /admin/items/:itemId/moderation - Admin moderate item
 */
export async function updateItemModeration(itemId, { moderationStatus, status }, adminToken) {
  return request(`/admin/items/${encodeURIComponent(itemId)}/moderation`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ moderationStatus, status }),
  });
}

/**
 * GET /admin/reports - Admin abuse report queue
 */
export async function getAdminReports(adminToken) {
  return request('/admin/reports', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
}

/**
 * PATCH /admin/reports/:reportId - Admin resolve report
 */
export async function resolveAdminReport(reportId, status, adminToken) {
  return request(`/admin/reports/${encodeURIComponent(reportId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status }),
  });
}
