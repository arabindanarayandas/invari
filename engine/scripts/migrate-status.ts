#!/usr/bin/env tsx

/**
 * Check migration status
 *
 * Usage:
 *   pnpm db:status
 *
 * Shows:
 * - Applied migrations (✅)
 * - Pending migrations (⏳)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function checkMigrationStatus() {
  const sql = postgres(DATABASE_URL!, { max: 1 });

  try {
    console.log('📊 Migration Status\n');
    console.log('='.repeat(60));

    // Check if migrations table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = '__drizzle_migrations'
      )
    `;

    if (!tableExists[0].exists) {
      console.log('\n⚠️  Migrations tracking table does not exist');
      console.log('   Run: pnpm db:migrate to initialize\n');
      return;
    }

    // Get applied migrations
    const appliedMigrations = await sql`
      SELECT name, applied_at
      FROM __drizzle_migrations
      ORDER BY id
    `;
    const appliedNames = new Set(appliedMigrations.map(m => m.name));

    // Get all migration files
    const migrationsDir = path.join(__dirname, '../drizzle/migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('\n⚠️  No migrations directory found\n');
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`\n📁 Total migrations: ${migrationFiles.length}`);
    console.log(`✅ Applied: ${appliedNames.size}`);
    console.log(`⏳ Pending: ${migrationFiles.length - appliedNames.size}\n`);

    if (migrationFiles.length === 0) {
      console.log('No migration files found\n');
      return;
    }

    console.log('='.repeat(60));
    console.log('\nMigrations:\n');

    // Display each migration with status
    for (const file of migrationFiles) {
      const isApplied = appliedNames.has(file);
      const status = isApplied ? '✅' : '⏳';
      const label = isApplied ? 'Applied' : 'Pending';

      console.log(`${status} ${label.padEnd(10)} ${file}`);

      if (isApplied) {
        const migration = appliedMigrations.find(m => m.name === file);
        if (migration) {
          const date = new Date(migration.applied_at).toISOString().replace('T', ' ').split('.')[0];
          console.log(`   Applied at: ${date}`);
        }
      }
      console.log();
    }

    console.log('='.repeat(60));

    if (migrationFiles.length === appliedNames.size) {
      console.log('\n✨ Database is up to date!\n');
    } else {
      console.log('\n💡 Run: pnpm db:migrate to apply pending migrations\n');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

checkMigrationStatus();
