#!/usr/bin/env tsx

/**
 * Rollback the last applied migration
 *
 * Usage:
 *   pnpm db:rollback
 *
 * ⚠️  WARNING: This is a destructive operation!
 *
 * Note: This script marks the migration as rolled back but does NOT
 * automatically execute rollback SQL. You must manually revert the
 * changes or create a new migration to undo the changes.
 *
 * For production rollbacks, it's safer to create a new forward migration
 * that undoes the previous migration's changes.
 */

import postgres from 'postgres';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function rollbackMigration() {
  const sql = postgres(DATABASE_URL!, { max: 1 });

  try {
    console.log('⚠️  Migration Rollback\n');
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
      console.log('\n❌ No migrations have been applied yet\n');
      return;
    }

    // Get the last applied migration
    const lastMigration = await sql`
      SELECT id, name, applied_at
      FROM __drizzle_migrations
      ORDER BY id DESC
      LIMIT 1
    `;

    if (lastMigration.length === 0) {
      console.log('\n❌ No migrations to rollback\n');
      return;
    }

    const migration = lastMigration[0];
    const appliedDate = new Date(migration.applied_at).toISOString().replace('T', ' ').split('.')[0];

    console.log('\n📋 Last Applied Migration:');
    console.log(`   Name: ${migration.name}`);
    console.log(`   Applied: ${appliedDate}`);
    console.log();
    console.log('⚠️  WARNING: This will mark the migration as rolled back.');
    console.log('⚠️  You must manually revert database changes or create');
    console.log('⚠️  a new forward migration to undo the changes.');
    console.log();

    const answer = await askQuestion('Are you sure you want to rollback? (yes/no): ');

    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Rollback cancelled\n');
      return;
    }

    // Remove the migration record
    await sql`
      DELETE FROM __drizzle_migrations
      WHERE id = ${migration.id}
    `;

    console.log('\n✅ Migration rolled back successfully!');
    console.log(`   Removed: ${migration.name}`);
    console.log();
    console.log('📝 Next steps:');
    console.log('   1. Manually revert database changes, OR');
    console.log('   2. Create a new migration to undo the changes');
    console.log();
    console.log('💡 Recommended approach for production:');
    console.log('   Create a new forward migration instead of rolling back');
    console.log('   Example: pnpm db:create revert_previous_changes\n');
  } catch (error: any) {
    console.error('\n❌ Rollback failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

rollbackMigration();
