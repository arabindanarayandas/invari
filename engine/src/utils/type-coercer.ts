/**
 * Coerce a value to match the expected JSON Schema type
 */
export function coerceType(value: any, expectedType: string, format?: string): any {
  if (value === null || value === undefined) {
    return value;
  }

  switch (expectedType.toLowerCase()) {
    case 'string':
      return coerceToString(value);

    case 'number':
    case 'integer':
      return coerceToNumber(value, expectedType === 'integer');

    case 'boolean':
      return coerceToBoolean(value);

    case 'array':
      return coerceToArray(value);

    case 'object':
      return coerceToObject(value);

    default:
      return value;
  }
}

/**
 * Coerce value to string
 */
function coerceToString(value: any): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Coerce value to number
 */
function coerceToNumber(value: any, isInteger: boolean = false): number | null {
  if (typeof value === 'number') {
    return isInteger ? Math.floor(value) : value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Remove common currency symbols
    const cleaned = trimmed.replace(/[$£€¥,]/g, '');

    const parsed = isInteger ? parseInt(cleaned, 10) : parseFloat(cleaned);

    if (!isNaN(parsed)) {
      return parsed;
    }
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  return null;
}

/**
 * Coerce value to boolean
 */
function coerceToBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on') return true;
    if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'off') return false;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return Boolean(value);
}

/**
 * Coerce value to array
 */
function coerceToArray(value: any): any[] {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // If it's a comma-separated string, split it
      return value.split(',').map(v => v.trim());
    }
  }

  // Wrap single value in array
  return [value];
}

/**
 * Coerce value to object
 */
function coerceToObject(value: any): object {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Invalid JSON
    }
  }

  // Return as-is wrapped in object
  return { value };
}

/**
 * Recursively coerce all values in an object to match schema types
 */
export function coerceObjectTypes(
  obj: Record<string, any>,
  schema: Record<string, { type: string; format?: string }>
): Record<string, any> {
  const coerced: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (schema[key]) {
      const { type, format } = schema[key];
      coerced[key] = coerceType(value, type, format);
    } else {
      coerced[key] = value;
    }
  }

  return coerced;
}

/**
 * Check if two types are compatible (can be coerced)
 */
export function areTypesCompatible(actualType: string, expectedType: string): boolean {
  const compatibilityMap: Record<string, string[]> = {
    'string': ['string', 'number', 'integer', 'boolean'],
    'number': ['number', 'integer', 'string', 'boolean'],
    'integer': ['integer', 'number', 'string', 'boolean'],
    'boolean': ['boolean', 'string', 'number', 'integer'],
    'array': ['array', 'string'],
    'object': ['object', 'string'],
  };

  const compatible = compatibilityMap[expectedType.toLowerCase()] || [];
  return compatible.includes(actualType.toLowerCase());
}

/**
 * Get the actual type of a JavaScript value
 */
export function getActualType(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number';
  }
  return typeof value;
}
