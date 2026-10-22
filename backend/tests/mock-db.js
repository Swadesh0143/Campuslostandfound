// Mock In-Memory DynamoDB Document Client for Automated Testing
export class MockDynamoDbClient {
  constructor() {
    this.tables = {
      'CampusFind-Items': new Map(),
      'CampusFind-Ownership': new Map(),
      'CampusFind-AbuseReports': new Map(),
    };
  }

  reset() {
    for (const table of Object.values(this.tables)) {
      table.clear();
    }
  }

  async send(command) {
    const commandName = command.constructor.name;
    const { TableName, Key, Item } = command.input || {};
    const table = this.tables[TableName] || (this.tables[TableName] = new Map());

    if (commandName === 'PutCommand') {
      const pk = Item.itemId || Item.reportId;
      table.set(pk, { ...Item });
      return {};
    }

    if (commandName === 'GetCommand') {
      const pk = Key.itemId || Key.reportId;
      const found = table.get(pk);
      return { Item: found ? { ...found } : undefined };
    }

    if (commandName === 'DeleteCommand') {
      const pk = Key.itemId || Key.reportId;
      table.delete(pk);
      return {};
    }

    if (commandName === 'UpdateCommand') {
      const pk = Key.itemId || Key.reportId;
      let record = table.get(pk) || { ...Key };

      const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = command.input;
      
      // Simple parser for standard expressions like SET #status = :newStatus
      if (UpdateExpression) {
        if (UpdateExpression.includes('ADD #views :inc')) {
          record.viewCount = (record.viewCount || 0) + 1;
        }
        if (UpdateExpression.includes('#status = :newStatus') || UpdateExpression.includes('#status = :res')) {
          record.status = ExpressionAttributeValues[':newStatus'] || ExpressionAttributeValues[':res'];
        }
        if (UpdateExpression.includes('#modStatus = :modStatus') || UpdateExpression.includes('#modStatus = :flagged')) {
          record.moderationStatus = ExpressionAttributeValues[':modStatus'] || ExpressionAttributeValues[':flagged'];
        }
        if (UpdateExpression.includes('ADD #failed :inc')) {
          record.failedAttempts = (record.failedAttempts || 0) + 1;
        }
        if (UpdateExpression.includes('#failed = :zero')) {
          record.failedAttempts = 0;
        }
        if (ExpressionAttributeValues[':now']) {
          record.updatedAt = ExpressionAttributeValues[':now'];
        }
      }

      table.set(pk, record);
      return { Attributes: record };
    }

    if (commandName === 'ScanCommand') {
      let items = Array.from(table.values());

      // Simple mock filtering for status and type
      const values = command.input?.ExpressionAttributeValues || {};
      if (values[':status']) {
        items = items.filter((i) => i.status === values[':status']);
      }
      if (values[':type']) {
        items = items.filter((i) => i.type === values[':type']);
      }
      if (values[':category']) {
        items = items.filter((i) => i.category === values[':category']);
      }

      return {
        Items: items.map((i) => ({ ...i })),
      };
    }

    return {};
  }
}
