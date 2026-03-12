import type { Request, Response } from 'express';
import { globalDashboardService } from '../services/global-dashboard.service.js';

export class GlobalDashboardController {
  /**
   * GET /api/dashboard/stats
   * Aggregated stats across all agents for the authenticated user
   */
  async getStats(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const stats = await globalDashboardService.getStats(userId);

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Global dashboard stats error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
    }
  }

  /**
   * GET /api/dashboard/timeline?period=hourly|daily
   * Aggregated timeline across all agents for the authenticated user
   */
  async getTimeline(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const period = (req.query.period as string) || 'hourly';
      const timezone = (req.query.timezone as string) || 'UTC';

      let timeline;
      if (period === 'hourly') {
        timeline = await globalDashboardService.getHourlyTimeline(userId, timezone);
      } else {
        const days = parseInt(req.query.days as string) || 30;
        timeline = await globalDashboardService.getDailyTimeline(userId, days, timezone);
      }

      res.json({ success: true, data: timeline });
    } catch (error) {
      console.error('Global dashboard timeline error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch dashboard timeline' });
    }
  }
}

export const globalDashboardController = new GlobalDashboardController();
