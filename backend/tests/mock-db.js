export class MockPostgresClient {
  constructor() {
    this.items = new Map();
    this.ownership = new Map();
    this.reports = new Map();
  }

  async transaction(callback) {
    const snapshot = structuredClone({
      items: [...this.items],
      ownership: [...this.ownership],
      reports: [...this.reports],
    });
    try {
      return await callback(this);
    } catch (error) {
      this.items = new Map(snapshot.items);
      this.ownership = new Map(snapshot.ownership);
      this.reports = new Map(snapshot.reports);
      throw error;
    }
  }

  async query(statement, values = []) {
    const sql = statement.replace(/\s+/g, ' ').trim().toLowerCase();
    if (sql.startsWith('insert into items')) {
      const [
        itemId, name, nameLower, type, category, description, descriptionLower,
        location, locationLower, eventDate, imageKey, contactName, contactMethod,
        now, clientIpHash,
      ] = values;
      this.items.set(itemId, {
        item_id: itemId,
        name,
        name_lower: nameLower,
        type,
        category,
        description,
        description_lower: descriptionLower,
        location,
        location_lower: locationLower,
        event_date: eventDate,
        image_key: imageKey,
        contact_name: contactName,
        contact_method: contactMethod,
        status: 'active',
        moderation_status: 'approved',
        view_count: 0,
        created_at: now,
        updated_at: now,
        client_ip_hash: clientIpHash,
      });
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith('insert into ownership')) {
      const [itemId, tokenHash, salt, allowedActions, createdAt] = values;
      this.ownership.set(itemId, {
        item_id: itemId,
        token_hash: tokenHash,
        salt,
        allowed_actions: JSON.parse(allowedActions),
        failed_attempts: 0,
        created_at: createdAt,
      });
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith('select * from ownership')) {
      const row = this.ownership.get(values[0]);
      return { rows: row ? [{ ...row }] : [], rowCount: row ? 1 : 0 };
    }
    if (sql.startsWith('select * from items where item_id')) {
      const row = this.items.get(values[0]);
      return { rows: row ? [{ ...row }] : [], rowCount: row ? 1 : 0 };
    }
    if (sql.startsWith('select name from items where item_id')) {
      const row = this.items.get(values[0]);
      return { rows: row ? [{ name: row.name }] : [], rowCount: row ? 1 : 0 };
    }
    if (sql.startsWith('select item_id, name, type, contact_name')) {
      const row = this.items.get(values[0]);
      return {
        rows: row ? [{
          item_id: row.item_id,
          name: row.name,
          type: row.type,
          contact_name: row.contact_name,
          contact_method: row.contact_method,
          moderation_status: row.moderation_status,
          status: row.status,
        }] : [],
        rowCount: row ? 1 : 0,
      };
    }
    if (sql.startsWith('select * from items order by')) {
      const rows = [...this.items.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      return { rows: rows.map((row) => ({ ...row })), rowCount: rows.length };
    }
    if (sql.startsWith('select item_id, name, type, status, event_date from items')) {
      const row = this.items.get(values[0]);
      return {
        rows: row ? [{
          item_id: row.item_id,
          name: row.name,
          type: row.type,
          status: row.status,
          event_date: row.event_date,
        }] : [],
        rowCount: row ? 1 : 0,
      };
    }
    if (sql.startsWith('select status from items')) {
      const row = this.items.get(values[0]);
      return { rows: row ? [{ status: row.status }] : [], rowCount: row ? 1 : 0 };
    }
    if (sql.startsWith('select image_key from items')) {
      const row = this.items.get(values[0]);
      return { rows: row ? [{ image_key: row.image_key }] : [], rowCount: row ? 1 : 0 };
    }
    if (sql.startsWith('update ownership set failed_attempts')) {
      const row = this.ownership.get(values[0]);
      if (row) {
        row.failed_attempts += 1;
        row.last_failed_at = values[1];
      }
      return { rows: [], rowCount: row ? 1 : 0 };
    }
    if (sql.startsWith('update ownership set last_used_at')) {
      const row = this.ownership.get(values[0]);
      if (row) {
        row.last_used_at = values[1];
        row.failed_attempts = 0;
      }
      return { rows: [], rowCount: row ? 1 : 0 };
    }
    if (sql.startsWith('update items set view_count')) {
      const row = this.items.get(values[0]);
      if (row) row.view_count += 1;
      return { rows: row ? [{ view_count: row.view_count }] : [], rowCount: row ? 1 : 0 };
    }
    if (sql.startsWith('update items set status =')) {
      const row = this.items.get(values[0]);
      if (row) {
        row.status = values[1];
        row.updated_at = values[2];
        if (['returned', 'archived'].includes(values[1])) row.resolved_at = values[2];
      }
      return { rows: [], rowCount: row ? 1 : 0 };
    }
    if (sql.startsWith('update items set moderation_status = coalesce')) {
      const row = this.items.get(values[0]);
      if (row) {
        row.moderation_status = values[1] || row.moderation_status;
        row.status = values[2] || row.status;
        row.updated_at = values[3];
        row.moderated_by = values[4];
      }
      return { rows: row ? [{ item_id: row.item_id }] : [], rowCount: row ? 1 : 0 };
    }
    if (sql.startsWith("update items set moderation_status = 'flagged'")) {
      const row = this.items.get(values[0]);
      if (row) {
        row.moderation_status = 'flagged';
        row.flagged_at = values[1];
      }
      return { rows: [], rowCount: row ? 1 : 0 };
    }
    if (sql.startsWith('insert into abuse_reports')) {
      const [reportId, itemId, itemName, reason, details, reporterIpHash, createdAt] = values;
      const row = {
        report_id: reportId,
        item_id: itemId,
        item_name: itemName,
        reason,
        details,
        reporter_ip_hash: reporterIpHash,
        status: 'pending',
        created_at: createdAt,
      };
      this.reports.set(reportId, row);
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith('select * from abuse_reports order by')) {
      const rows = [...this.reports.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      return { rows: rows.map((row) => ({ ...row })), rowCount: rows.length };
    }
    if (sql.startsWith('update abuse_reports set status =')) {
      const row = this.reports.get(values[0]);
      if (row) {
        row.status = values[1];
        row.resolved_at = values[2];
        row.resolved_by = values[3];
      }
      return { rows: row ? [{ report_id: row.report_id }] : [], rowCount: row ? 1 : 0 };
    }
    if (sql.startsWith('select count(*) filter')) {
      const items = [...this.items.values()].filter((row) => row.moderation_status !== 'hidden');
      return {
        rows: [{
          total_reports: items.length,
          total_lost: items.filter((row) => row.type === 'lost').length,
          total_found: items.filter((row) => row.type === 'found').length,
          total_recovered: items.filter((row) => row.status === 'returned').length,
          active_reports: items.filter((row) => row.status === 'active').length,
        }],
        rowCount: 1,
      };
    }
    if (sql.startsWith('delete from items')) {
      const deleted = this.items.delete(values[0]);
      this.ownership.delete(values[0]);
      return { rows: [], rowCount: deleted ? 1 : 0 };
    }
    if (sql.startsWith('select * from items where')) {
      let rows = [...this.items.values()].filter((row) => row.moderation_status === 'approved');
      if (sql.includes('status = $')) {
        const match = sql.match(/status = \$(\d+)/);
        if (match) rows = rows.filter((row) => row.status === values[Number(match[1]) - 1]);
      }
      if (sql.includes('type = $')) {
        const match = sql.match(/type = \$(\d+)/);
        if (match) rows = rows.filter((row) => row.type === values[Number(match[1]) - 1]);
      }
      if (sql.includes('category = $')) {
        const match = sql.match(/category = \$(\d+)/);
        if (match) rows = rows.filter((row) => row.category === values[Number(match[1]) - 1]);
      }
      rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      const limitMatch = sql.match(/limit \$(\d+)/);
      const offsetMatch = sql.match(/offset \$(\d+)/);
      const limit = limitMatch ? values[Number(limitMatch[1]) - 1] : rows.length;
      const offset = offsetMatch ? values[Number(offsetMatch[1]) - 1] : 0;
      rows = rows.slice(offset, offset + limit);
      return { rows: rows.map((row) => ({ ...row })), rowCount: rows.length };
    }

    throw new Error(`Unmocked SQL query: ${sql}`);
  }
}
