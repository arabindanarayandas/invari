import { Request, Response } from 'express';
import { proxyService } from '../services/proxy.service.js';

export class ProxyController {
  /**
   * ALL /proxy/*
   * Main proxy endpoint that handles all methods and paths
   */
  async handleRequest(req: Request, res: Response) {
    try {
      console.log('\n========== PROXY REQUEST RECEIVED ==========');
      console.log('Full URL:', req.url);
      console.log('Method:', req.method);

      // Extract agent UUID from path parameter
      const agentId = req.params.agentId;
      console.log('Agent ID from path:', agentId);

      if (!agentId) {
        console.log('❌ Missing agent ID in URL');
        return res.status(400).json({
          success: false,
          error: 'Missing agent ID in URL',
        });
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(agentId)) {
        console.log('❌ Invalid UUID format:', agentId);
        return res.status(400).json({
          success: false,
          error: 'Invalid agent ID format',
        });
      }
      console.log('✓ Valid UUID format');

      // Extract Invari API Key for authentication
      const invariApiKey = req.headers['x-invari-key'] as string | undefined;
      console.log('X-Invari-Key present:', !!invariApiKey);

      if (!invariApiKey) {
        console.log('❌ Missing X-Invari-Key header');
        return res.status(401).json({
          success: false,
          error: 'Missing X-Invari-Key header',
        });
      }

      // Extract agent identifier (optional)
      const agentIdentifier = req.headers['x-invari-agent-id'] as string | undefined;
      console.log('Agent Identifier:', agentIdentifier || 'none');

      // Get the path after /proxy/{agentId}
      // req.path will be /proxy/{agentId}/api/foo, we want /api/foo
      const fullPath = req.path;
      const pathAfterAgentId = fullPath.split(`/${agentId}`)[1] || '/';
      console.log('API Path:', pathAfterAgentId);

      // Get method
      const method = req.method;

      // Get request body
      const requestBody = req.body;
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));

      // Get headers to forward
      const headers = { ...req.headers } as Record<string, string>;
      console.log('Headers to forward:', Object.keys(headers).join(', '));

      // Call proxy service with agentId and API key for auth
      console.log('\nCalling proxy service...');
      const result = await proxyService.handleProxyRequestByAgentId(
        agentId,
        invariApiKey,
        method,
        pathAfterAgentId,
        requestBody,
        headers,
        agentIdentifier
      );

      console.log('✓ Validation service completed successfully');
      console.log('Sending response to client with status:', result.status);

      // Set response headers
      const forwardHeaders = { ...result.headers };

      // Add Invari metadata headers
      res.setHeader('X-Invari-Status', result.invariMetadata.status);
      res.setHeader('X-Invari-Overhead', result.invariMetadata.overhead);
      res.setHeader('X-Invari-Mode', result.invariMetadata.mode);

      if (result.invariMetadata.repaired) {
        res.setHeader('X-Invari-Repaired', 'true');
      }

      // Forward response headers
      Object.entries(forwardHeaders).forEach(([key, value]) => {
        if (value) {
          res.setHeader(key, value as string);
        }
      });

      // Inject Invari feedback into response if request was repaired
      if (result.invariMetadata.repaired && result.invariMetadata.feedback) {
        console.log('Injecting Invari feedback into response...');
        const enrichedData = {
          ...result.data,
          _invari_feedback: result.invariMetadata.feedback,
          _invari_metadata: result.invariMetadata
        };
        return res.status(result.status).json(enrichedData);
      }

      // Return validation response
      return res.status(result.status).json({
        ...result.data,
        _invari_metadata: result.invariMetadata
      });
    } catch (error) {
      if (error instanceof Error) {
        // Handle specific proxy errors
        if (error.message === 'Invalid Invari API Key' ||
            error.message === 'Invalid Invari API Key for this agent' ||
            error.message === 'Agent not found') {
          return res.status(401).json({
            success: false,
            error: error.message,
          });
        }

        if (error.message.includes('No active OpenAPI schema')) {
          return res.status(400).json({
            success: false,
            error: error.message,
          });
        }

        if (error.message.startsWith('Request blocked:')) {
          return res.status(400).json({
            success: false,
            error: error.message,
            invariStatus: 'blocked',
          });
        }

        if (error.message.startsWith('Failed to forward request:')) {
          return res.status(502).json({
            success: false,
            error: 'Bad Gateway - Target API unreachable',
          });
        }
      }

      console.error('Proxy request error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

export const proxyController = new ProxyController();
