// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import { RepairService } from '../repair.service.js';

describe('RepairService', () => {
  let repairService: RepairService;

  const sampleSchema = {
    type: 'object',
    required: ['amount', 'userId', 'method'],
    properties: {
      amount: { type: 'number' },
      userId: { type: 'string' },
      method: { type: 'string', enum: ['card', 'bank', 'wallet'] },
      currency: { type: 'string', default: 'USD' },
      isActive: { type: 'boolean' },
    },
  };

  const sampleSchemaFields = {
    required: ['amount', 'userId', 'method'],
    optional: ['currency', 'isActive'],
    all: ['amount', 'userId', 'method', 'currency', 'isActive'],
    properties: {
      amount: { type: 'number' },
      userId: { type: 'string' },
      method: { type: 'string' },
      currency: { type: 'string', default: 'USD' },
      isActive: { type: 'boolean' },
    },
  };

  beforeEach(() => {
    repairService = new RepairService();
  });

  describe('Data Type Repairs - Allowed Repairs', () => {
    it('should coerce string "123" to number 123', () => {
      const body = {
        amount: '123', // String to number
        userId: 'user123',
        method: 'card',
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.success).toBe(true);
      expect(result.repairedBody.amount).toBe(123);
      expect(typeof result.repairedBody.amount).toBe('number');
      expect(result.actions.some((a) => a.type === 'type_coercion')).toBe(true);
    });

    it('should coerce string "true" to boolean true', () => {
      const body = {
        amount: 100,
        userId: 'user123',
        method: 'card',
        isActive: 'true', // String to boolean
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.success).toBe(true);
      expect(result.repairedBody.isActive).toBe(true);
      expect(typeof result.repairedBody.isActive).toBe('boolean');
    });

    it('should coerce string "false" to boolean false', () => {
      const body = {
        amount: 100,
        userId: 'user123',
        method: 'card',
        isActive: 'false',
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.repairedBody.isActive).toBe(false);
    });

    it('should coerce number 1 to boolean true', () => {
      const body = {
        amount: 100,
        userId: 'user123',
        method: 'card',
        isActive: 1, // Number to boolean
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.repairedBody.isActive).toBe(true);
    });

    it('should coerce number 0 to boolean false', () => {
      const body = {
        amount: 100,
        userId: 'user123',
        method: 'card',
        isActive: 0,
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.repairedBody.isActive).toBe(false);
    });

    it('should coerce boolean to string', () => {
      const body = {
        amount: 100,
        userId: true, // Boolean to string
        method: 'card',
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.repairedBody.userId).toBe('true');
      expect(typeof result.repairedBody.userId).toBe('string');
    });

    it('should coerce number to string', () => {
      const body = {
        amount: 100,
        userId: 12345, // Number to string
        method: 'card',
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.repairedBody.userId).toBe('12345');
    });

    it('should handle currency symbols ($100 → 100)', () => {
      const body = {
        amount: '$100', // String with currency symbol
        userId: 'user123',
        method: 'card',
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.repairedBody.amount).toBe(100);
    });

    it('should handle comma separators (1,000 → 1000)', () => {
      const body = {
        amount: '1,000', // String with commas
        userId: 'user123',
        method: 'card',
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.repairedBody.amount).toBe(1000);
    });
  });

  describe('Field Name Repairs - Allowed Repairs', () => {
    it('should rename usr_id to userId', () => {
      const body = {
        amount: 100,
        usr_id: 'user123', // Wrong field name
        method: 'card',
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.repairedBody.userId).toBe('user123');
      expect(result.repairedBody.usr_id).toBeUndefined();
      expect(result.actions.some((a) => a.type === 'field_rename')).toBe(true);
    });

    it('should rename snake_case to camelCase', () => {
      const body = {
        amount: 100,
        user_id: 'user123', // snake_case
        method: 'card',
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.repairedBody.userId).toBe('user123');
    });

    it('should expand abbreviation amt to amount', () => {
      const body = {
        amt: 100, // Abbreviated field name
        userId: 'user123',
        method: 'card',
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.repairedBody.amount).toBe(100);
      expect(result.actions.some((a) => a.type === 'field_rename')).toBe(true);
    });

    it('should fix typos using Levenshtein distance', () => {
      const body = {
        ammount: 100, // Typo: ammount → amount
        userId: 'user123',
        method: 'card',
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.repairedBody.amount).toBe(100);
    });

    it('should have high confidence (>0.5) for field renames', () => {
      const body = {
        user_id: 'user123', // High confidence match
        amount: 100,
        method: 'card',
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      const renameAction = result.actions.find((a) => a.type === 'field_rename');
      expect(renameAction).toBeDefined();
      expect(renameAction!.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Combined Type and Field Name Repairs', () => {
    it('should handle both field rename and type coercion', () => {
      const body = {
        amt: '100', // Wrong name + wrong type
        userId: 'user123',
        method: 'card',
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.success).toBe(true);
      expect(result.repairedBody.amount).toBe(100);
      expect(typeof result.repairedBody.amount).toBe('number');
      expect(result.actions.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle multiple field renames and coercions', () => {
      const body = {
        amt: '100',
        usr_id: 12345,
        method: 'card',
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.success).toBe(true);
      expect(result.repairedBody.amount).toBe(100);
      expect(result.repairedBody.userId).toBe('12345');
    });
  });

  describe('Default Value Injection', () => {
    it('should inject schema default for optional field', () => {
      const body = {
        amount: 100,
        userId: 'user123',
        method: 'card',
        // currency missing, but has default
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.repairedBody.currency).toBe('USD');
      expect(result.actions.some((a) => a.type === 'default_injection')).toBe(true);
    });

    it('should use schema default over smart inference', () => {
      const schemaWithDefault = {
        ...sampleSchemaFields,
        properties: {
          ...sampleSchemaFields.properties,
          currency: { type: 'string', default: 'EUR' }, // Different default
        },
      };

      const body = {
        amount: 100,
        userId: 'user123',
        method: 'card',
      };

      const result = repairService.repairRequestBody(body, sampleSchema, schemaWithDefault);

      expect(result.repairedBody.currency).toBe('EUR');
    });
  });

  describe('Extra Field Removal', () => {
    it('should remove fields not in schema', () => {
      const body = {
        amount: 100,
        userId: 'user123',
        method: 'card',
        extraField: 'should be removed',
        anotherExtra: 123,
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.repairedBody.extraField).toBeUndefined();
      expect(result.repairedBody.anotherExtra).toBeUndefined();
      expect(result.actions.some((a) => a.type === 'field_removed')).toBe(true);
    });
  });

  describe('Repair Limitations - What CANNOT Be Repaired', () => {
    it('should FAIL when required field completely missing (no default)', () => {
      const body = {
        userId: 'user123',
        method: 'card',
        // amount is missing and has no default
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.success).toBe(false);
      expect(result.actions.some((a) => a.type === 'repair_failed')).toBe(true);
    });

    it('should FAIL when multiple required fields are missing', () => {
      const body = {
        method: 'card',
        // amount and userId both missing
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.success).toBe(false);
      const failedActions = result.actions.filter((a) => a.type === 'repair_failed');
      expect(failedActions.length).toBeGreaterThanOrEqual(2);
    });

    it('should NOT add missing optional fields without defaults', () => {
      const body = {
        amount: 100,
        userId: 'user123',
        method: 'card',
        // isActive is optional and has no default
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.repairedBody.isActive).toBeUndefined();
    });

    it('should FAIL when data type cannot be coerced', () => {
      const body = {
        amount: 'invalid-number', // Cannot coerce to number
        userId: 'user123',
        method: 'card',
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.success).toBe(false);
    });

    it('should NOT repair field with very low confidence (<0.5)', () => {
      const body = {
        amount: 100,
        xyz: 'user123', // Very different from userId
        method: 'card',
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      // Should not match xyz to userId (confidence too low)
      expect(result.success).toBe(false);
    });
  });

  describe('Repair Confidence Calculation', () => {
    it('should calculate high confidence for type coercion', () => {
      const actions = [
        {
          type: 'type_coercion' as const,
          field: 'amount',
          fromType: 'string',
          toType: 'number',
          originalValue: '100',
          coercedValue: 100,
        },
      ];

      const confidence = repairService.calculateRepairConfidence(actions);
      expect(confidence).toBeGreaterThan(0.8);
    });

    it('should calculate very high confidence for schema defaults', () => {
      const actions = [
        {
          type: 'default_injection' as const,
          field: 'currency',
          value: 'USD',
          source: 'schema_default' as const,
        },
      ];

      const confidence = repairService.calculateRepairConfidence(actions);
      expect(confidence).toBe(1.0);
    });

    it('should calculate lower confidence for smart inference', () => {
      const actions = [
        {
          type: 'default_injection' as const,
          field: 'currency',
          value: 'USD',
          source: 'smart_inference' as const,
        },
      ];

      const confidence = repairService.calculateRepairConfidence(actions);
      expect(confidence).toBeLessThan(1.0);
    });

    it('should return 0 confidence for failed repairs', () => {
      const actions = [
        {
          type: 'repair_failed' as const,
          field: 'amount',
          reason: 'Missing required field',
        },
      ];

      const confidence = repairService.calculateRepairConfidence(actions);
      expect(confidence).toBe(0);
    });

    it('should average confidence across multiple actions', () => {
      const actions = [
        {
          type: 'type_coercion' as const,
          field: 'amount',
          fromType: 'string',
          toType: 'number',
          originalValue: '100',
          coercedValue: 100,
        },
        {
          type: 'field_rename' as const,
          from: 'user_id',
          to: 'userId',
          confidence: 0.95,
        },
      ];

      const confidence = repairService.calculateRepairConfidence(actions);
      expect(confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty object', () => {
      const body = {};

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.success).toBe(false);
      expect(result.repairedBody).toBeDefined();
    });

    it('should handle null values', () => {
      const body = {
        amount: null,
        userId: 'user123',
        method: 'card',
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      // Null should remain null (not coerced)
      expect(result.repairedBody.amount).toBeNull();
    });

    it('should preserve correct values unchanged', () => {
      const body = {
        amount: 100,
        userId: 'user123',
        method: 'card',
      };

      const result = repairService.repairRequestBody(body, sampleSchema, sampleSchemaFields);

      expect(result.success).toBe(true);
      expect(result.repairedBody.amount).toBe(100);
      expect(result.repairedBody.userId).toBe('user123');
      expect(result.repairedBody.method).toBe('card');
    });
  });
});
