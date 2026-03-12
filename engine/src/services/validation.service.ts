import {
  parseOpenApiSpec,
  extractRequestSchema,
  validateRequest,
  extractSchemaFields,
  findMatchingEndpoint,
} from '../utils/openapi-validator.js';
import type { ValidationResult } from '../types/proxy.types.js';
import { ERROR_TYPE } from '../types/proxy.types.js';

export class ValidationService {
  private schemaCache: Map<string, any> = new Map();

  /**
   * Parse and cache OpenAPI specification
   */
  async parseAndCacheSchema(agentId: string, schemaSpec: object): Promise<void> {
    const parsedSpec = await parseOpenApiSpec(schemaSpec);
    this.schemaCache.set(agentId, parsedSpec);
  }

  /**
   * Get cached schema or throw error
   */
  private getCachedSchema(agentId: string): any {
    const schema = this.schemaCache.get(agentId);
    if (!schema) {
      throw new Error('Schema not loaded for agent. Please upload an OpenAPI specification.');
    }
    return schema;
  }

  /**
   * Validate request against OpenAPI schema
   */
  validateRequestAgainstSchema(
    agentId: string,
    method: string,
    path: string,
    requestBody: any
  ): {
    validation: ValidationResult;
    schema: object | null;
    matchedPath: string | null;
    pathParams: Record<string, string>;
  } {
    const openApiSpec = this.getCachedSchema(agentId);

    // Find matching endpoint (handles path parameters)
    const matchResult = findMatchingEndpoint(openApiSpec, path, method);

    if (!matchResult) {
      return {
        validation: {
          isValid: false,
          errors: [
            {
              field: 'endpoint',
              message: `Endpoint ${method} ${path} not found in OpenAPI specification`,
              path: '/',
              errorType: ERROR_TYPE.UNKNOWN,
            },
          ],
        },
        schema: null,
        matchedPath: null,
        pathParams: {},
      };
    }

    // Extract request schema for this endpoint
    const schema = extractRequestSchema(openApiSpec, method, matchResult.path);

    if (!schema) {
      // No request body schema defined (might be GET/DELETE)
      return {
        validation: { isValid: true, errors: [] },
        schema: null,
        matchedPath: matchResult.path,
        pathParams: matchResult.params,
      };
    }

    // Validate request body against schema
    const validation = validateRequest(requestBody, schema);

    return {
      validation,
      schema,
      matchedPath: matchResult.path,
      pathParams: matchResult.params,
    };
  }

  /**
   * Extract field information from schema
   */
  getSchemaFields(schema: object) {
    return extractSchemaFields(schema);
  }

  /**
   * Clear cached schema for an agent
   */
  clearSchemaCache(agentId: string): void {
    this.schemaCache.delete(agentId);
  }

  /**
   * Check if schema is cached for an agent
   */
  isSchemaCached(agentId: string): boolean {
    return this.schemaCache.has(agentId);
  }
}

export const validationService = new ValidationService();
