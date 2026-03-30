import { Router, type Router as ExpressRouter } from 'express';
import { demoController } from '../controllers/demo.controller.js';

const router: ExpressRouter = Router();

// Public demo endpoints (no authentication required)

/**
 * GET /api/demo/specs
 * Get list of available demo specs (lightweight - names only)
 */
router.get('/specs', (req, res) => demoController.getDemoSpecs(req, res));

/**
 * POST /api/demo/analyze
 * Analyze an OpenAPI spec and return AI risk analysis
 * Body: { specName?: string, specContent?: string }
 */
router.post('/analyze', (req, res) => demoController.analyzeSpec(req, res));

/**
 * GET /api/demo/specs/:name
 * Get full spec content by name
 */
router.get('/specs/:name', (req, res) => demoController.getSpecByName(req, res));

/**
 * POST /api/demo/validate
 * Validate and repair a request body against spec (no proxy forwarding)
 * Body: { spec: object, method: string, path: string, requestBody: any }
 * Only supports POST and PATCH methods
 */
router.post('/validate', (req, res) => demoController.validateRequest(req, res));

export default router;
