import { matchFieldName, findAllFieldMatches } from '../utils/fuzzy-matcher.js';
import { coerceType, coerceObjectTypes, getActualType } from '../utils/type-coercer.js';
import { repairFormat, isSupportedFormat } from '../utils/format-repair.utils.js';
import type { RepairAction, RepairResult } from '../types/proxy.types.js';

export class RepairService {
  /**
   * Attempt to repair request body based on schema and validation errors
   */
  repairRequestBody(
    originalBody: Record<string, any>,
    schema: any,
    schemaFields: {
      required: string[];
      optional: string[];
      all: string[];
      properties: Record<string, { type: string; format?: string; default?: any }>;
    }
  ): RepairResult {
    console.log(' ============ RepairService repairRequestBody ============ ')
    const repairedBody: Record<string, any> = {};
    const actions: RepairAction[] = [];
    let repairSuccessful = true;

    // Step 1: Fuzzy match fields from original body to schema fields
    const originalFields = Object.keys(originalBody);
    console.log('originalFields ::', originalFields)
    console.log('schemaFields.all ::', schemaFields.all)
    const fieldMatches = findAllFieldMatches(originalFields, schemaFields.all);
    console.log('fieldMatches ::', fieldMatches)
    // Confidence threshold for field matching (reject low-confidence matches)
    const CONFIDENCE_THRESHOLD = 0.8;

    // Map matched fields and apply type coercion
    for (const [originalField, matchInfo] of fieldMatches.entries()) {
      // Reject low-confidence matches
      if (matchInfo.confidence < CONFIDENCE_THRESHOLD) {
        // Skip this field - will be treated as unmatched
        continue;
      }

      const matchedField = matchInfo.match;
      const originalValue = originalBody[originalField];
      const expectedType = schemaFields.properties[matchedField].type;

      // Check if field name was corrected
      if (originalField !== matchedField) {
        actions.push({
          type: 'field_rename',
          from: originalField,
          to: matchedField,
          confidence: matchInfo.confidence,
        });
      }

      // Attempt type coercion
      const actualType = getActualType(originalValue);
      const fieldFormat = schemaFields.properties[matchedField].format;
      console.log('actualType ::', actualType)
      console.log('expectedType ::', expectedType)

      let resolvedValue = originalValue;

      if (actualType !== expectedType) {
        const coercedValue = coerceType(originalValue, expectedType, fieldFormat);

        if (coercedValue !== null && coercedValue !== undefined) {
          resolvedValue = coercedValue;
          actions.push({
            type: 'type_coercion',
            field: matchedField,
            fromType: actualType,
            toType: expectedType,
            originalValue,
            coercedValue,
          });
        } else {
          // Coercion failed
          repairSuccessful = false;
        }
      }

      // After type coercion — attempt format repair for date/date-time/time
      if (
        typeof resolvedValue === 'string' &&
        fieldFormat &&
        isSupportedFormat(fieldFormat)
      ) {
        const formatResult = repairFormat(resolvedValue, fieldFormat);
        if (formatResult && formatResult.repaired) {
          console.log(`Format repair [${fieldFormat}]: "${resolvedValue}" → "${formatResult.value}"`);
          actions.push({
            type: 'type_coercion',
            field: matchedField,
            fromType: `string (invalid ${fieldFormat})`,
            toType: `string (${fieldFormat})`,
            originalValue: resolvedValue,
            coercedValue: formatResult.value,
          });
          resolvedValue = formatResult.value;
        } else if (!formatResult) {
          // Format is supported but value could not be parsed — repair fails
          console.log(`Format repair failed [${fieldFormat}]: "${resolvedValue}" is unparseable`);
          repairSuccessful = false;
        }
      }

      repairedBody[matchedField] = resolvedValue;
    }

    // Handle unmatched fields from original body
    const unmatchedOriginalFields = originalFields.filter(f => !fieldMatches.has(f));
    for (const unmatchedField of unmatchedOriginalFields) {
      // Check if it's an extra field not in schema
      if (!schemaFields.all.includes(unmatchedField)) {
        actions.push({
          type: 'field_removed',
          field: unmatchedField,
          reason: 'Not present in schema',
        });
      }
    }

    // Step 2: Inject default values for missing required fields
    const missingRequired = schemaFields.required.filter(
      field => !(field in repairedBody)
    );

    for (const missingField of missingRequired) {
      const fieldInfo = schemaFields.properties[missingField];

      if (fieldInfo.default !== undefined) {
        // Schema has a default value - OK to inject
        repairedBody[missingField] = fieldInfo.default;
        actions.push({
          type: 'default_injection',
          field: missingField,
          value: fieldInfo.default,
          source: 'schema_default',
        });
      } else {
        // Required field missing with no default - CANNOT REPAIR
        // According to requirements: required fields without defaults should FAIL
        repairSuccessful = false;
        actions.push({
          type: 'repair_failed',
          field: missingField,
          reason: 'Missing required field with no default value',
        });
      }
    }

    // Step 3: Add optional fields with defaults if available
    const missingOptional = schemaFields.optional.filter(
      field => !(field in repairedBody)
    );

    for (const optionalField of missingOptional) {
      const fieldInfo = schemaFields.properties[optionalField];
      if (fieldInfo.default !== undefined) {
        repairedBody[optionalField] = fieldInfo.default;
        actions.push({
          type: 'default_injection',
          field: optionalField,
          value: fieldInfo.default,
          source: 'schema_default',
        });
      }
    }
    console.log('repairSuccessful', repairSuccessful)
    console.log('repairedBody', repairedBody)
    console.log('actions', actions)
    return {
      success: repairSuccessful,
      repairedBody,
      repairs: actions,
    };
  }

  /**
   * Infer smart default values based on field name and type
   */
  private inferSmartDefault(fieldName: string, type: string): any {
    const lowerName = fieldName.toLowerCase();

    // Currency defaults
    if (lowerName.includes('currency') || lowerName === 'curr') {
      return 'USD';
    }

    // Country defaults
    if (lowerName.includes('country')) {
      return 'US';
    }

    // Language defaults
    if (lowerName.includes('language') || lowerName.includes('locale')) {
      return 'en';
    }

    // Status defaults
    if (lowerName.includes('status')) {
      return 'active';
    }

    // Quantity/count defaults
    if (lowerName.includes('quantity') || lowerName.includes('qty') || lowerName.includes('count')) {
      return 1;
    }

    // Type-based defaults
    switch (type.toLowerCase()) {
      case 'string':
        return '';
      case 'number':
      case 'integer':
        return 0;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return null;
    }
  }

  /**
   * Calculate repair confidence score
   */
  calculateRepairConfidence(actions: RepairAction[]): number {
    if (actions.length === 0) return 1.0;

    let totalConfidence = 0;
    let weightedActions = 0;

    for (const action of actions) {
      if ('type' in action) {
        switch (action.type) {
          case 'field_rename':
            // Use the fuzzy match confidence
            totalConfidence += action.confidence;
            weightedActions += 1;
            break;

          case 'type_coercion':
            // Type coercion is generally high confidence
            totalConfidence += 0.9;
            weightedActions += 1;
            break;

          case 'default_injection':
            if (action.source === 'schema_default') {
              // Schema defaults are very reliable
              totalConfidence += 1.0;
            } else {
              // Smart inference is less reliable
              totalConfidence += 0.7;
            }
            weightedActions += 1;
            break;

          case 'repair_failed':
            // Failed repair lowers confidence significantly
            totalConfidence += 0;
            weightedActions += 1;
            break;

          case 'field_removed':
            // Removing extra fields is neutral
            totalConfidence += 0.8;
            weightedActions += 0.5; // Lower weight
            break;
        }
      }
    }

    return weightedActions > 0 ? totalConfidence / weightedActions : 0;
  }
}

export const repairService = new RepairService();
