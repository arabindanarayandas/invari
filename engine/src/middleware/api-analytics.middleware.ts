import { Request, Response, NextFunction } from 'express';
import { extractClientIp } from '../utils/ip-extractor.js';
import { apiAccessAnalyticsService } from '../services/api-access-analytics.service.js';

/**
 * Endpoints to exclude from analytics tracking (polling endpoints)
 */
const EXCLUDED_PATHS = [
  '/health',
  '/api/agents/:id/stats',
  '/api/agents/:id/logs',
  '/api/agents/:id/analytics/timeline',
  '/api/agents/:id/analytics/status',
  '/api/agents/:id/analytics/hourly',
];

/**
 * Check if a path should be excluded from tracking
 */
function shouldExcludePath(path: string): boolean {
  // Exact match for simple paths
  if (EXCLUDED_PATHS.includes(path)) {
    return true;
  }

  // Pattern matching for dynamic paths
  if (path.includes('/stats') || path.includes('/logs') || path.includes('/analytics/')) {
    return true;
  }

  return false;
}

/**
 * Middleware to track API access with IP addresses
 * Logs are written asynchronously after the response is sent
 */
export function apiAnalyticsMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip excluded endpoints
  if (shouldExcludePath(req.path)) {
    return next();
  }

  const startTime = Date.now();
  const ipAddress = extractClientIp(req);
  const userAgent = req.headers['user-agent'];
  const httpMethod = req.method;
  const endpointPath = req.path;

  // Track after response is finished (non-blocking)
  res.on('finish', () => {
    const latencyMs = Date.now() - startTime;
    const responseStatus = res.statusCode;
    const userId = (req as any).userId; // Set by authMiddleware if authenticated

    // Log asynchronously - don't await to avoid blocking
    apiAccessAnalyticsService.logApiAccess({
      userId: userId || null,
      httpMethod,
      endpointPath,
      ipAddress,
      responseStatus,
      latencyMs,
      userAgent,
    }).catch((error) => {
      // Silently handle errors to avoid disrupting the request flow
      console.error('Analytics logging error:', error);
    });
  });

  next();
}
