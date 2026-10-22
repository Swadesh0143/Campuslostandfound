// Contact Privacy Handler: Secure Contact Detail Reveal
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient } from '../db.js';
import { config } from '../config.js';

/**
 * GET /contact/:itemId - Privacy-conscious endpoint for revealing contact info
 * Ensures contact details are never leaked on card lists or search indexes.
 */
export async function getContactHandler(itemId, clientOverride = null) {
  if (!itemId || typeof itemId !== 'string') {
    return {
      statusCode: 400,
      body: { success: false, error: 'Valid itemId parameter is required' },
    };
  }

  const docClient = getDocClient(clientOverride);

  const itemResult = await docClient.send(
    new GetCommand({
      TableName: config.tables.items,
      Key: { itemId },
    })
  );

  const item = itemResult.Item;
  if (!item) {
    return {
      statusCode: 404,
      body: { success: false, error: 'Item report not found' },
    };
  }

  if (item.moderationStatus === 'hidden') {
    return {
      statusCode: 403,
      body: { success: false, error: 'This report has been moderated or removed.' },
    };
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
        itemId: item.itemId,
        itemName: item.name,
        type: item.type,
        contactName: item.contactName,
        contactMethod: item.contactMethod,
        safetyNotice:
          'Please arrange to meet in a safe, public campus location (e.g. Student Union, Library Helpdesk, or Campus Security Office).',
      },
    },
  };
}
