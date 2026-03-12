// Use empty string for same-origin requests (production)
// API is served on the same origin as the web-console
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL !== undefined
  ? import.meta.env.VITE_API_BASE_URL
  : '';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.token = localStorage.getItem('fluxguard_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('fluxguard_token', token);
    } else {
      localStorage.removeItem('fluxguard_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('fluxguard_token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  async register(email, password) {
    const response = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }
    return response;
  }

  async login(email, password) {
    const response = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }
    return response;
  }

  async getCurrentUser() {
    return await this.request('/api/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // Agent endpoints
  async getAgents() {
    return await this.request('/api/agents');
  }

  async getAgent(agentId) {
    return await this.request(`/api/agents/${agentId}`);
  }

  async createAgent(name, targetBaseUrl = null, openApiSpec = null, schemaSourceUrl = null, schemaSyncInterval = null) {
    return await this.request('/api/agents', {
      method: 'POST',
      body: JSON.stringify({
        name,
        targetBaseUrl,
        openApiSpec,
        schemaSourceUrl,
        schemaSyncInterval
      }),
    });
  }

  async updateAgent(agentId, data) {
    return await this.request(`/api/agents/${agentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAgent(agentId) {
    return await this.request(`/api/agents/${agentId}`, {
      method: 'DELETE',
    });
  }

  async uploadSchema(agentId, schemaSpec, version) {
    return await this.request(`/api/agents/${agentId}/schema`, {
      method: 'POST',
      body: JSON.stringify({ schemaSpec, version }),
    });
  }

  async getSchemas(agentId) {
    return await this.request(`/api/agents/${agentId}/schemas`);
  }

  async activateSchema(agentId, schemaId) {
    return await this.request(`/api/agents/${agentId}/schemas/${schemaId}/activate`, {
      method: 'PUT',
    });
  }

  async regenerateApiKey(agentId) {
    return await this.request(`/api/agents/${agentId}/regenerate-key`, {
      method: 'POST',
    });
  }

  async getAgentStats(agentId, days = 7) {
    return await this.request(`/api/agents/${agentId}/stats?days=${days}`);
  }

  async getAgentLogs(agentId, page = 1, limit = 50, filters = {}, sorting = {}) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    // Add filters
    if (filters.status) params.append('status', filters.status);
    if (filters.httpMethod) params.append('httpMethod', filters.httpMethod);
    if (filters.endpointSearch) params.append('endpointSearch', filters.endpointSearch);
    if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
    if (filters.endDate) params.append('endDate', filters.endDate.toISOString());

    // Add sorting
    if (sorting.sortBy) params.append('sortBy', sorting.sortBy);
    if (sorting.sortOrder) params.append('sortOrder', sorting.sortOrder);

    return await this.request(`/api/agents/${agentId}/logs?${params}`);
  }

  async getSchemaSyncLogs(agentId, limit = 50, offset = 0) {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    return await this.request(`/api/agents/${agentId}/schema-sync-logs?${params}`);
  }

  // Schema endpoints
  async getSchemaEndpoints(agentId, schemaId) {
    return await this.request(`/api/agents/${agentId}/schemas/${schemaId}/endpoints`);
  }

  async compareSchemas(agentId, fromSchemaId, toSchemaId) {
    const params = new URLSearchParams({
      fromSchemaId,
      toSchemaId,
    });

    return await this.request(`/api/agents/${agentId}/schemas/compare?${params}`);
  }

  async triggerManualSync(agentId) {
    return await this.request(`/api/agents/${agentId}/sync`, {
      method: 'POST',
    });
  }

  // Validation endpoints
  async validateOpenApiSpec(specContent) {
    return await this.request('/api/agents/validate/openapi-spec', {
      method: 'POST',
      body: JSON.stringify({ specContent }),
    });
  }

  async validateOpenApiUrl(sourceUrl) {
    return await this.request('/api/agents/validate/openapi-spec', {
      method: 'POST',
      body: JSON.stringify({ sourceUrl }),
    });
  }

  // Analytics endpoints
  async getAnalyticsTimeline(agentId, days = 30, period = 'daily') {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return await this.request(`/api/agents/${agentId}/analytics/timeline?days=${days}&period=${period}&timezone=${encodeURIComponent(timezone)}`);
  }

  async getAnalyticsStatus(agentId, days = 30) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return await this.request(`/api/agents/${agentId}/analytics/status?days=${days}&timezone=${encodeURIComponent(timezone)}`);
  }

  async getAnalyticsHourly(agentId) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return await this.request(`/api/agents/${agentId}/analytics/hourly?timezone=${encodeURIComponent(timezone)}`);
  }

  // Global dashboard endpoints
  async getGlobalDashboardStats() {
    return await this.request('/api/dashboard/stats');
  }

  async getGlobalDashboardTimeline(period = 'hourly', days = 30) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return await this.request(`/api/dashboard/timeline?period=${period}&days=${days}&timezone=${encodeURIComponent(timezone)}`);
  }
}

export const apiClient = new ApiClient();
export default apiClient;
