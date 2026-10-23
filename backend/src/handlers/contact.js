import { getDatabase } from '../db.js';

export async function getContactHandler(itemId, clientOverride = null) {
  if (!itemId || typeof itemId !== 'string') {
    return { statusCode: 400, body: { success: false, error: 'Valid itemId parameter is required' } };
  }

  const database = getDatabase(clientOverride);
  const result = await database.query(
    `SELECT item_id, name, type, contact_name, contact_method, moderation_status, status
     FROM items WHERE item_id = $1`,
    [itemId]
  );
  const item = result.rows[0];
  if (!item) {
    return { statusCode: 404, body: { success: false, error: 'Item report not found' } };
  }
  if (item.moderation_status === 'hidden') {
    return { statusCode: 403, body: { success: false, error: 'This report has been moderated or removed.' } };
  }
  if (item.status === 'returned') {
    return {
      statusCode: 410,
      body: {
        success: false,
        error: 'This item has already been marked as returned or recovered. Contact is no longer open.',
        status: 'returned',
      },
    };
  }
  if (item.status === 'archived') {
    return {
      statusCode: 410,
      body: {
        success: false,
        error: 'This report is archived and no longer accepting contact inquiries.',
        status: 'archived',
      },
    };
  }

  return {
    statusCode: 200,
    body: {
      success: true,
      data: {
        itemId: item.item_id,
        itemName: item.name,
        type: item.type,
        contactName: item.contact_name,
        contactMethod: item.contact_method,
        safetyNotice:
          'Please arrange to meet in a safe, public campus location (e.g. Student Union, Library Helpdesk, or Campus Security Office).',
      },
    },
  };
}
