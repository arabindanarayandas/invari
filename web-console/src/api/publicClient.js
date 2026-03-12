// Use empty string for same-origin requests (production)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL !== undefined
  ? import.meta.env.VITE_API_BASE_URL
  : '';

/**
 * Public API client — no authentication headers.
 * Used exclusively for the unauthenticated demo/playground.
 */

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

/**
 * Parse an OpenAPI spec and return the list of endpoints.
 * @param {object} spec - OpenAPI spec as a parsed JSON object
 */
export async function validateSpec(spec) {
  return request('/api/public/validate-spec', {
    method: 'POST',
    body: JSON.stringify({ spec }),
  });
}

/**
 * Send a request through the public proxy (validate + repair + forward).
 * @param {object} spec - OpenAPI spec JSON
 * @param {string} baseUrl - Target base URL
 * @param {string} method - HTTP method
 * @param {string} path - Endpoint path
 * @param {any} requestBody - Request body
 */
export async function proxyRequest(spec, baseUrl, method, path, requestBody) {
  return request('/api/public/proxy', {
    method: 'POST',
    body: JSON.stringify({ spec, baseUrl, method, path, requestBody }),
  });
}
