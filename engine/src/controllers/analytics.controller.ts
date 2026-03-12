import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service.js';
import { agentService } from '../services/agent.service.js';

export class AnalyticsController {
  /**
   * GET /api/agents/:id/analytics/timeline
   * Get hourly or daily request counts
   */
  async getTimeline(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      const days = parseInt(req.query.days as string) || 30;
      const period = (req.query.period as string) || 'daily';
      const timezone = (req.query.timezone as string) || 'UTC';

      // Verify agent ownership
      await agentService.getAgentById(id, userId);

      let timeline;
      if (period === 'hourly') {
        timeline = await analyticsService.getHourlyDistribution(id, timezone);
      } else {
        timeline = await analyticsService.getDailyRequestCounts(id, days, timezone);
      }

      return res.status(200).json({
        success: true,
        data: timeline,
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

      console.error('Get timeline error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/agents/:id/analytics/status
   * Get request counts by status
   */
  async getStatusDistribution(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      const days = parseInt(req.query.days as string) || 30;
      const timezone = (req.query.timezone as string) || 'UTC';

      // Verify agent ownership
      await agentService.getAgentById(id, userId);

      const distribution = await analyticsService.getRequestsByStatus(id, days, timezone);

      return res.status(200).json({
        success: true,
        data: distribution,
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

      console.error('Get status distribution error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/agents/:id/analytics/hourly
   * Get hourly request distribution (last 24 hours)
   */
  async getHourlyDistribution(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      const timezone = (req.query.timezone as string) || 'UTC';

      // Verify agent ownership
      await agentService.getAgentById(id, userId);

      const distribution = await analyticsService.getHourlyDistribution(id, timezone);

      return res.status(200).json({
        success: true,
        data: distribution,
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

      console.error('Get hourly distribution error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

export const analyticsController = new AnalyticsController();
