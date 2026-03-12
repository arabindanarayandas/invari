import { eq, and, desc } from 'drizzle-orm';
import { db, apiSchemas } from '../db/index.js';

export class SchemaRepository {
  async findActiveByAgentId(agentId: string) {
    const [schema] = await db
      .select()
      .from(apiSchemas)
      .where(and(
        eq(apiSchemas.agentId, agentId),
        eq(apiSchemas.isActive, true)
      ))
      .orderBy(desc(apiSchemas.createdAt))
      .limit(1);

    return schema;
  }

  async findById(id: string) {
    const [schema] = await db
      .select()
      .from(apiSchemas)
      .where(eq(apiSchemas.id, id))
      .limit(1);

    return schema;
  }

  async findByAgentId(agentId: string) {
    return await db
      .select()
      .from(apiSchemas)
      .where(eq(apiSchemas.agentId, agentId))
      .orderBy(desc(apiSchemas.createdAt));
  }

  async create(data: {
    agentId: string;
    version: string | null;
    schemaSpec: object;
    isActive: boolean;
    subscriptionId?: string;
    versionHash?: string;
  }) {
    const [schema] = await db
      .insert(apiSchemas)
      .values(data)
      .returning();

    return schema;
  }

  async deactivateAllForAgent(agentId: string) {
    await db
      .update(apiSchemas)
      .set({ isActive: false })
      .where(eq(apiSchemas.agentId, agentId));
  }

  async setActive(id: string, agentId: string) {
    // First, deactivate all schemas for this agent
    await this.deactivateAllForAgent(agentId);

    // Then activate the specified schema
    const [schema] = await db
      .update(apiSchemas)
      .set({ isActive: true })
      .where(eq(apiSchemas.id, id))
      .returning();

    return schema;
  }
}

export const schemaRepository = new SchemaRepository();
