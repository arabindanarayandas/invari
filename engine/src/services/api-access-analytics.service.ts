import { db } from '../db/index.js';
import { apiAccessLogs } from '../db/schema.js';

interface LogApiAccessParams {
  userId?: string | null;
  httpMethod: string;
  endpointPath: string;
  ipAddress: string;
  responseStatus: number;
  latencyMs?: number;
  userAgent?: string;
}

export class ApiAccessAnalyticsService {
  /**
   * Categorize the endpoint into an action type for easier analytics
   */
  private categorizeAction(method: string, path: string): string {
    const normalizedPath = path.toLowerCase();

    // Auth actions
    if (normalizedPath.includes('/auth/register')) return 'register';
    if (normalizedPath.includes('/auth/login')) return 'login';
    if (normalizedPath.includes('/auth/logout')) return 'logout';
    if (normalizedPath.includes('/auth/me')) return 'get_current_user';

    // Agent actions
    if (method === 'POST' && normalizedPath.match(/\/api\/agents\/?$/)) return 'create_agent';
    if (method === 'GET' && normalizedPath.match(/\/api\/agents\/?$/)) return 'list_agents';
    if (method === 'GET' && normalizedPath.match(/\/api\/agents\/[^/]+$/)) return 'get_agent';
    if (method === 'PATCH' && normalizedPath.match(/\/api\/agents\/[^/]+$/)) return 'update_agent';
    if (method === 'DELETE' && normalizedPath.match(/\/api\/agents\/[^/]+$/)) return 'delete_agent';

    // Schema actions
    if (normalizedPath.includes('/schema') && method === 'POST') return 'upload_schema';
    if (normalizedPath.includes('/schemas') && method === 'GET') return 'list_schemas';
    if (normalizedPath.includes('/schemas') && normalizedPath.includes('/activate')) return 'activate_schema';

    // API key actions
    if (normalizedPath.includes('/regenerate-key')) return 'regenerate_api_key';

    // Proxy requests
    if (normalizedPath.startsWith('/proxy/')) return 'proxy_request';

    // Fake server (testing)
    if (normalizedPath.includes('/fake-server/')) return 'fake_server_request';

    // Default fallback
    return 'api_access';
  }

  /**
   * Log an API access event asynchronously
   */
  async logApiAccess(params: LogApiAccessParams): Promise<void> {
    try {
      const actionType = this.categorizeAction(params.httpMethod, params.endpointPath);

      await db.insert(apiAccessLogs).values({
        userId: params.userId || null,
        httpMethod: params.httpMethod,
        endpointPath: params.endpointPath,
        actionType,
        ipAddress: params.ipAddress,
        responseStatus: params.responseStatus,
        latencyMs: params.latencyMs,
        userAgent: params.userAgent,
      });
    } catch (error) {
      // Log error but don't throw - we don't want analytics failures to break the API
      console.error('Failed to log API access:', error);
    }
  }
}

export const apiAccessAnalyticsService = new ApiAccessAnalyticsService();
