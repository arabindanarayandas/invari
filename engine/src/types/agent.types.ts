import type { SyncInterval } from './schema-subscription.types.js';

export interface CreateAgentDTO {
  name: string;
  targetBaseUrl?: string; // Optional - for validation-only mode
  openApiSpec?: object;

  // Auto-sync configuration (alternative to openApiSpec)
  schemaSourceUrl?: string;
  schemaSyncInterval?: SyncInterval;
}

export interface UpdateAgentDTO {
  name?: string;
  targetBaseUrl?: string;

  // Auto-sync configuration
  schemaSourceUrl?: string;
  schemaSyncInterval?: SyncInterval;
}

export interface UpdateSchemaDTO {
  openApiSpec: object;
  version?: string;
}

export interface Agent {
  id: string;
  userId: string;
  name: string;
  targetBaseUrl: string | null; // Nullable for validation-only mode
  invariApiKey: string;
  createdAt: Date;
}

export interface ApiSchema {
  id: string;
  agentId: string;
  version: string | null;
  schemaSpec: object;
  isActive: boolean;
  createdAt: Date;
}

export interface AgentWithSchema extends Agent {
  schema?: ApiSchema;
}
