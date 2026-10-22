// DynamoDB Client & Helper
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { config } from './config.js';

let rawClient = null;
let docClient = null;

export function getDocClient(clientOverride = null) {
  if (clientOverride) {
    return clientOverride;
  }
  if (!docClient) {
    rawClient = new DynamoDBClient({
      region: config.region,
      ...(process.env.DYNAMODB_ENDPOINT ? { endpoint: process.env.DYNAMODB_ENDPOINT } : {}),
    });
    docClient = DynamoDBDocumentClient.from(rawClient, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
  }
  return docClient;
}

export function setDocClientForTesting(mockClient) {
  docClient = mockClient;
}
