import crypto from 'crypto';
import { agentRepository } from '../repositories/agent.repository.js';
import { schemaRepository } from '../repositories/schema.repository.js';
import { schemaSubscriptionRepository } from '../repositories/schema-subscription.repository.js';
import { schemaSyncLogsRepository } from '../repositories/schema-sync-logs.repository.js';
import { parseOpenApiSpec } from '../utils/openapi-validator.js';
import { validationService } from './validation.service.js';
import { schemaSyncService } from './schema-sync.service.js';
import type { CreateAgentDTO, UpdateAgentDTO } from '../types/agent.types.js';

export class AgentService {
  /**
   * Create a new agent with unique API key
   */
  async createAgent(userId: string, data: CreateAgentDTO) {
    // Generate unique Invari API key
    const invariApiKey = await this.generateUniqueApiKey();

    // Create agent (targetBaseUrl is optional for validation-only mode)
    const agent = await agentRepository.create({
      userId,
      name: data.name,
      targetBaseUrl: data.targetBaseUrl || null,
      invariApiKey,
    });

    // Handle schema upload or auto-sync setup
    if (data.openApiSpec) {
      // Manual upload
      await this.uploadSchema(agent.id, userId, data.openApiSpec);
    } else if (data.schemaSourceUrl && data.schemaSyncInterval) {
      // Auto-sync setup
      const subscription = await schemaSubscriptionRepository.createOrUpdate({
        agentId: agent.id,
        sourceUrl: data.schemaSourceUrl,
        syncInterval: data.schemaSyncInterval,
      });

      // Trigger immediate sync
      await schemaSyncService.triggerImmediateSync(subscription.id);
    }

    return agent;
  }

  /**
   * Get agent by ID (with authorization check)
   */
  async getAgentById(agentId: string, userId: string) {
    const agent = await agentRepository.findById(agentId);

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Check if user owns this agent
    if (agent.userId !== userId) {
      throw new Error('Unauthorized access to agent');
    }

    // Get active schema if exists
    const activeSchema = await schemaRepository.findActiveByAgentId(agentId);

    // Get subscription if exists
    const subscription = await schemaSubscriptionRepository.findByAgentId(agentId);

    // Get recent sync logs if subscription exists
    let recentSyncLogs: any[] = [];
    if (subscription) {
      recentSyncLogs = await schemaSyncLogsRepository.findBySubscriptionId(subscription.id, 10);
    }

    // Parse endpoints from the active schema if it exists
    let endpoints: Array<{ path: string; method: string; summary?: string }> = [];
    let spec = null;

    if (activeSchema && activeSchema.schemaSpec) {
      spec = activeSchema.schemaSpec;
      const paths = (spec as any).paths || {};

      // Extract all endpoints from the OpenAPI spec
      Object.keys(paths).forEach((path) => {
        const pathItem = paths[path];
        Object.keys(pathItem).forEach((method) => {
          if (['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method.toLowerCase())) {
            const operation = pathItem[method];
            endpoints.push({
              path,
              method: method.toUpperCase(),
              summary: operation.summary || operation.description || undefined,
            });
          }
        });
      });
    }

    return {
      ...agent,
      activeSchema: activeSchema || null,
      subscription: subscription || null,
      recentSyncLogs,
      endpoints,
      spec,
    };
  }

  /**
   * Get all agents for a user
   */
  async getUserAgents(userId: string) {
    const agents = await agentRepository.findByUserId(userId);

    // Fetch active schema for each agent and parse endpoints
    const agentsWithSchemas = await Promise.all(
      agents.map(async (agent) => {
        const activeSchema = await schemaRepository.findActiveByAgentId(agent.id);

        // Parse endpoints from the active schema if it exists
        let endpoints: Array<{ path: string; method: string; summary?: string }> = [];
        let spec = null;

        if (activeSchema && activeSchema.schemaSpec) {
          spec = activeSchema.schemaSpec;
          const paths = (spec as any).paths || {};

          // Extract all endpoints from the OpenAPI spec
          Object.keys(paths).forEach((path) => {
            const pathItem = paths[path];
            Object.keys(pathItem).forEach((method) => {
              if (['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method.toLowerCase())) {
                const operation = pathItem[method];
                endpoints.push({
                  path,
                  method: method.toUpperCase(),
                  summary: operation.summary || operation.description || undefined,
                });
              }
            });
          });
        }

        return {
          ...agent,
          activeSchema: activeSchema || null,
          endpoints,
          spec,
        };
      })
    );

    return agentsWithSchemas;
  }

  /**
   * Update agent
   */
  async updateAgent(agentId: string, userId: string, data: UpdateAgentDTO) {
    const agent = await agentRepository.findById(agentId);

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Check ownership
    if (agent.userId !== userId) {
      throw new Error('Unauthorized access to agent');
    }

    // Update agent basic fields
    const updatedAgent = await agentRepository.update(agentId, {
      name: data.name,
      targetBaseUrl: data.targetBaseUrl,
    });

    // Handle schema subscription updates
    if (data.schemaSourceUrl && data.schemaSyncInterval) {
      // Create or update subscription
      const subscription = await schemaSubscriptionRepository.createOrUpdate({
        agentId,
        sourceUrl: data.schemaSourceUrl,
        syncInterval: data.schemaSyncInterval,
      });

      // Trigger immediate sync
      await schemaSyncService.triggerImmediateSync(subscription.id);
    } else if (data.schemaSourceUrl === null || data.schemaSyncInterval === null) {
      // Remove subscription if explicitly set to null
      await schemaSubscriptionRepository.deleteByAgentId(agentId);
    }

    return updatedAgent;
  }

  /**
   * Delete agent
   */
  async deleteAgent(agentId: string, userId: string) {
    const agent = await agentRepository.findById(agentId);

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Check ownership
    if (agent.userId !== userId) {
      throw new Error('Unauthorized access to agent');
    }

    await agentRepository.delete(agentId);
  }

  /**
   * Upload OpenAPI schema for an agent
   */
  async uploadSchema(agentId: string, userId: string, schemaSpec: object, version?: string) {
    const agent = await agentRepository.findById(agentId);

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Check ownership
    if (agent.userId !== userId) {
      throw new Error('Unauthorized access to agent');
    }

    // Validate OpenAPI spec
    try {
      await parseOpenApiSpec(schemaSpec);
    } catch (error) {
      throw new Error(`Invalid OpenAPI specification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Calculate version hash
    const jsonString = JSON.stringify(schemaSpec);
    const versionHash = crypto.createHash('sha256').update(jsonString).digest('hex');

    // Deactivate all previous schemas for this agent
    await schemaRepository.deactivateAllForAgent(agentId);

    // Create new schema (active by default)
    const schema = await schemaRepository.create({
      agentId,
      version: version || null,
      schemaSpec,
      isActive: true,
      versionHash,
    });

    // Invalidate the validation cache for this agent
    validationService.clearSchemaCache(agentId);

    return schema;
  }

  /**
   * Get all schemas for an agent (with endpoint counts and source type)
   */
  async getAgentSchemas(agentId: string, userId: string) {
    const agent = await agentRepository.findById(agentId);

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Check ownership
    if (agent.userId !== userId) {
      throw new Error('Unauthorized access to agent');
    }

    const schemas = await schemaRepository.findByAgentId(agentId);

    // Enhance each schema with endpoint count and source type
    const enhancedSchemas = schemas.map((schema) => {
      const spec = schema.schemaSpec as any;
      const paths = spec.paths || {};
      let endpointCount = 0;

      // Count endpoints
      Object.keys(paths).forEach((path) => {
        const pathItem = paths[path];
        Object.keys(pathItem).forEach((method) => {
          if (['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method.toLowerCase())) {
            endpointCount++;
          }
        });
      });

      // Determine source type
      const sourceType = schema.subscriptionId ? 'auto-sync' : 'manual';

      return {
        ...schema,
        endpointCount,
        sourceType,
        specVersion: spec.info?.version || 'N/A',
        specTitle: spec.info?.title || 'Untitled API',
      };
    });

    return enhancedSchemas;
  }

  /**
   * Set a schema as active for an agent
   */
  async setActiveSchema(agentId: string, schemaId: string, userId: string) {
    const agent = await agentRepository.findById(agentId);

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Check ownership
    if (agent.userId !== userId) {
      throw new Error('Unauthorized access to agent');
    }

    // Verify schema belongs to this agent
    const schema = await schemaRepository.findById(schemaId);
    if (!schema || schema.agentId !== agentId) {
      throw new Error('Schema not found for this agent');
    }

    // Set as active
    const updatedSchema = await schemaRepository.setActive(schemaId, agentId);

    // Invalidate the validation cache for this agent
    validationService.clearSchemaCache(agentId);

    return updatedSchema;
  }

  /**
   * Validate OpenAPI specification from content or URL
   */
  async validateOpenApiSpec(specContent?: string, sourceUrl?: string) {
    let spec: any;

    try {
      if (sourceUrl) {
        // Fetch spec from URL
        const response = await fetch(sourceUrl, {
          headers: {
            'Accept': 'application/json, application/yaml, text/yaml, text/plain',
          },
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch spec from URL: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();

        // Parse based on content type
        if (contentType.includes('json') || sourceUrl.endsWith('.json')) {
          spec = JSON.parse(text);
        } else {
          // Try to parse as JSON first, fallback to YAML
          try {
            spec = JSON.parse(text);
          } catch {
            // Import yaml dynamically if needed
            const yaml = await import('yaml');
            spec = yaml.parse(text);
          }
        }
      } else if (specContent) {
        // Parse spec content
        try {
          spec = JSON.parse(specContent);
        } catch {
          // Try YAML parsing
          const yaml = await import('yaml');
          spec = yaml.parse(specContent);
        }
      } else {
        throw new Error('Either specContent or sourceUrl must be provided');
      }

      // Validate using OpenAPI validator
      await parseOpenApiSpec(spec);

      // Extract endpoint count
      const paths = spec.paths || {};
      let endpointCount = 0;

      Object.keys(paths).forEach((path) => {
        const pathItem = paths[path];
        Object.keys(pathItem).forEach((method) => {
          if (['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method.toLowerCase())) {
            endpointCount++;
          }
        });
      });

      return {
        valid: true,
        endpointCount,
        version: spec.info?.version || 'N/A',
        title: spec.info?.title || 'Untitled API',
      };
    } catch (error) {
      throw new Error(`Invalid OpenAPI specification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a unique API key for Invari
   */
  private async generateUniqueApiKey(): Promise<string> {
    const prefix = 'invari_';
    let apiKey: string;
    let isUnique = false;

    // Keep generating until we get a unique key
    while (!isUnique) {
      const randomBytes = crypto.randomBytes(24);
      apiKey = prefix + randomBytes.toString('base64url');

      // Check if key already exists
      isUnique = !(await agentRepository.apiKeyExists(apiKey));
    }

    return apiKey!;
  }

  /**
   * Regenerate API key for an agent
   */
  async regenerateApiKey(agentId: string, userId: string) {
    const agent = await agentRepository.findById(agentId);

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Check ownership
    if (agent.userId !== userId) {
      throw new Error('Unauthorized access to agent');
    }

    // Generate new API key
    const newApiKey = await this.generateUniqueApiKey();

    // Update agent
    const updatedAgent = await agentRepository.update(agentId, {
      // @ts-expect-error - invariApiKey not in UpdateAgentDTO but valid for update
      invariApiKey: newApiKey,
    });

    return updatedAgent;
  }

  /**
   * Get endpoints from a specific schema
   */
  async getSchemaEndpoints(agentId: string, schemaId: string, userId: string) {
    const agent = await agentRepository.findById(agentId);

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Check ownership
    if (agent.userId !== userId) {
      throw new Error('Unauthorized access to agent');
    }

    // Get schema
    const schema = await schemaRepository.findById(schemaId);

    if (!schema || schema.agentId !== agentId) {
      throw new Error('Schema not found');
    }

    // Extract endpoints from schema spec
    const spec = schema.schemaSpec as any;
    const paths = spec.paths || {};
    const endpoints: Array<{
      path: string;
      method: string;
      summary?: string;
      operationId?: string;
      tags?: string[];
      security?: any[];
      description?: string;
      parameters?: any[];
      requestBody?: any;
      responses?: any;
    }> = [];

    Object.keys(paths).forEach((path) => {
      const pathItem = paths[path];
      Object.keys(pathItem).forEach((method) => {
        if (['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method.toLowerCase())) {
          const operation = pathItem[method];
          endpoints.push({
            path,
            method: method.toUpperCase(),
            summary: operation.summary,
            operationId: operation.operationId,
            tags: operation.tags,
            security: operation.security,
            description: operation.description,
            parameters: operation.parameters,
            requestBody: operation.requestBody,
            responses: operation.responses,
          });
        }
      });
    });

    return {
      schemaId,
      version: spec.info?.version || 'N/A',
      title: spec.info?.title || 'Untitled API',
      endpoints,
      endpointCount: endpoints.length,
    };
  }

  /**
   * Compare two schemas and return diff
   */
  async compareSchemas(
    agentId: string,
    fromSchemaId: string,
    toSchemaId: string,
    userId: string
  ) {
    const agent = await agentRepository.findById(agentId);

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Check ownership
    if (agent.userId !== userId) {
      throw new Error('Unauthorized access to agent');
    }

    // Get both schemas
    const fromSchema = await schemaRepository.findById(fromSchemaId);
    const toSchema = await schemaRepository.findById(toSchemaId);

    if (!fromSchema || fromSchema.agentId !== agentId) {
      throw new Error('Schema not found: fromSchemaId');
    }

    if (!toSchema || toSchema.agentId !== agentId) {
      throw new Error('Schema not found: toSchemaId');
    }

    // Extract endpoints from both schemas
    const fromSpec = fromSchema.schemaSpec as any;
    const toSpec = toSchema.schemaSpec as any;

    const fromPaths = fromSpec.paths || {};
    const toPaths = toSpec.paths || {};

    // Create endpoint maps for easier comparison
    const fromEndpoints = new Map<string, any>();
    const toEndpoints = new Map<string, any>();

    // Populate fromEndpoints map
    Object.keys(fromPaths).forEach((path) => {
      const pathItem = fromPaths[path];
      Object.keys(pathItem).forEach((method) => {
        if (['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method.toLowerCase())) {
          const key = `${method.toUpperCase()} ${path}`;
          fromEndpoints.set(key, {
            path,
            method: method.toUpperCase(),
            operation: pathItem[method],
          });
        }
      });
    });

    // Populate toEndpoints map
    Object.keys(toPaths).forEach((path) => {
      const pathItem = toPaths[path];
      Object.keys(pathItem).forEach((method) => {
        if (['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method.toLowerCase())) {
          const key = `${method.toUpperCase()} ${path}`;
          toEndpoints.set(key, {
            path,
            method: method.toUpperCase(),
            operation: pathItem[method],
          });
        }
      });
    });

    // Calculate diff
    const added: any[] = [];
    const removed: any[] = [];
    const modified: any[] = [];
    const unchanged: any[] = [];

    // Find added and modified endpoints
    toEndpoints.forEach((endpoint, key) => {
      if (!fromEndpoints.has(key)) {
        added.push({
          path: endpoint.path,
          method: endpoint.method,
          summary: endpoint.operation.summary,
          description: endpoint.operation.description,
        });
      } else {
        const fromEndpoint = fromEndpoints.get(key);
        // Detailed comparison
        if (JSON.stringify(fromEndpoint.operation) !== JSON.stringify(endpoint.operation)) {
          const detailedChanges = this.compareOperationDetails(
            fromEndpoint.operation,
            endpoint.operation
          );

          modified.push({
            path: endpoint.path,
            method: endpoint.method,
            summary: endpoint.operation.summary,
            description: endpoint.operation.description,
            changes: this.summarizeChanges(detailedChanges),
            detailedChanges,
          });
        } else {
          unchanged.push({
            path: endpoint.path,
            method: endpoint.method,
            summary: endpoint.operation.summary,
          });
        }
      }
    });

    // Find removed endpoints
    fromEndpoints.forEach((endpoint, key) => {
      if (!toEndpoints.has(key)) {
        removed.push({
          path: endpoint.path,
          method: endpoint.method,
          summary: endpoint.operation.summary,
          description: endpoint.operation.description,
        });
      }
    });

    return {
      fromSchema: {
        id: fromSchemaId,
        version: fromSpec.info?.version || 'N/A',
        createdAt: fromSchema.createdAt,
      },
      toSchema: {
        id: toSchemaId,
        version: toSpec.info?.version || 'N/A',
        createdAt: toSchema.createdAt,
      },
      summary: {
        added: added.length,
        removed: removed.length,
        modified: modified.length,
        unchanged: unchanged.length,
        total: toEndpoints.size,
      },
      added,
      removed,
      modified,
      unchanged,
    };
  }

  /**
   * Compare operation details and return structured diff
   */
  private compareOperationDetails(fromOp: any, toOp: any) {
    const changes: any = {
      summary: null,
      description: null,
      parameters: null,
      requestBody: null,
      responses: null,
    };

    // Compare summary
    if (fromOp.summary !== toOp.summary) {
      changes.summary = {
        from: fromOp.summary || null,
        to: toOp.summary || null,
      };
    }

    // Compare description
    if (fromOp.description !== toOp.description) {
      changes.description = {
        from: fromOp.description || null,
        to: toOp.description || null,
      };
    }

    // Compare parameters
    const paramChanges = this.compareParameters(fromOp.parameters || [], toOp.parameters || []);
    if (paramChanges.added.length > 0 || paramChanges.removed.length > 0 || paramChanges.modified.length > 0) {
      changes.parameters = paramChanges;
    }

    // Compare request body
    const bodyChanges = this.compareRequestBody(fromOp.requestBody, toOp.requestBody);
    if (bodyChanges) {
      changes.requestBody = bodyChanges;
    }

    // Compare responses
    const responseChanges = this.compareResponses(fromOp.responses || {}, toOp.responses || {});
    if (responseChanges.added.length > 0 || responseChanges.removed.length > 0 || responseChanges.modified.length > 0) {
      changes.responses = responseChanges;
    }

    return changes;
  }

  /**
   * Compare parameters between two operations
   */
  private compareParameters(fromParams: any[], toParams: any[]) {
    const added: any[] = [];
    const removed: any[] = [];
    const modified: any[] = [];

    // Create maps for easier lookup
    const fromMap = new Map(fromParams.map((p) => [p.name + p.in, p]));
    const toMap = new Map(toParams.map((p) => [p.name + p.in, p]));

    // Find added and modified
    toParams.forEach((toParam) => {
      const key = toParam.name + toParam.in;
      const fromParam = fromMap.get(key);

      if (!fromParam) {
        added.push({
          name: toParam.name,
          in: toParam.in,
          required: toParam.required,
          type: toParam.schema?.type || 'unknown',
          description: toParam.description,
        });
      } else if (JSON.stringify(fromParam) !== JSON.stringify(toParam)) {
        const paramChanges: any = { name: toParam.name, in: toParam.in, changes: {} };

        if (fromParam.required !== toParam.required) {
          paramChanges.changes.required = { from: fromParam.required, to: toParam.required };
        }
        if (JSON.stringify(fromParam.schema) !== JSON.stringify(toParam.schema)) {
          paramChanges.changes.schema = { from: fromParam.schema, to: toParam.schema };
        }
        if (fromParam.description !== toParam.description) {
          paramChanges.changes.description = { from: fromParam.description, to: toParam.description };
        }

        modified.push(paramChanges);
      }
    });

    // Find removed
    fromParams.forEach((fromParam) => {
      const key = fromParam.name + fromParam.in;
      if (!toMap.has(key)) {
        removed.push({
          name: fromParam.name,
          in: fromParam.in,
          required: fromParam.required,
          type: fromParam.schema?.type || 'unknown',
          description: fromParam.description,
        });
      }
    });

    return { added, removed, modified };
  }

  /**
   * Compare request body between two operations
   */
  private compareRequestBody(fromBody: any, toBody: any) {
    if (!fromBody && !toBody) return null;

    if (!fromBody && toBody) {
      return { type: 'added', body: toBody };
    }

    if (fromBody && !toBody) {
      return { type: 'removed', body: fromBody };
    }

    // Both exist, check if modified
    if (JSON.stringify(fromBody) !== JSON.stringify(toBody)) {
      return {
        type: 'modified',
        from: fromBody,
        to: toBody,
      };
    }

    return null;
  }

  /**
   * Compare responses between two operations
   */
  private compareResponses(fromResponses: any, toResponses: any) {
    const added: any[] = [];
    const removed: any[] = [];
    const modified: any[] = [];

    const fromCodes = Object.keys(fromResponses);
    const toCodes = Object.keys(toResponses);

    // Find added and modified
    toCodes.forEach((code) => {
      if (!fromResponses[code]) {
        added.push({
          statusCode: code,
          description: toResponses[code].description,
          content: toResponses[code].content,
        });
      } else if (JSON.stringify(fromResponses[code]) !== JSON.stringify(toResponses[code])) {
        modified.push({
          statusCode: code,
          from: fromResponses[code],
          to: toResponses[code],
        });
      }
    });

    // Find removed
    fromCodes.forEach((code) => {
      if (!toResponses[code]) {
        removed.push({
          statusCode: code,
          description: fromResponses[code].description,
          content: fromResponses[code].content,
        });
      }
    });

    return { added, removed, modified };
  }

  /**
   * Generate a human-readable summary of changes
   */
  private summarizeChanges(detailedChanges: any): string {
    const changeParts: string[] = [];

    if (detailedChanges.summary) changeParts.push('summary');
    if (detailedChanges.description) changeParts.push('description');
    if (detailedChanges.parameters) {
      const { added, removed, modified } = detailedChanges.parameters;
      if (added.length > 0) changeParts.push(`${added.length} parameter(s) added`);
      if (removed.length > 0) changeParts.push(`${removed.length} parameter(s) removed`);
      if (modified.length > 0) changeParts.push(`${modified.length} parameter(s) modified`);
    }
    if (detailedChanges.requestBody) changeParts.push('request body');
    if (detailedChanges.responses) {
      const { added, removed, modified } = detailedChanges.responses;
      if (added.length > 0) changeParts.push(`${added.length} response(s) added`);
      if (removed.length > 0) changeParts.push(`${removed.length} response(s) removed`);
      if (modified.length > 0) changeParts.push(`${modified.length} response(s) modified`);
    }

    return changeParts.length > 0 ? changeParts.join(', ') : 'Operation details modified';
  }

  /**
   * Trigger manual sync for auto-sync agent
   */
  async triggerManualSync(agentId: string, userId: string) {
    const agent = await agentRepository.findById(agentId);

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Check ownership
    if (agent.userId !== userId) {
      throw new Error('Unauthorized access to agent');
    }

    // Get subscription
    const subscription = await schemaSubscriptionRepository.findByAgentId(agentId);

    if (!subscription) {
      throw new Error('Agent does not have auto-sync enabled');
    }

    // Trigger immediate sync
    const result = await schemaSyncService.syncSubscription(subscription);

    return result;
  }
}

export const agentService = new AgentService();
