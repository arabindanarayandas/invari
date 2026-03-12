#!/usr/bin/env tsx

/**
 * Create default admin user if database is empty
 *
 * Usage:
 *   pnpm db:create-default-user
 *
 * Environment variables:
 *   DEFAULT_ADMIN_EMAIL - Email for default admin (default: admin@invari.ai)
 *   DEFAULT_ADMIN_PASSWORD - Password for default admin (default: invari123)
 *
 * This script:
 * 1. Checks if users table is empty
 * 2. If empty, creates a default admin user
 * 3. Logs the credentials for first login
 */

import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
const DEFAULT_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || 'admin@invari.ai';
const DEFAULT_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'invari123';
const SALT_ROUNDS = 10;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function createDefaultUser() {
  const sql = postgres(DATABASE_URL!, { max: 1 });

  try {
    console.log('🔐 Checking for existing users...');

    // Check if users table has any records
    const users = await sql`SELECT COUNT(*) as count FROM users`;
    const userCount = parseInt(users[0].count as string, 10);

    if (userCount > 0) {
      console.log(`✅ Database has ${userCount} user(s). Skipping default user creation.`);
      return;
    }

    console.log('👤 No users found. Creating default admin user...\n');

    // Hash the password
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

    // Insert default user
    const [newUser] = await sql`
      INSERT INTO users (email, password_hash)
      VALUES (${DEFAULT_EMAIL}, ${passwordHash})
      RETURNING id, email, created_at
    `;

    console.log('✅ Default admin user created successfully!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  🔑 DEFAULT ADMIN CREDENTIALS');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  Email:    ${DEFAULT_EMAIL}`);
    console.log(`  Password: ${DEFAULT_PASSWORD}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('  ⚠️  IMPORTANT: Change these credentials after first login!');
    console.log('═══════════════════════════════════════════════════════\n');
  } catch (error: any) {
    console.error('\n❌ Failed to create default user:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

createDefaultUser();
