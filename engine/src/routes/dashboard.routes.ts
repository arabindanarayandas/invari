import { Router, type Router as ExpressRouter } from 'express';
import { globalDashboardController } from '../controllers/global-dashboard.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router: ExpressRouter = Router();

router.use(authMiddleware);

router.get('/stats', (req, res) => globalDashboardController.getStats(req, res));
router.get('/timeline', (req, res) => globalDashboardController.getTimeline(req, res));

export default router;
