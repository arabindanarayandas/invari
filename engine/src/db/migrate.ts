/**
 * DEPRECATED: This file is no longer used
 *
 * We now use custom migrations instead of auto-generated ones.
 *
 * New migration workflow:
 *   - Create: pnpm db:create <name>
 *   - Run:    pnpm db:migrate
 *   - Status: pnpm db:status
 *   - Rollback: pnpm db:rollback
 *
 * Migration scripts are located in: /scripts/
 * Migration files are located in: /drizzle/migrations/
 *
 * See: /engine/MIGRATIONS.md for full documentation
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '../config/env.js';

async function runMigrations() {
  console.log('⚠️  WARNING: This migration script is deprecated');
  console.log('📝 Use: pnpm db:migrate instead');
  console.log('📚 See: /engine/MIGRATIONS.md for documentation\n');

  console.log('Running database migrations...');

  const migrationConnection = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(migrationConnection);

  try {
    await migrate(db, { migrationsFolder: './drizzle/migrations' });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await migrationConnection.end();
  }
}

runMigrations();
