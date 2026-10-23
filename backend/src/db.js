import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const { Pool } = pg;

let pool;
let initializationPromise;

export function getDatabase(databaseOverride = null) {
  if (databaseOverride) return databaseOverride;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to connect to PostgreSQL.');
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.PG_POOL_MAX) || 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
  }

  return pool;
}

export async function initializeDatabase(databaseOverride = null) {
  const database = getDatabase(databaseOverride);
  if (databaseOverride) return;

  if (!initializationPromise) {
    initializationPromise = readFile(
      new URL('../migrations/001-initial-schema.sql', import.meta.url),
      'utf8'
    )
      .then((schema) => database.query(schema))
      .catch((error) => {
        initializationPromise = null;
        throw error;
      });
  }

  await initializationPromise;
}

export async function withTransaction(callback, databaseOverride = null) {
  const database = getDatabase(databaseOverride);
  if (databaseOverride?.transaction) {
    return database.transaction(callback);
  }

  const client = await database.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDatabase() {
  if (pool) {
    const currentPool = pool;
    pool = null;
    initializationPromise = null;
    await currentPool.end();
  }
}
