import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

// Create postgres connection
export const connection = postgres(process.env.DATABASE_URL);

// Create drizzle instance
export const db = drizzle(connection, { schema });

// Export schema for use in repositories
export * from './schema.js';
