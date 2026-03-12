import { eq, and, lte, sql } from 'drizzle-orm';
import { db, apiSchemaSubscriptions } from '../db/index.js';
import type { CreateSchemaSubscriptionDTO, UpdateSchemaSubscriptionDTO, SyncInterval } from '../types/schema-subscription.types.js';
import { calculateNextRunAt, normalizeTimestamp } from '../types/schema-subscription.types.js';

export class SchemaSubscriptionRepository {
  /**
   * Find subscriptions that are due for syncing
   * Uses SELECT FOR UPDATE SKIP LOCKED for concurrent processing
   */
  async findPendingSubscriptions() {
    const now = new Date();

    return await db
      .select()
      .from(apiSchemaSubscriptions)
      .where(
        and(
          eq(apiSchemaSubscriptions.isActive, true),
          lte(apiSchemaSubscriptions.nextRunAt, now)
        )
      )
      .for('update', { skipLocked: true });
  }

  /**
   * Find subscription by agent ID
   */
  async findByAgentId(agentId: string) {
    const [subscription] = await db
      .select()
      .from(apiSchemaSubscriptions)
      .where(eq(apiSchemaSubscriptions.agentId, agentId))
      .limit(1);

    return subscription;
  }

  /**
   * Find subscription by ID
   */
  async findById(id: string) {
    const [subscription] = await db
      .select()
      .from(apiSchemaSubscriptions)
      .where(eq(apiSchemaSubscriptions.id, id))
      .limit(1);

    return subscription;
  }

  /**
   * Create or update subscription for an agent
   */
  async createOrUpdate(data: CreateSchemaSubscriptionDTO) {
    const existing = await this.findByAgentId(data.agentId);
    const nextRunAt = calculateNextRunAt(data.syncInterval);

    if (existing) {
      // Update existing subscription
      const [updated] = await db
        .update(apiSchemaSubscriptions)
        .set({
          sourceUrl: data.sourceUrl,
          syncInterval: data.syncInterval,
          nextRunAt,
          isActive: true,
        })
        .where(eq(apiSchemaSubscriptions.agentId, data.agentId))
        .returning();

      return updated;
    } else {
      // Create new subscription
      const [created] = await db
        .insert(apiSchemaSubscriptions)
        .values({
          agentId: data.agentId,
          sourceUrl: data.sourceUrl,
          syncInterval: data.syncInterval,
          nextRunAt,
          isActive: true,
        })
        .returning();

      return created;
    }
  }

  /**
   * Update subscription
   */
  async update(id: string, data: UpdateSchemaSubscriptionDTO) {
    const updateData: any = { ...data };

    // Recalculate next run time if interval changed
    if (data.syncInterval) {
      updateData.nextRunAt = calculateNextRunAt(data.syncInterval);
    }

    const [updated] = await db
      .update(apiSchemaSubscriptions)
      .set(updateData)
      .where(eq(apiSchemaSubscriptions.id, id))
      .returning();

    return updated;
  }

  /**
   * Update next run time after a sync attempt
   */
  async updateNextRunAt(id: string, syncInterval: SyncInterval) {
    const nextRunAt = calculateNextRunAt(syncInterval);
    const now = normalizeTimestamp(new Date());

    const [updated] = await db
      .update(apiSchemaSubscriptions)
      .set({
        nextRunAt,
        lastAttemptAt: now,
      })
      .where(eq(apiSchemaSubscriptions.id, id))
      .returning();

    return updated;
  }

  /**
   * Update last version hash and success timestamp
   */
  async updateLastHash(id: string, versionHash: string, syncInterval: SyncInterval) {
    const nextRunAt = calculateNextRunAt(syncInterval);
    const now = normalizeTimestamp(new Date());

    const [updated] = await db
      .update(apiSchemaSubscriptions)
      .set({
        lastVersionHash: versionHash,
        lastSuccessAt: now,
        lastAttemptAt: now,
        nextRunAt,
      })
      .where(eq(apiSchemaSubscriptions.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete subscription by agent ID
   */
  async deleteByAgentId(agentId: string) {
    await db
      .delete(apiSchemaSubscriptions)
      .where(eq(apiSchemaSubscriptions.agentId, agentId));
  }

  /**
   * Delete subscription by ID
   */
  async delete(id: string) {
    await db
      .delete(apiSchemaSubscriptions)
      .where(eq(apiSchemaSubscriptions.id, id));
  }

  /**
   * Deactivate subscription
   */
  async deactivate(id: string) {
    const [updated] = await db
      .update(apiSchemaSubscriptions)
      .set({ isActive: false })
      .where(eq(apiSchemaSubscriptions.id, id))
      .returning();

    return updated;
  }

  /**
   * Activate subscription
   */
  async activate(id: string) {
    const [updated] = await db
      .update(apiSchemaSubscriptions)
      .set({ isActive: true })
      .where(eq(apiSchemaSubscriptions.id, id))
      .returning();

    return updated;
  }
}

export const schemaSubscriptionRepository = new SchemaSubscriptionRepository();
