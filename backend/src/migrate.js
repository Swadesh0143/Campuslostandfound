import { closeDatabase, initializeDatabase } from './db.js';

try {
  await initializeDatabase();
  console.log('PostgreSQL schema is ready.');
} catch (error) {
  console.error('Could not initialize PostgreSQL schema:', error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
