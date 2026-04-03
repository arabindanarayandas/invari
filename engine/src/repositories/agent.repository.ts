import { eq, and, isNull } from 'drizzle-orm';
import { db, agents } from '../db/index.js';

export class AgentRepository {
  async findById(id: string) {
    const [agent] = await db
      .select()
      .from(agents)
      .where(and(
        eq(agents.id, id),
        isNull(agents.deletedAt)
      ))
      .limit(1);

    return agent;
  }

  async findByApiKey(apiKey: string) {
    const [agent] = await db
      .select()
      .from(agents)
      .where(and(
        eq(agents.invariApiKey, apiKey),
        isNull(agents.deletedAt)
      ))
      .limit(1);

    return agent;
  }

  async findByUserId(userId: string) {
    return await db
      .select()
      .from(agents)
      .where(and(
        eq(agents.userId, userId),
        isNull(agents.deletedAt)
      ))
      .orderBy(agents.createdAt);
  }

  async create(data: {
    userId: string;
    name: string;
    targetBaseUrl: string | null;
    invariApiKey: string;
  }) {
    const [agent] = await db
      .insert(agents)
      .values(data)
      .returning();

    return agent;
  }

  async update(id: string, data: Partial<{
    name: string;
    targetBaseUrl: string | null;
  }>) {
    const [agent] = await db
      .update(agents)
      .set(data)
      .where(eq(agents.id, id))
      .returning();

    return agent;
  }

  async delete(id: string) {
    // Soft delete: set deleted_at timestamp
    const [agent] = await db
      .update(agents)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(agents.id, id),
        isNull(agents.deletedAt)
      ))
      .returning();

    return agent;
  }

  async restore(id: string) {
    // Restore soft-deleted agent
    const [agent] = await db
      .update(agents)
      .set({ deletedAt: null })
      .where(eq(agents.id, id))
      .returning();

    return agent;
  }

  async apiKeyExists(apiKey: string): Promise<boolean> {
    const agent = await this.findByApiKey(apiKey);
    return !!agent;
  }

  async findAll() {
    return await db
      .select()
      .from(agents)
      .where(isNull(agents.deletedAt))
      .orderBy(agents.createdAt);
  }
}

export const agentRepository = new AgentRepository();
