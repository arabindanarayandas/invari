import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Agents table - Represents one AI Agent connection
export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),

  // The destination where traffic should actually go (OPTIONAL - for validation-only mode)
  targetBaseUrl: text('target_base_url'),

  // The Secret Key the AI Agent uses to authenticate with US
  invariApiKey: varchar('flux_api_key', { length: 64 }).notNull().unique(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// API Schemas table - The "Instruction Manual" uploaded by the user
export const apiSchemas = pgTable('api_schemas', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  version: varchar('version', { length: 50 }),

  // We store the full OpenAPI/Swagger JSON here
  schemaSpec: jsonb('schema_spec').notNull(),

  // Auto-sync fields
  subscriptionId: uuid('subscription_id').references(() => apiSchemaSubscriptions.id, { onDelete: 'set null' }),
  versionHash: varchar('version_hash', { length: 64 }),

  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Request Logs table - The Guardrails
export const requestLogs = pgTable('request_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),

  // Metadata
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  agentIdentifier: varchar('agent_identifier', { length: 255 }),
  httpMethod: varchar('http_method', { length: 10 }).notNull(),
  endpointPath: text('endpoint_path').notNull(),

  // Performance Metrics
  latencyTotalMs: integer('latency_total_ms'),
  overheadMs: integer('overhead_ms'),

  // The Outcome
  status: varchar('status', { length: 20 }).notNull(), // 'stable', 'repaired', 'blocked'

  // Request Details
  requestHeaders: jsonb('request_headers'),
  queryParams: jsonb('query_params'),

  // The Payload Data (Stored as Binary JSON for speed)
  originalBody: jsonb('original_body'),
  sanitizedBody: jsonb('sanitized_body'),

  // Response Details
  responseStatus: integer('response_status'),
  responseHeaders: jsonb('response_headers'),
  responseBody: jsonb('response_body'),

  // If blocked or repaired, explain why
  driftDetails: jsonb('drift_details'),
}, (table) => {
  return {
    // Index for the Dashboard Feed (Speed is critical here)
    agentTimestampIdx: index('idx_logs_agent_timestamp').on(table.agentId, table.timestamp.desc()),
  };
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  agents: many(agents),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  user: one(users, {
    fields: [agents.userId],
    references: [users.id],
  }),
  schemas: many(apiSchemas),
  logs: many(requestLogs),
  schemaSubscription: one(apiSchemaSubscriptions, {
    fields: [agents.id],
    references: [apiSchemaSubscriptions.agentId],
  }),
}));

export const apiSchemasRelations = relations(apiSchemas, ({ one }) => ({
  agent: one(agents, {
    fields: [apiSchemas.agentId],
    references: [agents.id],
  }),
  subscription: one(apiSchemaSubscriptions, {
    fields: [apiSchemas.subscriptionId],
    references: [apiSchemaSubscriptions.id],
  }),
}));

export const requestLogsRelations = relations(requestLogs, ({ one }) => ({
  agent: one(agents, {
    fields: [requestLogs.agentId],
    references: [agents.id],
  }),
}));

// API Access Logs table - For tracking user API access with IP addresses
export const apiAccessLogs = pgTable('api_access_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // Nullable for public endpoints
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),

  // Request details
  httpMethod: varchar('http_method', { length: 10 }).notNull(),
  endpointPath: text('endpoint_path').notNull(),
  actionType: varchar('action_type', { length: 50 }).notNull(), // 'login', 'logout', 'create_agent', etc.

  // IP tracking
  ipAddress: varchar('ip_address', { length: 45 }).notNull(), // Supports IPv4 and IPv6

  // Response details
  responseStatus: integer('response_status').notNull(),
  latencyMs: integer('latency_ms'),

  // Optional metadata
  userAgent: text('user_agent'),
}, (table) => {
  return {
    // Indexes for analytical queries
    userTimestampIdx: index('idx_api_access_user_timestamp').on(table.userId, table.timestamp.desc()),
    actionTimestampIdx: index('idx_api_access_action_timestamp').on(table.actionType, table.timestamp.desc()),
    ipTimestampIdx: index('idx_api_access_ip_timestamp').on(table.ipAddress, table.timestamp.desc()),
    timestampIdx: index('idx_api_access_timestamp').on(table.timestamp.desc()),
    responseStatusIdx: index('idx_api_access_response_status').on(table.responseStatus),
  };
});

export const apiAccessLogsRelations = relations(apiAccessLogs, ({ one }) => ({
  user: one(users, {
    fields: [apiAccessLogs.userId],
    references: [users.id],
  }),
}));

// API Schema Subscriptions table - For automated OpenAPI spec syncing
export const apiSchemaSubscriptions = pgTable('api_schema_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').notNull().unique().references(() => agents.id, { onDelete: 'cascade' }),

  // Sync configuration
  sourceUrl: text('source_url').notNull(),
  syncInterval: varchar('sync_interval', { length: 20 }).notNull(), // '15min', '30min', '1hour', '6hours', '12hours', '24hours'

  // Scheduling
  nextRunAt: timestamp('next_run_at', { withTimezone: true }).notNull(),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),

  // Version tracking
  lastVersionHash: varchar('last_version_hash', { length: 64 }),

  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    // Index for efficient sync job queries
    nextRunActiveIdx: index('idx_api_schema_subscriptions_next_run').on(table.nextRunAt).where(sql`${table.isActive} = true`),
  };
});

// API Schema Sync Logs table - Observability for sync operations
export const apiSchemaSyncLogs = pgTable('api_schema_sync_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  subscriptionId: uuid('subscription_id').notNull().references(() => apiSchemaSubscriptions.id, { onDelete: 'cascade' }),

  // Outcome
  status: varchar('status', { length: 20 }).notNull(), // 'success', 'failure', 'no_change'
  errorMessage: text('error_message'),

  // Performance metrics
  latencyMs: integer('latency_ms').notNull(),
  fetchDurationMs: integer('fetch_duration_ms'),
  validationDurationMs: integer('validation_duration_ms'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    // Index for efficient log queries
    subscriptionCreatedIdx: index('idx_api_schema_sync_logs_subscription_created').on(table.subscriptionId, table.createdAt.desc()),
  };
});

// Relations for new tables
export const apiSchemaSubscriptionsRelations = relations(apiSchemaSubscriptions, ({ one, many }) => ({
  agent: one(agents, {
    fields: [apiSchemaSubscriptions.agentId],
    references: [agents.id],
  }),
  schemas: many(apiSchemas),
  syncLogs: many(apiSchemaSyncLogs),
}));

export const apiSchemaSyncLogsRelations = relations(apiSchemaSyncLogs, ({ one }) => ({
  subscription: one(apiSchemaSubscriptions, {
    fields: [apiSchemaSyncLogs.subscriptionId],
    references: [apiSchemaSubscriptions.id],
  }),
}));
