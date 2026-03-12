import app from './app.js';
import { env } from './config/env.js';
import { db, connection } from './db/index.js';
import { sql } from 'drizzle-orm';
import { scheduler } from './jobs/scheduler.js';

const PORT = env.PORT;

async function startServer() {
  try {
    // Test database connection
    console.log('Testing database connection...');
    await db.execute(sql`SELECT 1`);
    console.log('Database connected successfully');

    // Start cron scheduler (controlled by ENABLE_CRON env var)
    if (env.ENABLE_CRON === 'true') {
      scheduler.start();
    } else {
      console.log('Cron scheduler disabled (ENABLE_CRON=false)');
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`
┌─────────────────────────────────────────┐
│                                         │
│   Invari Engine Running      │
│                                         │
│   Port: ${PORT.toString().padEnd(30, ' ')}    │
│   Environment: ${env.NODE_ENV.padEnd(24, ' ')}    │
│                                         │
└─────────────────────────────────────────┘

Health Check:
  - GET    /health
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  if (env.ENABLE_CRON === 'true') scheduler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  if (env.ENABLE_CRON === 'true') scheduler.stop();
  process.exit(0);
});

startServer();
