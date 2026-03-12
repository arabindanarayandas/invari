import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.routes.js';
import agentRoutes from './routes/agent.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import proxyRoutes from './routes/proxy.routes.js';
import fakeServerRoutes from './routes/fake-server.routes.js';
import publicRoutes from './routes/public.routes.js';
import { env } from './config/env.js';
import { apiAnalyticsMiddleware } from './middleware/api-analytics.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: express.Application = express();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding if needed
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS Middleware
app.use(cors({
  origin: env.CORS_ORIGIN.split(',').map(origin => origin.trim()),
  credentials: true,
  exposedHeaders: ['X-Flux-Status', 'X-Flux-Overhead', 'X-Flux-Total-Latency', 'X-Flux-Repaired'],
}));

app.use(express.json({ limit: '10mb' })); // Parse JSON bodies (allow larger schemas)
app.use(express.urlencoded({ extended: true }));

// API analytics tracking (after body parsing, before routes)
app.use(apiAnalyticsMiddleware);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/public', publicRoutes); // Unauthenticated public demo routes
app.use('/api/fake-server', fakeServerRoutes); // Fake server for testing (MUST be before proxy)
app.use('/proxy', proxyRoutes); // Main proxy endpoint

// Serve web-console static files in production
const webConsolePath = path.join(__dirname, '../../web-console/dist');
app.use(express.static(webConsolePath));

// SPA catch-all route - serve index.html for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(webConsolePath, 'index.html'));
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

export default app;
