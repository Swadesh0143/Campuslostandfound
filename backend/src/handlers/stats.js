import { getDatabase } from '../db.js';

export async function getStatsHandler(clientOverride = null) {
  const database = getDatabase(clientOverride);
  const result = await database.query(
    `SELECT
       COUNT(*) FILTER (WHERE moderation_status <> 'hidden')::int AS total_reports,
       COUNT(*) FILTER (WHERE moderation_status <> 'hidden' AND type = 'lost')::int AS total_lost,
       COUNT(*) FILTER (WHERE moderation_status <> 'hidden' AND type = 'found')::int AS total_found,
       COUNT(*) FILTER (WHERE moderation_status <> 'hidden' AND status = 'returned')::int AS total_recovered,
       COUNT(*) FILTER (WHERE moderation_status <> 'hidden' AND status = 'active')::int AS active_reports
     FROM items`
  );
  const row = result.rows[0];

  return {
    statusCode: 200,
    body: {
      success: true,
      stats: {
        totalReports: row.total_reports,
        totalLost: row.total_lost,
        totalFound: row.total_found,
        totalRecovered: row.total_recovered,
        activeReports: row.active_reports,
      },
      timestamp: new Date().toISOString(),
    },
  };
}
