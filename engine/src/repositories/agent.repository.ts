import { eq, and } from 'drizzle-orm';
import { db, agents } from '../db/index.js';

export class AgentRepository {
  async findById(id: string) {
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, id))
      .limit(1);

    return agent;
  }

  async findByApiKey(apiKey: string) {
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.invariApiKey, apiKey))
      .limit(1);

    return agent;
  }

  async findByUserId(userId: string) {
    return await db
      .select()
      .from(agents)
      .where(eq(agents.userId, userId))
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
    await db
      .delete(agents)
      .where(eq(agents.id, id));
  }

  async apiKeyExists(apiKey: string): Promise<boolean> {
    const agent = await this.findByApiKey(apiKey);
    return !!agent;
  }

  async findAll() {
    return await db
      .select()
      .from(agents)
      .orderBy(agents.createdAt);
  }
}

export const agentRepository = new AgentRepository();
