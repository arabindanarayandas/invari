import { Request, Response } from 'express';
import { agentService } from '../services/agent.service.js';
import { proxyService } from '../services/proxy.service.js';
import { schemaSubscriptionRepository } from '../repositories/schema-subscription.repository.js';
import { schemaSyncLogsRepository } from '../repositories/schema-sync-logs.repository.js';
import { isValidSyncInterval } from '../types/schema-subscription.types.js';
import type { RequestStatus } from '../types/proxy.types.js';

export class AgentController {
  /**
   * POST /api/agents
   */
  async createAgent(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { name, targetBaseUrl, openApiSpec, schemaSourceUrl, schemaSyncInterval } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Agent name is required',
        });
      }

      // Validate URL format if provided (optional for validation-only mode)
      if (targetBaseUrl) {
        try {
          new URL(targetBaseUrl);
        } catch {
          return res.status(400).json({
            success: false,
            error: 'Invalid target base URL format',
          });
        }
      }

      // Validate schema source URL if provided
      if (schemaSourceUrl) {
        try {
          new URL(schemaSourceUrl);
        } catch {
          return res.status(400).json({
            success: false,
            error: 'Invalid schema source URL format',
          });
        }

        if (!schemaSyncInterval || !isValidSyncInterval(schemaSyncInterval)) {
          return res.status(400).json({
            success: false,
            error: 'Valid sync interval is required when using auto-sync',
          });
        }
      }

      const agent = await agentService.createAgent(userId, {
        name,
        targetBaseUrl,
        openApiSpec,
        schemaSourceUrl,
        schemaSyncInterval,
      });

      return res.status(201).json({
        success: true,
        data: agent,
      });
    } catch (error) {
      console.error('Create agent error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/agents
   */
  async getAgents(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const agents = await agentService.getUserAgents(userId);

      return res.status(200).json({
        success: true,
        data: agents,
      });
    } catch (error) {
      console.error('Get agents error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/agents/:id
   */
  async getAgent(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const agent = await agentService.getAgentById(id, userId);

      return res.status(200).json({
        success: true,
        data: agent,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Agent not found') {
          return res.status(404).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === 'Unauthorized access to agent') {
          return res.status(403).json({
            success: false,
            error: error.message,
          });
        }
      }

      console.error('Get agent error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * PATCH /api/agents/:id
   */
  async updateAgent(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      const { name, targetBaseUrl, schemaSourceUrl, schemaSyncInterval } = req.body;

      if (targetBaseUrl) {
        try {
          new URL(targetBaseUrl);
        } catch {
          return res.status(400).json({
            success: false,
            error: 'Invalid target base URL format',
          });
        }
      }

      // Validate schema source URL if provided
      if (schemaSourceUrl !== undefined && schemaSourceUrl !== null) {
        try {
          new URL(schemaSourceUrl);
        } catch {
          return res.status(400).json({
            success: false,
            error: 'Invalid schema source URL format',
          });
        }

        if (!schemaSyncInterval || !isValidSyncInterval(schemaSyncInterval)) {
          return res.status(400).json({
            success: false,
            error: 'Valid sync interval is required when using auto-sync',
          });
        }
      }

      const agent = await agentService.updateAgent(id, userId, {
        name,
        targetBaseUrl,
        schemaSourceUrl,
        schemaSyncInterval,
      });

      return res.status(200).json({
        success: true,
        data: agent,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Agent not found') {
          return res.status(404).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === 'Unauthorized access to agent') {
          return res.status(403).json({
            success: false,
            error: error.message,
          });
        }
      }

      console.error('Update agent error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * DELETE /api/agents/:id
   */
  async deleteAgent(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      await agentService.deleteAgent(id, userId);

      return res.status(200).json({
        success: true,
        message: 'Agent deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Agent not found') {
          return res.status(404).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === 'Unauthorized access to agent') {
          return res.status(403).json({
            success: false,
            error: error.message,
          });
        }
      }

      console.error('Delete agent error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/agents/:id/schema
   */
  async uploadSchema(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      const { schemaSpec, version } = req.body;

      if (!schemaSpec) {
        return res.status(400).json({
          success: false,
          error: 'OpenAPI schema specification is required',
        });
      }

      const schema = await agentService.uploadSchema(id, userId, schemaSpec, version);

      return res.status(201).json({
        success: true,
        data: schema,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Agent not found') {
          return res.status(404).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === 'Unauthorized access to agent') {
          return res.status(403).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message.includes('Invalid OpenAPI specification')) {
          return res.status(400).json({
            success: false,
            error: error.message,
          });
        }
      }

      console.error('Upload schema error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/agents/:id/schemas
   */
  async getSchemas(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const schemas = await agentService.getAgentSchemas(id, userId);

      return res.status(200).json({
        success: true,
        data: schemas,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Agent not found') {
          return res.status(404).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === 'Unauthorized access to agent') {
          return res.status(403).json({
            success: false,
            error: error.message,
          });
        }
      }

      console.error('Get schemas error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * PUT /api/agents/:id/schemas/:schemaId/activate
   */
  async activateSchema(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id, schemaId } = req.params;

      const schema = await agentService.setActiveSchema(id, schemaId, userId);

      return res.status(200).json({
        success: true,
        data: schema,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Agent not found') {
          return res.status(404).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === 'Unauthorized access to agent') {
          return res.status(403).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === 'Schema not found for this agent') {
          return res.status(404).json({
            success: false,
            error: error.message,
          });
        }
      }

      console.error('Activate schema error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/agents/:id/regenerate-key
   */
  async regenerateApiKey(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const agent = await agentService.regenerateApiKey(id, userId);

      return res.status(200).json({
        success: true,
        data: agent,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Agent not found') {
          return res.status(404).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === 'Unauthorized access to agent') {
          return res.status(403).json({
            success: false,
            error: error.message,
          });
        }
      }

      console.error('Regenerate API key error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/agents/:id/stats
   */
  async getAgentStats(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      const days = parseInt(req.query.days as string) || 7;

      // Verify agent ownership
      await agentService.getAgentById(id, userId);

      const stats = await proxyService.getAgentStats(id, days);

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Agent not found') {
          return res.status(404).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === 'Unauthorized access to agent') {
          return res.status(403).json({
            success: false,
            error: error.message,
          });
        }
      }

      console.error('Get agent stats error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/agents/:id/logs
   */
  async getAgentLogs(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as RequestStatus | undefined;
      const httpMethod = req.query.httpMethod as string | undefined;
      const endpointSearch = req.query.endpointSearch as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const sortBy = req.query.sortBy as 'timestamp' | 'latencyTotalMs' | 'overheadMs' | undefined;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;

      // Verify agent ownership
      await agentService.getAgentById(id, userId);

      const result = await proxyService.getAgentLogs(
        id,
        page,
        limit,
        {
          status,
          httpMethod,
          endpointSearch,
          startDate,
          endDate,
        },
        {
          sortBy,
          sortOrder,
        }
      );

      return res.status(200).json({
        success: true,
        data: result.logs,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Agent not found') {
          return res.status(404).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === 'Unauthorized access to agent') {
          return res.status(403).json({
            success: false,
            error: error.message,
          });
        }
      }

      console.error('Get agent logs error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/agents/:id/schema-sync-logs
   */
  async getSchemaSyncLogs(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Verify agent ownership
      await agentService.getAgentById(id, userId);

      // Get subscription for this agent
      const subscription = await schemaSubscriptionRepository.findByAgentId(id);

      if (!subscription) {
        return res.status(200).json({
          success: true,
          data: [],
          hasMore: false,
        });
      }

      // Get sync logs
      const logs = await schemaSyncLogsRepository.findBySubscriptionId(
        subscription.id,
        limit,
        offset
      );

      const total = await schemaSyncLogsRepository.countBySubscriptionId(subscription.id);

      return res.status(200).json({
        success: true,
        data: logs,
        hasMore: offset + logs.length < total,
        total,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Agent not found') {
          return res.status(404).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === 'Unauthorized access to agent') {
          return res.status(403).json({
            success: false,
            error: error.message,
          });
        }
      }

      console.error('Get schema sync logs error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/validate/openapi-spec
   * Validate OpenAPI spec from content or URL
   */
  async validateOpenApiSpec(req: Request, res: Response) {
    try {
      const { specContent, sourceUrl } = req.body;

      if (!specContent && !sourceUrl) {
        return res.status(400).json({
          success: false,
          error: 'Either specContent or sourceUrl is required',
        });
      }

      const result = await agentService.validateOpenApiSpec(specContent, sourceUrl);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      console.error('Validate OpenAPI spec error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/agents/:id/schemas/:schemaId/endpoints
   * Get all endpoints from a specific schema
   */
  async getSchemaEndpoints(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id, schemaId } = req.params;

      const endpoints = await agentService.getSchemaEndpoints(id, schemaId, userId);

      return res.status(200).json({
        success: true,
        data: endpoints,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Agent not found') {
          return res.status(404).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === 'Unauthorized access to agent') {
          return res.status(403).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === 'Schema not found') {
          return res.status(404).json({
            success: false,
            error: error.message,
          });
        }
      }

      console.error('Get schema endpoints error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/agents/:id/schemas/compare
   * Compare two schemas and return diff
   */
  async compareSchemas(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      const { fromSchemaId, toSchemaId } = req.query;

      if (!fromSchemaId || !toSchemaId) {
        return res.status(400).json({
          success: false,
          error: 'Both fromSchemaId and toSchemaId query parameters are required',
        });
      }

      const diff = await agentService.compareSchemas(
        id,
        fromSchemaId as string,
        toSchemaId as string,
        userId
      );

      return res.status(200).json({
        success: true,
        data: diff,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Agent not found') {
          return res.status(404).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === 'Unauthorized access to agent') {
          return res.status(403).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message.includes('Schema not found')) {
          return res.status(404).json({
            success: false,
            error: error.message,
          });
        }
      }

      console.error('Compare schemas error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/agents/:id/sync
   * Trigger manual sync for auto-sync agent
   */
  async triggerManualSync(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const result = await agentService.triggerManualSync(id, userId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Agent not found') {
          return res.status(404).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === 'Unauthorized access to agent') {
          return res.status(403).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === 'Agent does not have auto-sync enabled') {
          return res.status(400).json({
            success: false,
            error: error.message,
          });
        }
      }

      console.error('Trigger manual sync error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

export const agentController = new AgentController();
