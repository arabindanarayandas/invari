# Invari Database Migrations Guide

Production-grade custom migration workflow using Drizzle ORM.

## Table of Contents

- [Overview](#overview)
- [Migration Commands](#migration-commands)
- [Creating Migrations](#creating-migrations)
- [Running Migrations](#running-migrations)
- [Migration Status](#migration-status)
- [Rollback](#rollback)
- [Best Practices](#best-practices)
- [Migration File Structure](#migration-file-structure)
- [Troubleshooting](#troubleshooting)

---

## Overview

Invari uses **custom migrations** for production-grade database management. This approach gives you full control over migration naming, SQL execution, and versioning.

### Key Features

- ✅ **Manual Naming**: Name migrations descriptively (e.g., `0001_add_user_preferences.sql`)
- ✅ **Full SQL Control**: Write exact SQL needed for your schema changes
- ✅ **Version Tracking**: Sequential numbering ensures proper migration order
- ✅ **Rollback Support**: Track and manage rollbacks safely
- ✅ **Production-Ready**: Transactional migrations with error handling

---

## Migration Commands

```bash
# Create a new migration
pnpm db:create <migration-name>

# Run pending migrations
pnpm db:migrate

# Check migration status
pnpm db:status

# Rollback last migration
pnpm db:rollback

# Open Drizzle Studio (database GUI)
pnpm db:studio

# Seed database with demo data
pnpm db:seed
```

---

## Creating Migrations

### Step 1: Create Migration File

```bash
pnpm db:create add_user_preferences
```

This creates: `engine/drizzle/migrations/0002_add_user_preferences.sql`

### Step 2: Edit Migration File

```sql
-- Migration: add user preferences
-- Created: 2026-02-23
-- Description: Add user_preferences table for storing user settings

-- ============================================
-- UP Migration
-- ============================================

CREATE TABLE IF NOT EXISTS "user_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "theme" varchar(20) DEFAULT 'light' NOT NULL,
  "notifications_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_preferences_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "idx_user_preferences_user_id"
  ON "user_preferences" ("user_id");

-- ============================================
-- DOWN Migration (for rollback)
-- ============================================
-- To rollback:
-- DROP TABLE IF EXISTS "user_preferences" CASCADE;
```

### Step 3: Run Migration

```bash
pnpm db:migrate
```

---

## Running Migrations

### Local Development

```bash
# Check current status
pnpm db:status

# Run pending migrations
pnpm db:migrate
```

### Docker / Production

Migrations run automatically on container startup via `docker-entrypoint.sh`:

```bash
# Start with docker-compose
docker-compose up

# Or manually in container
docker-compose exec app sh
cd /app/engine
pnpm db:migrate
```

---

## Migration Status

### Check What's Applied

```bash
pnpm db:status
```

**Output:**
```
📊 Migration Status
============================================================

📁 Total migrations: 3
✅ Applied: 2
⏳ Pending: 1

============================================================

Migrations:

✅ Applied     0001_initial_schema.sql
   Applied at: 2026-02-23 10:30:45

✅ Applied     0002_add_user_preferences.sql
   Applied at: 2026-02-23 11:15:22

⏳ Pending     0003_add_agent_settings.sql

============================================================

💡 Run: pnpm db:migrate to apply pending migrations
```

---

## Rollback

### ⚠️ Important: Rollback Strategy

**Recommended for Production:** Create a new **forward migration** instead of rolling back.

```bash
# Instead of rollback, create a revert migration
pnpm db:create revert_user_preferences

# Then write SQL to undo the previous migration
```

### Manual Rollback (Development Only)

```bash
pnpm db:rollback
```

This marks the last migration as rolled back but **does NOT execute SQL automatically**.

You must manually:
1. Revert database changes, OR
2. Create a new migration to undo changes

---

## Best Practices

### 1. Naming Conventions

Use descriptive, lowercase names with underscores:

```bash
✅ pnpm db:create add_user_preferences
✅ pnpm db:create update_agents_add_status_field
✅ pnpm db:create create_audit_logs_table
✅ pnpm db:create add_index_on_request_logs

❌ pnpm db:create migration1
❌ pnpm db:create updateDB
❌ pnpm db:create New-Migration
```

### 2. Keep Migrations Small

- **One logical change per migration**
- Easier to review, test, and rollback
- Reduces risk of partial failures

```bash
# Good: Separate migrations
pnpm db:create add_status_field_to_agents
pnpm db:create add_index_on_agent_status

# Bad: One large migration
pnpm db:create update_entire_database
```

### 3. Use IF NOT EXISTS / IF EXISTS

Protect against re-running migrations:

```sql
CREATE TABLE IF NOT EXISTS "table_name" (...);
CREATE INDEX IF NOT EXISTS "idx_name" ON "table" (...);
DROP TABLE IF EXISTS "old_table" CASCADE;
```

### 4. Test Before Production

```bash
# 1. Apply migration on dev/staging
pnpm db:migrate

# 2. Verify data integrity
pnpm db:studio

# 3. Test application
pnpm dev

# 4. Deploy to production
```

### 5. Always Add Indexes

For frequently queried columns:

```sql
-- Bad: No index on foreign key
ALTER TABLE "posts" ADD COLUMN "user_id" uuid;

-- Good: Add index immediately
ALTER TABLE "posts" ADD COLUMN "user_id" uuid;
CREATE INDEX IF NOT EXISTS "idx_posts_user_id" ON "posts" ("user_id");
```

### 6. Document Complex Migrations

```sql
-- Migration: optimize_request_logs_table
-- Created: 2026-02-23
-- Description: Add composite index for dashboard queries
--              This improves performance for /dashboard API by ~80%
--
-- Performance impact:
--   - Migration time: ~30 seconds on 1M rows
--   - Index size: ~50MB
--   - Query speedup: 800ms → 150ms
```

---

## Migration File Structure

### Directory Layout

```
engine/
├── drizzle/
│   ├── migrations/              # Custom migration files
│   │   ├── 0001_initial_schema.sql
│   │   ├── 0002_add_user_preferences.sql
│   │   └── 0003_add_agent_settings.sql
│   └── templates/
│       └── migration.sql.template
├── scripts/
│   ├── create-migration.ts      # Create new migration
│   ├── migrate-up.ts            # Run migrations
│   ├── migrate-down.ts          # Rollback migration
│   └── migrate-status.ts        # Check status
├── src/
│   └── db/
│       ├── schema.ts            # Drizzle schema definitions
│       ├── index.ts             # Database connection
│       └── migrations-archive/  # Old auto-generated migrations
└── drizzle.config.ts            # Drizzle Kit configuration
```

### Migration Tracking Table

Migrations are tracked in `__drizzle_migrations`:

```sql
CREATE TABLE __drizzle_migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

---

## Troubleshooting

### Migration Failed

```bash
# Check error message
pnpm db:migrate

# If migration partially applied, manually fix database
pnpm db:studio

# Then mark migration as failed/rolled back
pnpm db:rollback
```

### Database Out of Sync

```bash
# Check current state
pnpm db:status

# Compare with actual database
pnpm db:studio

# If migrations table is corrupted, manually fix:
# 1. Connect to database
# 2. SELECT * FROM __drizzle_migrations;
# 3. DELETE incorrect entries
# 4. Re-run: pnpm db:migrate
```

### Reset Database (Development Only)

```bash
# Drop all tables and start fresh
docker-compose down -v
docker-compose up

# Or manually:
psql -U invari -d invari -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
pnpm db:migrate
```

### Forgot to Create Migration

If you changed `schema.ts` without creating a migration:

```bash
# 1. Create migration
pnpm db:create update_schema_changes

# 2. Generate SQL from schema changes
pnpm db:generate

# 3. Copy SQL from generated file to your custom migration
# 4. Run migration
pnpm db:migrate
```

---

## Production Deployment Checklist

- [ ] Test migration on local database
- [ ] Test migration on staging database
- [ ] Backup production database
- [ ] Review migration SQL for destructive operations
- [ ] Check migration runs in transaction
- [ ] Verify no long-running locks (for large tables)
- [ ] Test application after migration
- [ ] Monitor for errors after deployment
- [ ] Have rollback plan ready

---

## Emergency Rollback (Production)

If migration causes production issues:

### Option 1: Forward Fix (Recommended)

```bash
# Create new migration to fix issue
pnpm db:create hotfix_migration_issue

# Deploy fix immediately
pnpm db:migrate
```

### Option 2: Manual Rollback

```bash
# 1. SSH into production server
ssh user@production-server

# 2. Connect to database
psql -U invari -d invari

# 3. Manually revert changes (use DOWN migration SQL)
DROP TABLE IF EXISTS "problem_table";

# 4. Remove migration record
DELETE FROM __drizzle_migrations WHERE name = '0003_problem_migration.sql';

# 5. Restart application
docker-compose restart app
```

---

## Auto-Generated vs Custom Migrations

### Auto-Generated (NOT USED)

```bash
# Drizzle Kit can auto-generate migrations
pnpm db:generate
```

**Why we don't use this:**
- ❌ Random names like `0001_shiny_hulk.sql`
- ❌ Less control over exact SQL
- ❌ Harder to review
- ❌ Not production-friendly

### Custom Migrations (CURRENT APPROACH)

```bash
# We create custom migrations
pnpm db:create add_feature
```

**Benefits:**
- ✅ Descriptive names
- ✅ Full SQL control
- ✅ Easy to review
- ✅ Production-ready

**Note:** You can still use `pnpm db:generate` as a reference to see what SQL Drizzle would generate, then copy/modify it into your custom migration.

---

## Resources

- **Drizzle ORM Docs:** https://orm.drizzle.team/docs/overview
- **Custom Migrations Guide:** https://orm.drizzle.team/docs/kit-custom-migrations
- **PostgreSQL Docs:** https://www.postgresql.org/docs/

---

**Built with Drizzle ORM, PostgreSQL 15, and TypeScript**
