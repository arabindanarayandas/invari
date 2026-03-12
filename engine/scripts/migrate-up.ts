#!/usr/bin/env tsx

/**
 * Run pending database migrations
 *
 * Usage:
 *   pnpm db:migrate
 *
 * This script:
 * 1. Connects to the database
 * 2. Creates a migrations tracking table if needed
 * 3. Runs all pending migrations in order
 * 4. Records which migrations have been applied
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

async function runMigrations() {
  const sql = postgres(DATABASE_URL!, { max: 1 });

  try {
    console.log('🚀 Starting migration process...\n');

    // Create migrations tracking table
    console.log('📦 Ensuring migrations tracking table exists...');
    await sql`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `;
    console.log('✅ Migrations table ready\n');

    // Get applied migrations
    const appliedMigrations = await sql`
      SELECT name FROM __drizzle_migrations ORDER BY id
    `;
    const appliedNames = new Set(appliedMigrations.map(m => m.name));

    console.log(`📊 Applied migrations: ${appliedNames.size}`);

    // Get all migration files
    const migrationsDir = path.join(__dirname, '../drizzle/migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️  No migrations directory found');
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📊 Total migration files: ${migrationFiles.length}\n`);

    // Find pending migrations
    const pendingMigrations = migrationFiles.filter(file => !appliedNames.has(file));

    if (pendingMigrations.length === 0) {
      console.log('✨ No pending migrations. Database is up to date!');
      return;
    }

    console.log(`🔄 Pending migrations: ${pendingMigrations.length}\n`);

    // Run each pending migration
    for (const migrationFile of pendingMigrations) {
      console.log(`⏳ Applying: ${migrationFile}`);

      const migrationPath = path.join(migrationsDir, migrationFile);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

      try {
        // Run migration in a transaction
        await sql.begin(async (tx) => {
          // Execute the migration SQL
          await tx.unsafe(migrationSQL);

          // Record migration as applied
          await tx`
            INSERT INTO __drizzle_migrations (name)
            VALUES (${migrationFile})
          `;
        });

        console.log(`✅ Applied: ${migrationFile}\n`);
      } catch (error: any) {
        console.error(`❌ Failed to apply: ${migrationFile}`);
        console.error(`   Error: ${error.message}\n`);
        throw error;
      }
    }

    console.log('🎉 All migrations completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();
