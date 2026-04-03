-- Migration: add soft delete to agents
-- Created: 2026-04-03
-- Description: Add deleted_at column to agents table for soft deletion functionality, allowing agents to be marked as deleted while preserving associated data

-- ============================================
-- UP Migration
-- ============================================

-- Add deleted_at field for soft deletion tracking
ALTER TABLE agents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index on deleted_at for efficient filtering of active agents
CREATE INDEX IF NOT EXISTS idx_agents_deleted_at ON agents(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create index on user_id and deleted_at for efficient user agent queries
CREATE INDEX IF NOT EXISTS idx_agents_user_id_deleted_at ON agents(user_id, deleted_at);

-- ============================================
-- DOWN Migration (for rollback)
-- ============================================
-- To rollback this migration:
-- DROP INDEX IF EXISTS idx_agents_user_id_deleted_at;
-- DROP INDEX IF EXISTS idx_agents_deleted_at;
-- ALTER TABLE agents DROP COLUMN IF EXISTS deleted_at;
