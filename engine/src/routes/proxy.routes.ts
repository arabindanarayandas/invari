import { Router, type Router as ExpressRouter } from 'express';
import { proxyController } from '../controllers/proxy.controller.js';

const router: ExpressRouter = Router();

// Handle all HTTP methods and paths under /proxy/{agentId}/*
// This allows each agent to have a unique proxy URL
router.all('/:agentId/*', (req, res) => proxyController.handleRequest(req, res));

export default router;
