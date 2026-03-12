import type { RepairAction, InvariFeedback, InvariChange } from '../types/proxy.types.js';
import { buildSchemaReference } from '../utils/json-path.utils.js';

export class FeedbackGeneratorService {
  /**
   * Generate structured feedback for LLM agents from repair actions
   */
  generateFeedback(
    repairs: RepairAction[],
    schema: any,
    method: string,
    path: string,
    confidence: number
  ): InvariFeedback {
    const changes: InvariChange[] = [];

    for (const repair of repairs) {
      const change = this.convertRepairActionToChange(repair, schema, method, path);
      if (change) {
        changes.push(change);
      }
    }

    // Generate overall message
    const message = this.generateSummaryMessage(changes);

    return {
      repaired: true,
      changes,
      confidence,
      message,
    };
  }

  /**
   * Convert a RepairAction to an InvariChange with natural language explanation
   */
  private convertRepairActionToChange(
    action: RepairAction,
    schema: any,
    method: string,
    path: string
  ): InvariChange | null {
    // Handle different repair action types
    if ('type' in action) {
      switch (action.type) {
        case 'field_rename':
          return {
            field: action.to,
            action: 'field_rename',
            original: action.from,
            fixed: action.to,
            reason: this.generateFieldRenameReason(action.from, action.to, action.confidence),
            spec_ref: buildSchemaReference(schema, method, path, action.to),
          };

        case 'type_coercion':
          return {
            field: action.field,
            action: 'type_coercion',
            original: action.originalValue,
            fixed: action.coercedValue,
            reason: this.generateTypeCoercionReason(
              action.field,
              action.fromType,
              action.toType,
              action.originalValue,
              action.coercedValue
            ),
            spec_ref: buildSchemaReference(schema, method, path, action.field),
          };

        case 'default_injection':
          return {
            field: action.field,
            action: 'default_injection',
            original: undefined,
            fixed: action.value,
            reason: this.generateDefaultInjectionReason(action.field, action.value, action.source),
            spec_ref: buildSchemaReference(schema, method, path, action.field),
          };

        case 'field_removed':
          return {
            field: action.field,
            action: 'field_removed',
            original: action.field,
            fixed: undefined,
            reason: this.generateFieldRemovedReason(action.field, action.reason),
            spec_ref: undefined, // No spec ref for removed fields
          };

        case 'repair_failed':
          // Don't include failed repairs in changes sent to LLM
          return null;

        default:
          return null;
      }
    }

    // Handle legacy format
    if ('action' in action) {
      return {
        field: action.field,
        action: action.action === 'renamed' ? 'field_rename' :
                action.action === 'type_coerced' ? 'type_coercion' : 'default_injection',
        original: action.originalValue,
        fixed: action.correctedValue,
        reason: action.reason,
        spec_ref: buildSchemaReference(schema, method, path, action.field),
      };
    }

    return null;
  }

  /**
   * Generate natural language reason for field rename
   */
  private generateFieldRenameReason(from: string, to: string, confidence: number): string {
    const confidencePercent = Math.round(confidence * 100);
    return `The field name '${from}' was corrected to '${to}' based on fuzzy matching with the API schema. This correction has ${confidencePercent}% confidence. Make sure to use '${to}' in future requests.`;
  }

  /**
   * Generate natural language reason for type coercion
   */
  private generateTypeCoercionReason(
    field: string,
    fromType: string,
    toType: string,
    originalValue: any,
    coercedValue: any
  ): string {
    const fromValueStr = JSON.stringify(originalValue);
    const toValueStr = JSON.stringify(coercedValue);

    return `The field '${field}' was automatically converted from ${fromType} (value: ${fromValueStr}) to ${toType} (value: ${toValueStr}) as required by the API schema. Always send '${field}' as ${toType} to avoid this conversion.`;
  }

  /**
   * Generate natural language reason for default injection
   */
  private generateDefaultInjectionReason(
    field: string,
    value: any,
    source: 'schema_default' | 'smart_inference'
  ): string {
    const valueStr = JSON.stringify(value);

    if (source === 'schema_default') {
      return `The field '${field}' was missing from your request and was automatically set to the default value ${valueStr} defined in the API schema. This field is optional, but including it explicitly is recommended.`;
    } else {
      return `The field '${field}' was missing from your request and was inferred to be ${valueStr}. This is a smart default, but you should verify if this is the correct value for your use case.`;
    }
  }

  /**
   * Generate natural language reason for field removal
   */
  private generateFieldRemovedReason(field: string, reason: string): string {
    return `The field '${field}' was removed from your request because it is not defined in the API schema. ${reason}. Avoid sending fields that are not part of the API specification.`;
  }

  /**
   * Generate a summary message based on all changes
   */
  private generateSummaryMessage(changes: InvariChange[]): string {
    if (changes.length === 0) {
      return 'Request was processed without modifications.';
    }

    const counts = {
      field_rename: 0,
      type_coercion: 0,
      default_injection: 0,
      field_removed: 0,
    };

    for (const change of changes) {
      counts[change.action]++;
    }

    const parts: string[] = [];

    if (counts.field_rename > 0) {
      parts.push(`${counts.field_rename} field name${counts.field_rename > 1 ? 's were' : ' was'} corrected`);
    }
    if (counts.type_coercion > 0) {
      parts.push(`${counts.type_coercion} type${counts.type_coercion > 1 ? 's were' : ' was'} converted`);
    }
    if (counts.default_injection > 0) {
      parts.push(`${counts.default_injection} default value${counts.default_injection > 1 ? 's were' : ' was'} added`);
    }
    if (counts.field_removed > 0) {
      parts.push(`${counts.field_removed} field${counts.field_removed > 1 ? 's were' : ' was'} removed`);
    }

    return `Your request was automatically repaired: ${parts.join(', ')}. Review the details below to improve future requests.`;
  }
}

export const feedbackGeneratorService = new FeedbackGeneratorService();
