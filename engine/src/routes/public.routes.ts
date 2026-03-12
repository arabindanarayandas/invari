import { Router, type Router as ExpressRouter } from 'express';
import { publicProxyController } from '../controllers/public-proxy.controller.js';

const router: ExpressRouter = Router();

// No authMiddleware — these routes are intentionally public
router.post('/validate-spec', (req, res) => publicProxyController.validateSpec(req, res));
router.post('/proxy', (req, res) => publicProxyController.proxyRequest(req, res));

export default router;
