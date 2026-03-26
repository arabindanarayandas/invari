-- Migration: add google oauth fields
-- Created: 2026-03-26
-- Description: Add support for Google OAuth authentication by adding name, googleId, and authProvider fields to users table, and making passwordHash nullable

-- ============================================
-- UP Migration
-- ============================================

-- Add name field for user's full name (from Google)
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Add googleId field for Google account identifier (unique)
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- Add authProvider field to track authentication method (email or google)
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) NOT NULL DEFAULT 'email';

-- Make passwordHash nullable since Google OAuth users won't have passwords
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Create index on google_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- ============================================
-- DOWN Migration (for rollback)
-- ============================================
-- To rollback this migration:
-- DROP INDEX IF EXISTS idx_users_google_id;
-- ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
-- ALTER TABLE users DROP COLUMN IF EXISTS auth_provider;
-- ALTER TABLE users DROP COLUMN IF EXISTS google_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS name;
