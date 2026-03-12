#!/usr/bin/env tsx

/**
 * Create a new custom migration file
 *
 * Usage:
 *   pnpm db:create <migration-name>
 *
 * Example:
 *   pnpm db:create add_user_preferences
 *   pnpm db:create update_agents_table
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get migration name from command line
const migrationName = process.argv[2];

if (!migrationName) {
  console.error('❌ Error: Migration name is required');
  console.log('\nUsage:');
  console.log('  pnpm db:create <migration-name>');
  console.log('\nExample:');
  console.log('  pnpm db:create add_user_preferences');
  process.exit(1);
}

// Validate migration name (only lowercase letters, numbers, and underscores)
if (!/^[a-z0-9_]+$/.test(migrationName)) {
  console.error('❌ Error: Migration name can only contain lowercase letters, numbers, and underscores');
  console.error(`   Invalid name: "${migrationName}"`);
  process.exit(1);
}

// Get the next migration number
const migrationsDir = path.join(__dirname, '../drizzle/migrations');
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

const existingMigrations = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

let nextNumber = 1;
if (existingMigrations.length > 0) {
  const lastMigration = existingMigrations[existingMigrations.length - 1];
  const lastNumber = parseInt(lastMigration.split('_')[0]);
  nextNumber = lastNumber + 1;
}

// Format migration number (0001, 0002, etc.)
const migrationNumber = String(nextNumber).padStart(4, '0');
const fullMigrationName = `${migrationNumber}_${migrationName}.sql`;

// Read template
const templatePath = path.join(__dirname, '../drizzle/templates/migration.sql.template');
let template = fs.readFileSync(templatePath, 'utf-8');

// Replace placeholders
const now = new Date();
const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

template = template
  .replace('{{MIGRATION_NAME}}', migrationName.replace(/_/g, ' '))
  .replace('{{DATE}}', dateStr)
  .replace('{{DESCRIPTION}}', 'TODO: Add description');

// Write migration file
const migrationPath = path.join(migrationsDir, fullMigrationName);
fs.writeFileSync(migrationPath, template);

console.log('✅ Migration created successfully!');
console.log(`\n📄 File: ${fullMigrationName}`);
console.log(`📁 Path: ${migrationPath}`);
console.log('\n📝 Next steps:');
console.log('  1. Edit the migration file and add your SQL');
console.log('  2. Run: pnpm db:migrate');
console.log('\n💡 Tips:');
console.log('  - Use IF NOT EXISTS for CREATE statements');
console.log('  - Test migrations on a dev database first');
console.log('  - Keep migrations small and focused');
