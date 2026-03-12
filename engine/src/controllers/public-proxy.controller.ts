import type { Request, Response } from 'express';
import { publicProxyService } from '../services/public-proxy.service.js';

export class PublicProxyController {
  /**
   * POST /api/public/validate-spec
   * Parse an OpenAPI spec and return its endpoints list.
   * No auth required.
   */
  async validateSpec(req: Request, res: Response) {
    try {
      const { spec } = req.body;
      if (!spec || typeof spec !== 'object') {
        return res.status(400).json({ success: false, error: 'spec must be a JSON object' });
      }

      const endpoints = await publicProxyService.parseSpec(spec);
      return res.json({ success: true, data: { endpoints, endpointCount: endpoints.length } });
    } catch (error) {
      console.error('Public validate-spec error:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid OpenAPI specification',
      });
    }
  }

  /**
   * POST /api/public/proxy
   * Validate, repair, and forward a request — no DB writes.
   * No auth required.
   */
  async proxyRequest(req: Request, res: Response) {
    try {
      const { spec, baseUrl, method, path, requestBody } = req.body;

      if (!spec || typeof spec !== 'object') {
        return res.status(400).json({ success: false, error: 'spec is required and must be a JSON object' });
      }
      if (!baseUrl || typeof baseUrl !== 'string') {
        return res.status(400).json({ success: false, error: 'baseUrl is required' });
      }
      if (!method || !path) {
        return res.status(400).json({ success: false, error: 'method and path are required' });
      }

      const result = await publicProxyService.processRequest(
        spec,
        baseUrl,
        method.toUpperCase(),
        path,
        requestBody ?? null,
        {}
      );

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('Public proxy error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Proxy request failed',
      });
    }
  }
}

export const publicProxyController = new PublicProxyController();
