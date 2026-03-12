/**
 * JSON Path Utilities
 * Helper functions for working with JSON paths and JSON Pointers (RFC 6901)
 */

/**
 * Set a value in an object using dot notation path
 * @example setValueByPath({}, 'user.name', 'John') => { user: { name: 'John' } }
 */
export function setValueByPath(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * Get a value from an object using dot notation path
 * @example getValueByPath({ user: { name: 'John' } }, 'user.name') => 'John'
 */
export function getValueByPath(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

/**
 * Encode a string for use in a JSON Pointer (RFC 6901)
 * ~ is encoded as ~0
 * / is encoded as ~1
 */
function encodeJsonPointerToken(token: string): string {
  return token.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
 * Build a JSON Pointer reference to a field in the OpenAPI schema
 * @param schema - The full OpenAPI schema object
 * @param method - HTTP method (e.g., 'post', 'get')
 * @param path - API path (e.g., '/api/users')
 * @param field - Field name in the request body
 * @returns JSON Pointer string (e.g., "#/paths/~1api~1users/post/requestBody/content/application~1json/schema/properties/username")
 */
export function buildSchemaReference(
  schema: any,
  method: string,
  path: string,
  field: string
): string {
  // Encode the path for JSON Pointer
  const encodedPath = encodeJsonPointerToken(path);
  const encodedContentType = encodeJsonPointerToken('application/json');

  // Build the JSON Pointer
  const pointer = [
    '#',
    'paths',
    encodedPath,
    method.toLowerCase(),
    'requestBody',
    'content',
    encodedContentType,
    'schema',
    'properties',
    field
  ].join('/');

  return pointer;
}

/**
 * Get a value from an object using a JSON Pointer (RFC 6901)
 * @param obj - The object to query
 * @param pointer - JSON Pointer string (e.g., "/user/name" or "#/user/name")
 */
export function getByJsonPointer(obj: any, pointer: string): any {
  // Remove leading # if present
  let path = pointer.startsWith('#') ? pointer.slice(1) : pointer;

  // Empty pointer references the whole document
  if (path === '' || path === '/') {
    return obj;
  }

  // Remove leading /
  if (path.startsWith('/')) {
    path = path.slice(1);
  }

  // Split and decode tokens
  const tokens = path.split('/').map(token => {
    // Decode ~1 to / and ~0 to ~
    return token.replace(/~1/g, '/').replace(/~0/g, '~');
  });

  let current = obj;
  for (const token of tokens) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[token];
  }

  return current;
}
