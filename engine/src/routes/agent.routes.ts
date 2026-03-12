import { Router, type Router as ExpressRouter } from 'express';
import { agentController } from '../controllers/agent.controller.js';
import { analyticsController } from '../controllers/analytics.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router: ExpressRouter = Router();

// All agent routes require authentication
router.use(authMiddleware);

// Agent CRUD
router.post('/', (req, res) => agentController.createAgent(req, res));
router.get('/', (req, res) => agentController.getAgents(req, res));
router.get('/:id', (req, res) => agentController.getAgent(req, res));
router.patch('/:id', (req, res) => agentController.updateAgent(req, res));
router.delete('/:id', (req, res) => agentController.deleteAgent(req, res));

// Schema management
router.post('/:id/schema', (req, res) => agentController.uploadSchema(req, res));
router.get('/:id/schemas', (req, res) => agentController.getSchemas(req, res));
router.get('/:id/schemas/compare', (req, res) => agentController.compareSchemas(req, res));
router.get('/:id/schemas/:schemaId/endpoints', (req, res) => agentController.getSchemaEndpoints(req, res));
router.put('/:id/schemas/:schemaId/activate', (req, res) => agentController.activateSchema(req, res));

// OpenAPI spec validation (standalone - not tied to specific agent)
router.post('/validate/openapi-spec', (req, res) => agentController.validateOpenApiSpec(req, res));

// API key management
router.post('/:id/regenerate-key', (req, res) => agentController.regenerateApiKey(req, res));

// Sync management
router.post('/:id/sync', (req, res) => agentController.triggerManualSync(req, res));

// Logs and stats
router.get('/:id/stats', (req, res) => agentController.getAgentStats(req, res));
router.get('/:id/logs', (req, res) => agentController.getAgentLogs(req, res));
router.get('/:id/schema-sync-logs', (req, res) => agentController.getSchemaSyncLogs(req, res));

// Analytics
router.get('/:id/analytics/timeline', (req, res) => analyticsController.getTimeline(req, res));
router.get('/:id/analytics/status', (req, res) => analyticsController.getStatusDistribution(req, res));
router.get('/:id/analytics/hourly', (req, res) => analyticsController.getHourlyDistribution(req, res));

export default router;
