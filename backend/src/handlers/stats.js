// Statistics Handler: Real Database Counts
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getDocClient } from '../db.js';
import { config } from '../config.js';

/**
 * GET /stats - Returns real live aggregate statistics from DynamoDB
 */
export async function getStatsHandler(clientOverride = null) {
  const docClient = getDocClient(clientOverride);

  // Scan items table projecting only type and status for maximum performance & minimal RCU cost
  const scanParams = {
    TableName: config.tables.items,
    ProjectionExpression: '#itemId, #type, #status, #moderationStatus',
    ExpressionAttributeNames: {
      '#itemId': 'itemId',
      '#type': 'type',
      '#status': 'status',
      '#moderationStatus': 'moderationStatus',
    },
  };

  const result = await docClient.send(new ScanCommand(scanParams));
  const items = result.Items || [];

  let totalLost = 0;
  let totalFound = 0;
  let totalRecovered = 0;
  let activeReports = 0;

  for (const item of items) {
    if (item.moderationStatus === 'hidden') continue;

    if (item.type === 'lost') {
      totalLost += 1;
    } else if (item.type === 'found') {
      totalFound += 1;
    }

    if (item.status === 'returned') {
      totalRecovered += 1;
    } else if (item.status === 'active') {
      activeReports += 1;
    }
  }

  return {
    statusCode: 200,
    body: {
      success: true,
      stats: {
        totalReports: items.length,
        totalLost,
        totalFound,
        totalRecovered,
        activeReports,
      },
      timestamp: new Date().toISOString(),
    },
  };
}
