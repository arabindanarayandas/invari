import { Router, type Router as ExpressRouter } from 'express';
import { fakeServerController } from '../controllers/fake-server.controller.js';

const router: ExpressRouter = Router();

/**
 * Fake Server Routes
 *
 * Catch-all route that handles any path under /api/fake-server
 * This allows the fake server to accept requests to any endpoint
 */
router.all('*', (req, res) => fakeServerController.handleRequest(req, res));

export default router;
