import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import SwaggerParser from '@apidevtools/swagger-parser';
import type { ValidationError, ValidationResult } from '../types/proxy.types.js';
import { ERROR_TYPE, type ErrorType } from '../types/proxy.types.js';

const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false,
  coerceTypes: false, // Handle coercion manually for better control
});

addFormats(ajv);

/**
 * Parse and dereference OpenAPI specification
 */
export async function parseOpenApiSpec(spec: object): Promise<any> {
  try {
    const api = await SwaggerParser.dereference(spec as any);
    return api;
  } catch (error) {
    throw new Error(`Invalid OpenAPI specification: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract JSON Schema for a specific endpoint and method
 */
export function extractRequestSchema(
  openApiSpec: any,
  method: string,
  path: string
): object | null {
  const pathItem = openApiSpec.paths?.[path];
  if (!pathItem) return null;

  const operation = pathItem[method.toLowerCase()];
  if (!operation) return null;

  // Get request body schema (for POST, PUT, PATCH)
  const requestBody = operation.requestBody;
  if (!requestBody) return null;

  // Get JSON content schema
  const jsonContent = requestBody.content?.['application/json'];
  if (!jsonContent?.schema) return null;

  return jsonContent.schema;
}

/**
 * Validate request body against OpenAPI schema
 */
export function validateRequest(
  requestBody: any,
  schema: object
): ValidationResult {
  const validate = ajv.compile(schema);
  const isValid = validate(requestBody);

  if (isValid) {
    return {
      isValid: true,
      errors: [],
    };
  }


  const errors: ValidationError[] = (validate.errors || []).map(err => {
    const field = err.instancePath ? err.instancePath.slice(1).replace(/\//g, '.') : 'root';

    let message = err.message || 'Validation error';

    let errorType: ErrorType = ERROR_TYPE.UNKNOWN;
    // Add parameter info for better error messages and track error types
    if (err.params) {
      if (err.params.missingProperty) {
        errorType = ERROR_TYPE.MISSING_PROPERTY;
        message = `Missing required property: ${err.params.missingProperty}`;
      } else if (err.params.additionalProperty) {
        errorType = ERROR_TYPE.ADDITIONAL_PROPERTY;
        message = `Additional property not allowed: ${err.params.additionalProperty}`;
      } else if (err.params.type) {
        errorType = ERROR_TYPE.INVALID_TYPE;
        message = `Should be ${err.params.type}`;
      } else if (err.params.format) {
        errorType = ERROR_TYPE.INVALID_FORMAT;
        message = `Must match format '${err.params.format}'`;
      }
    }

    return {
      field,
      message,
      path: err.instancePath || '/',
      errorType,
    };
  });

  return {
    isValid: false,
    errors,
  };
}

/**
 * Get all field names from a JSON Schema
 */
export function extractSchemaFields(schema: any): {
  required: string[];
  optional: string[];
  all: string[];
  properties: Record<string, { type: string; format?: string; default?: any }>;
} {
  const properties = schema.properties || {};
  const required = schema.required || [];

  const allFields = Object.keys(properties);
  const optionalFields = allFields.filter(f => !required.includes(f));

  const fieldTypes: Record<string, { type: string; format?: string; default?: any }> = {};

  for (const [field, props] of Object.entries(properties) as [string, any][]) {
    fieldTypes[field] = {
      type: props.type || 'string',
      format: props.format,
      default: props.default,
    };
  }

  return {
    required,
    optional: optionalFields,
    all: allFields,
    properties: fieldTypes,
  };
}

/**
 * Find the best matching endpoint in OpenAPI spec
 */
export function findMatchingEndpoint(
  openApiSpec: any,
  requestPath: string,
  method: string
): { path: string; params: Record<string, string> } | null {
  const paths = Object.keys(openApiSpec.paths || {});

  // Try exact match first
  if (paths.includes(requestPath)) {
    return { path: requestPath, params: {} };
  }

  // Try pattern matching for path parameters
  for (const path of paths) {
    const match = matchPathPattern(path, requestPath);
    if (match) {
      // Check if method exists for this path
      const pathItem = openApiSpec.paths[path];
      if (pathItem[method.toLowerCase()]) {
        return { path, params: match.params };
      }
    }
  }

  return null;
}

/**
 * Match a request path against an OpenAPI path pattern
 */
function matchPathPattern(
  pattern: string,
  requestPath: string
): { params: Record<string, string> } | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const requestParts = requestPath.split('/').filter(Boolean);

  if (patternParts.length !== requestParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const requestPart = requestParts[i];

    // Check if this is a path parameter
    if (patternPart.startsWith('{') && patternPart.endsWith('}')) {
      const paramName = patternPart.slice(1, -1);
      params[paramName] = requestPart;
    } else if (patternPart !== requestPart) {
      // Not a parameter and doesn't match exactly
      return null;
    }
  }

  return { params };
}
