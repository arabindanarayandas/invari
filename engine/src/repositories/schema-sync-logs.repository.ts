import { eq, desc, count } from 'drizzle-orm';
import { db, apiSchemaSyncLogs } from '../db/index.js';
import type { SyncStatus } from '../types/schema-subscription.types.js';

export class SchemaSyncLogsRepository {
  /**
   * Create a sync log entry
   */
  async createLog(data: {
    subscriptionId: string;
    status: SyncStatus;
    errorMessage?: string;
    latencyMs: number;
    fetchDurationMs?: number;
    validationDurationMs?: number;
  }) {
    const [log] = await db
      .insert(apiSchemaSyncLogs)
      .values(data)
      .returning();

    return log;
  }

  /**
   * Find sync logs by subscription ID with pagination
   */
  async findBySubscriptionId(subscriptionId: string, limit: number = 50, offset: number = 0) {
    return await db
      .select()
      .from(apiSchemaSyncLogs)
      .where(eq(apiSchemaSyncLogs.subscriptionId, subscriptionId))
      .orderBy(desc(apiSchemaSyncLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Find the most recent sync log for a subscription
   */
  async findMostRecent(subscriptionId: string) {
    const [log] = await db
      .select()
      .from(apiSchemaSyncLogs)
      .where(eq(apiSchemaSyncLogs.subscriptionId, subscriptionId))
      .orderBy(desc(apiSchemaSyncLogs.createdAt))
      .limit(1);

    return log;
  }

  /**
   * Count total logs for a subscription
   */
  async countBySubscriptionId(subscriptionId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(apiSchemaSyncLogs)
      .where(eq(apiSchemaSyncLogs.subscriptionId, subscriptionId));

    return Number(result[0]?.count) || 0;
  }

  /**
   * Delete old logs (keep last N logs)
   */
  async deleteOldLogs(subscriptionId: string, keepCount: number = 100) {
    // Get the ID of the Nth most recent log
    const logs = await db
      .select({ id: apiSchemaSyncLogs.id })
      .from(apiSchemaSyncLogs)
      .where(eq(apiSchemaSyncLogs.subscriptionId, subscriptionId))
      .orderBy(desc(apiSchemaSyncLogs.createdAt))
      .limit(1)
      .offset(keepCount);

    if (logs.length === 0) {
      return; // Not enough logs to delete
    }

    const cutoffId = logs[0].id;

    // Delete logs older than the cutoff
    await db
      .delete(apiSchemaSyncLogs)
      .where(
        eq(apiSchemaSyncLogs.subscriptionId, subscriptionId)
      );
  }
}

export const schemaSyncLogsRepository = new SchemaSyncLogsRepository();
