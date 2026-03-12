import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationService } from '../validation.service.js';

describe('ValidationService', () => {
  let validationService: ValidationService;

  // Sample OpenAPI spec for testing
  const sampleOpenApiSpec = {
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: {
      '/api/payments': {
        post: {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['amount', 'userId', 'method'],
                  properties: {
                    amount: { type: 'number' },
                    userId: { type: 'string' },
                    method: { type: 'string', enum: ['card', 'bank', 'wallet'] },
                    currency: { type: 'string', default: 'USD' },
                    description: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      '/api/users/{id}': {
        get: {
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
        },
        patch: {
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    name: { type: 'string' },
                    age: { type: 'integer' },
                    isActive: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  const projectId = 'test-project-123';

  beforeEach(async () => {
    validationService = new ValidationService();
    await validationService.parseAndCacheSchema(projectId, sampleOpenApiSpec);
  });

  describe('Schema Caching', () => {
    it('should cache schema after parsing', async () => {
      expect(validationService.isSchemaCached(projectId)).toBe(true);
    });

    it('should return false for non-cached schema', () => {
      expect(validationService.isSchemaCached('non-existent-project')).toBe(false);
    });

    it('should clear cached schema', () => {
      validationService.clearSchemaCache(projectId);
      expect(validationService.isSchemaCached(projectId)).toBe(false);
    });
  });

  describe('Data Type Validation', () => {
    it('should PASS when all types are correct', () => {
      const validBody = {
        amount: 100,
        userId: 'user123',
        method: 'card',
      };

      const result = validationService.validateRequestAgainstSchema(
        projectId,
        'POST',
        '/api/payments',
        validBody
      );

      expect(result.validation.isValid).toBe(true);
      expect(result.validation.errors).toHaveLength(0);
    });

    it('should FAIL when string provided instead of number', () => {
      const invalidBody = {
        amount: '100', // Should be number
        userId: 'user123',
        method: 'card',
      };

      const result = validationService.validateRequestAgainstSchema(
        projectId,
        'POST',
        '/api/payments',
        invalidBody
      );

      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors.length).toBeGreaterThan(0);
      expect(result.validation.errors[0].field).toContain('amount');
    });

    it('should FAIL when number provided instead of string', () => {
      const invalidBody = {
        amount: 100,
        userId: 12345, // Should be string
        method: 'card',
      };

      const result = validationService.validateRequestAgainstSchema(
        projectId,
        'POST',
        '/api/payments',
        invalidBody
      );

      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors.some((e) => e.field.includes('userId'))).toBe(true);
    });

    it('should FAIL when wrong type for boolean', () => {
      const invalidBody = {
        email: 'test@example.com',
        isActive: 'yes', // Should be boolean
      };

      const result = validationService.validateRequestAgainstSchema(
        projectId,
        'PATCH',
        '/api/users/123',
        invalidBody
      );

      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors.some((e) => e.field.includes('isActive'))).toBe(true);
    });

    it('should send validation result with schema for repair phase', () => {
      const invalidBody = {
        amount: '100', // Type mismatch
        userId: 'user123',
        method: 'card',
      };

      const result = validationService.validateRequestAgainstSchema(
        projectId,
        'POST',
        '/api/payments',
        invalidBody
      );

      expect(result.validation.isValid).toBe(false);
      expect(result.schema).toBeDefined();
      expect(result.schema).not.toBeNull();
    });
  });

  describe('Required Fields Validation', () => {
    it('should FAIL when required field is missing', () => {
      const incompleteBody = {
        userId: 'user123',
        method: 'card',
        // missing 'amount' (required)
      };

      const result = validationService.validateRequestAgainstSchema(
        projectId,
        'POST',
        '/api/payments',
        incompleteBody
      );

      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors.some((e) => e.message.includes('amount'))).toBe(true);
    });

    it('should FAIL when multiple required fields are missing', () => {
      const incompleteBody = {
        method: 'card',
        // missing 'amount' and 'userId' (both required)
      };

      const result = validationService.validateRequestAgainstSchema(
        projectId,
        'POST',
        '/api/payments',
        incompleteBody
      );

      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should PASS when required field has default value (schema defines it)', () => {
      const bodyWithoutOptional = {
        amount: 100,
        userId: 'user123',
        method: 'card',
        // 'currency' is optional with default 'USD'
      };

      const result = validationService.validateRequestAgainstSchema(
        projectId,
        'POST',
        '/api/payments',
        bodyWithoutOptional
      );

      expect(result.validation.isValid).toBe(true);
    });

    it('should PASS when all required fields are present', () => {
      const completeBody = {
        amount: 100,
        userId: 'user123',
        method: 'card',
      };

      const result = validationService.validateRequestAgainstSchema(
        projectId,
        'POST',
        '/api/payments',
        completeBody
      );

      expect(result.validation.isValid).toBe(true);
      expect(result.validation.errors).toHaveLength(0);
    });
  });

  describe('Enum Validation', () => {
    it('should FAIL when enum value not in allowed list', () => {
      const invalidEnumBody = {
        amount: 100,
        userId: 'user123',
        method: 'bitcoin', // Not in enum ['card', 'bank', 'wallet']
      };

      const result = validationService.validateRequestAgainstSchema(
        projectId,
        'POST',
        '/api/payments',
        invalidEnumBody
      );

      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors.some((e) => e.field.includes('method'))).toBe(true);
    });

    it('should PASS when enum value matches', () => {
      const validEnumBody = {
        amount: 100,
        userId: 'user123',
        method: 'wallet', // Valid enum value
      };

      const result = validationService.validateRequestAgainstSchema(
        projectId,
        'POST',
        '/api/payments',
        validEnumBody
      );

      expect(result.validation.isValid).toBe(true);
    });

    it('should be case-sensitive for enum validation', () => {
      const caseMismatchBody = {
        amount: 100,
        userId: 'user123',
        method: 'CARD', // Wrong case
      };

      const result = validationService.validateRequestAgainstSchema(
        projectId,
        'POST',
        '/api/payments',
        caseMismatchBody
      );

      expect(result.validation.isValid).toBe(false);
    });
  });

  describe('Endpoint Matching', () => {
    it('should match exact endpoint path', () => {
      const body = { amount: 100, userId: 'user123', method: 'card' };

      const result = validationService.validateRequestAgainstSchema(
        projectId,
        'POST',
        '/api/payments',
        body
      );

      expect(result.matchedPath).toBe('/api/payments');
    });

    it('should match endpoint with path parameters', () => {
      const body = { email: 'test@example.com' };

      const result = validationService.validateRequestAgainstSchema(
        projectId,
        'PATCH',
        '/api/users/abc-123',
        body
      );

      expect(result.matchedPath).toBe('/api/users/{id}');
      expect(result.pathParams).toHaveProperty('id', 'abc-123');
    });

    it('should FAIL when endpoint not found', () => {
      const body = { some: 'data' };

      const result = validationService.validateRequestAgainstSchema(
        projectId,
        'POST',
        '/api/nonexistent',
        body
      );

      expect(result.validation.isValid).toBe(false);
      expect(result.schema).toBeNull();
      expect(result.matchedPath).toBeNull();
    });

    it('should FAIL when method not allowed for endpoint', () => {
      const body = { email: 'test@example.com' };

      const result = validationService.validateRequestAgainstSchema(
        projectId,
        'DELETE', // Not defined for /api/users/{id}
        '/api/users/123',
        body
      );

      expect(result.validation.isValid).toBe(false);
    });
  });

  describe('Schema Fields Extraction', () => {
    it('should extract schema fields correctly', () => {
      const result = validationService.validateRequestAgainstSchema(
        projectId,
        'POST',
        '/api/payments',
        { amount: 100, userId: 'user123', method: 'card' }
      );

      const fields = validationService.getSchemaFields(result.schema!);

      expect(fields.required).toContain('amount');
      expect(fields.required).toContain('userId');
      expect(fields.required).toContain('method');
      expect(fields.optional).toContain('currency');
      expect(fields.optional).toContain('description');
      expect(fields.all).toHaveLength(5);
    });

    it('should provide field types and defaults', () => {
      const result = validationService.validateRequestAgainstSchema(
        projectId,
        'POST',
        '/api/payments',
        { amount: 100, userId: 'user123', method: 'card' }
      );

      const fields = validationService.getSchemaFields(result.schema!);

      expect(fields.properties.amount.type).toBe('number');
      expect(fields.properties.userId.type).toBe('string');
      expect(fields.properties.currency.default).toBe('USD');
    });
  });

  describe('GET requests without body', () => {
    it('should PASS validation for GET request without body', () => {
      const result = validationService.validateRequestAgainstSchema(
        projectId,
        'GET',
        '/api/users/123',
        {}
      );

      expect(result.validation.isValid).toBe(true);
      expect(result.schema).toBeNull();
      expect(result.matchedPath).toBe('/api/users/{id}');
    });
  });
});
