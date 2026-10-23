import crypto from 'crypto';
import { getDatabase, withTransaction } from '../db.js';
import { validateItemInput } from '../validation.js';
import { generateManagementToken } from '../auth.js';
import { createPresignedDownloadUrl } from '../s3.js';

export function mapItem(row) {
  if (!row) return null;
  return {
    itemId: row.item_id,
    name: row.name,
    nameLower: row.name_lower,
    type: row.type,
    category: row.category,
    description: row.description,
    descriptionLower: row.description_lower,
    location: row.location,
    locationLower: row.location_lower,
    eventDate: row.event_date instanceof Date ? row.event_date.toISOString().slice(0, 10) : row.event_date,
    imageKey: row.image_key,
    contactName: row.contact_name,
    contactMethod: row.contact_method,
    status: row.status,
    moderationStatus: row.moderation_status,
    viewCount: row.view_count,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    clientIpHash: row.client_ip_hash,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : null,
    flaggedAt: row.flagged_at ? new Date(row.flagged_at).toISOString() : null,
    moderatedBy: row.moderated_by,
  };
}

function sanitizePublicItem(item) {
  const { contactMethod, ...publicItem } = item;
  return { ...publicItem, hasContactMethod: Boolean(contactMethod) };
}

function decodeOffset(token) {
  if (!token) return 0;
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    if (!Number.isSafeInteger(decoded.offset) || decoded.offset < 0) throw new Error();
    return decoded.offset;
  } catch {
    return null;
  }
}

function encodeOffset(offset) {
  return Buffer.from(JSON.stringify({ offset })).toString('base64');
}

async function addImageUrls(items) {
  return Promise.all(items.map(async (item) => {
    if (item.imageKey) {
      try {
        item.imageUrl = await createPresignedDownloadUrl({ objectKey: item.imageKey });
      } catch {
        item.imageUrl = null;
      }
    }
    return item;
  }));
}

export async function listItemsHandler(queryParams = {}, clientOverride = null) {
  const database = getDatabase(clientOverride);
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
  const offset = decodeOffset(nextToken);
  if (offset === null) {
    return { statusCode: 400, body: { success: false, error: 'Invalid continuation nextToken format' } };
  }

  const conditions = ["moderation_status = 'approved'"];
  const values = [];
  const addValue = (value) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (status && status !== 'all') conditions.push(`status = ${addValue(status)}`);
  if (type && ['lost', 'found'].includes(type)) conditions.push(`type = ${addValue(type)}`);
  if (category && category !== 'all') conditions.push(`category = ${addValue(category)}`);
  if (location?.trim()) conditions.push(`POSITION(LOWER(${addValue(location.trim())}) IN location_lower) > 0`);
  if (search?.trim()) {
    const searchValue = addValue(search.trim().toLowerCase());
    conditions.push(`(POSITION(${searchValue} IN name_lower) > 0 OR POSITION(${searchValue} IN description_lower) > 0 OR POSITION(${searchValue} IN location_lower) > 0)`);
  }

  const limitParameter = addValue(parsedLimit + 1);
  const offsetParameter = addValue(offset);
  const result = await database.query(
    `SELECT * FROM items WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC, item_id LIMIT ${limitParameter} OFFSET ${offsetParameter}`,
    values
  );

  const hasMore = result.rows.length > parsedLimit;
  const page = result.rows.slice(0, parsedLimit).map((row) => sanitizePublicItem(mapItem(row)));
  const items = await addImageUrls(page);

  return {
    statusCode: 200,
    body: {
      success: true,
      items,
      count: items.length,
      nextToken: hasMore ? encodeOffset(offset + parsedLimit) : null,
    },
  };
}

export async function getItemHandler(itemId, clientOverride = null) {
  if (!itemId || typeof itemId !== 'string') {
    return { statusCode: 400, body: { success: false, error: 'Invalid or missing itemId' } };
  }

  const database = getDatabase(clientOverride);
  const result = await database.query('SELECT * FROM items WHERE item_id = $1', [itemId]);
  const rawItem = mapItem(result.rows[0]);
  if (!rawItem) {
    return { statusCode: 404, body: { success: false, error: 'Item report not found' } };
  }
  if (rawItem.moderationStatus === 'hidden') {
    return { statusCode: 404, body: { success: false, error: 'This item report has been removed or hidden by moderators.' } };
  }

  try {
    const updated = await database.query(
      'UPDATE items SET view_count = view_count + 1 WHERE item_id = $1 RETURNING view_count',
      [itemId]
    );
    if (updated.rows[0]) rawItem.viewCount = updated.rows[0].view_count;
  } catch (error) {
    console.warn(`Could not increment view count for item ${itemId}:`, error.message);
  }

  const sanitized = sanitizePublicItem(rawItem);
  if (sanitized.imageKey) {
    try {
      sanitized.imageUrl = await createPresignedDownloadUrl({ objectKey: sanitized.imageKey });
    } catch {
      sanitized.imageUrl = null;
    }
  }

  return { statusCode: 200, body: { success: true, item: sanitized } };
}

export async function createItemHandler(body, clientIp = 'unknown', clientOverride = null) {
  const validation = validateItemInput(body, true);
  if (!validation.isValid) {
    return { statusCode: 400, body: { success: false, error: 'Validation failed', details: validation.errors } };
  }

  const database = getDatabase(clientOverride);
  const now = new Date().toISOString();
  const itemId = crypto.randomUUID();
  const { rawToken, salt, tokenHash } = generateManagementToken();
  const item = validation.sanitized;
  const clientIpHash = crypto.createHash('sha256').update(clientIp).digest('hex').substring(0, 16);

  let imageUrl;
  if (item.imageKey) {
    imageUrl = await createPresignedDownloadUrl({ objectKey: item.imageKey });
  }

  const insertItem = async (client) => {
    await client.query(
      `INSERT INTO items (
        item_id, name, name_lower, type, category, description, description_lower,
        location, location_lower, event_date, image_key, contact_name, contact_method,
        status, moderation_status, view_count, created_at, updated_at, client_ip_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active', 'approved', 0, $14, $14, $15)`,
      [
        itemId, item.name, item.name.toLowerCase(), item.type, item.category,
        item.description, item.description.toLowerCase(), item.location,
        item.location.toLowerCase(), item.eventDate, item.imageKey, item.contactName,
        item.contactMethod, now, clientIpHash,
      ]
    );
    await client.query(
      `INSERT INTO ownership (item_id, token_hash, salt, allowed_actions, failed_attempts, created_at)
       VALUES ($1, $2, $3, $4::jsonb, 0, $5)`,
      [itemId, tokenHash, salt, JSON.stringify(['update_status', 'edit_details', 'delete_report']), now]
    );
  };

  await withTransaction(insertItem, database);

  const publicItem = sanitizePublicItem({
    itemId,
    ...item,
    nameLower: item.name.toLowerCase(),
    descriptionLower: item.description.toLowerCase(),
    locationLower: item.location.toLowerCase(),
    status: 'active',
    moderationStatus: 'approved',
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
    clientIpHash,
  });
  if (imageUrl) publicItem.imageUrl = imageUrl;

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
