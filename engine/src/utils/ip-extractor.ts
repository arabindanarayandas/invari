import { Request } from 'express';

/**
 * Extract the real client IP address from an Express request
 * Handles various proxy headers and fallback to socket IP
 */
export function extractClientIp(req: Request): string {
  // Check X-Forwarded-For header (most common for proxies/load balancers)
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2, ...)
    // The first IP is the original client
    const ips = (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor).split(',');
    const clientIp = ips[0].trim();
    if (clientIp) {
      return clientIp;
    }
  }

  // Check X-Real-IP header (used by some proxies like nginx)
  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp && typeof xRealIp === 'string') {
    return xRealIp.trim();
  }

  // Check CF-Connecting-IP (Cloudflare)
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (cfConnectingIp && typeof cfConnectingIp === 'string') {
    return cfConnectingIp.trim();
  }

  // Fallback to Express req.ip (uses socket address)
  if (req.ip) {
    return req.ip;
  }

  // Fallback to socket remote address
  if (req.socket?.remoteAddress) {
    return req.socket.remoteAddress;
  }

  // Unknown IP (should rarely happen)
  return 'unknown';
}
