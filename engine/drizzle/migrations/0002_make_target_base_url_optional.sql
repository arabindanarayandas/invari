-- Migration: Make target_base_url nullable to support validation-only mode
-- Description: Invari will focus on validation and repair detection without proxying to target APIs

-- Make target_base_url column nullable
ALTER TABLE agents ALTER COLUMN target_base_url DROP NOT NULL;

-- Add a comment explaining the change
COMMENT ON COLUMN agents.target_base_url IS 'Optional target API base URL. When null, Invari operates in validation-only mode without proxying requests.';
