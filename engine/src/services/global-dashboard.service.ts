import { db } from '../db/index.js';
import { requestLogs, agents } from '../db/schema.js';
import { eq, gte, sql, and, inArray } from 'drizzle-orm';

/**
 * Global Dashboard Service
 * Aggregates stats and timeline data across ALL agents for a given user.
 */
export class GlobalDashboardService {
  /**
   * Get aggregated stats across all agents for a user
   */
  async getStats(userId: string) {
    const userAgents = await db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.userId, userId));

    if (!userAgents.length) {
      return {
        totalRequests: 0,
        stableCount: 0,
        repairedCount: 0,
        blockedCount: 0,
        avgOverhead: 0,
      };
    }

    const agentIds = userAgents.map(a => a.id);

    const [totals] = await db
      .select({
        totalRequests: sql<number>`COUNT(*)::int`,
        avgOverhead: sql<number>`CAST(AVG(${requestLogs.overheadMs}) AS INTEGER)`,
      })
      .from(requestLogs)
      .where(inArray(requestLogs.agentId, agentIds));

    const statusCounts = await db
      .select({
        status: requestLogs.status,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(requestLogs)
      .where(inArray(requestLogs.agentId, agentIds))
      .groupBy(requestLogs.status);

    const statusMap: Record<string, number> = {};
    for (const row of statusCounts) {
      statusMap[row.status] = Number(row.count);
    }

    return {
      totalRequests: Number(totals?.totalRequests || 0),
      stableCount: statusMap['stable'] || 0,
      repairedCount: statusMap['repaired'] || 0,
      blockedCount: statusMap['blocked'] || 0,
      avgOverhead: Number(totals?.avgOverhead || 0),
    };
  }

  /**
   * Get aggregated hourly timeline (last 24 hours) across all agents for a user.
   * Returns per-agent counts + overall total per hour.
   */
  async getHourlyTimeline(userId: string, timezone: string = 'UTC') {
    const userAgents = await db
      .select({ id: agents.id, name: agents.name })
      .from(agents)
      .where(eq(agents.userId, userId));

    if (!userAgents.length) {
      return { agents: [], timeline: this.emptyHourlyTimeline([]) };
    }

    const agentIds = userAgents.map(a => a.id);

    const startDate = new Date();
    startDate.setHours(startDate.getHours() - 23);
    startDate.setMinutes(0, 0, 0);

    const hourlyCounts = await db
      .select({
        agentId: requestLogs.agentId,
        hour: sql<number>`EXTRACT(HOUR FROM ${requestLogs.timestamp} AT TIME ZONE ${sql.raw(`'${timezone}'`)})::int`.as('hour'),
        count: sql<number>`COUNT(*)::int`.as('count'),
      })
      .from(requestLogs)
      .where(and(
        inArray(requestLogs.agentId, agentIds),
        gte(requestLogs.timestamp, startDate)
      ))
      .groupBy(
        requestLogs.agentId,
        sql`EXTRACT(HOUR FROM ${requestLogs.timestamp} AT TIME ZONE ${sql.raw(`'${timezone}'`)})`
      );

    // agentId -> hour -> count
    const dataMap = new Map<string, Map<number, number>>();
    for (const row of hourlyCounts) {
      if (!dataMap.has(row.agentId)) dataMap.set(row.agentId, new Map());
      dataMap.get(row.agentId)!.set(row.hour, Number(row.count));
    }

    const timeline = Array.from({ length: 24 }, (_, i) => {
      const point: Record<string, any> = { hour: i, total: 0 };
      for (const agent of userAgents) {
        const count = dataMap.get(agent.id)?.get(i) || 0;
        point[agent.id] = count;
        point.total += count;
      }
      return point;
    });

    return { agents: userAgents, timeline };
  }

  /**
   * Get aggregated daily timeline (last N days) across all agents for a user.
   * Returns per-agent counts + overall total per day.
   */
  async getDailyTimeline(userId: string, days: number = 30, timezone: string = 'UTC') {
    const userAgents = await db
      .select({ id: agents.id, name: agents.name })
      .from(agents)
      .where(eq(agents.userId, userId));

    if (!userAgents.length) {
      return { agents: [], timeline: this.emptyDailyTimeline(days) };
    }

    const agentIds = userAgents.map(a => a.id);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const dailyCounts = await db
      .select({
        agentId: requestLogs.agentId,
        date: sql<string>`DATE(${requestLogs.timestamp} AT TIME ZONE ${sql.raw(`'${timezone}'`)})`.as('date'),
        count: sql<number>`COUNT(*)::int`.as('count'),
      })
      .from(requestLogs)
      .where(and(
        inArray(requestLogs.agentId, agentIds),
        gte(requestLogs.timestamp, startDate)
      ))
      .groupBy(
        requestLogs.agentId,
        sql`DATE(${requestLogs.timestamp} AT TIME ZONE ${sql.raw(`'${timezone}'`)})`
      )
      .orderBy(sql`DATE(${requestLogs.timestamp} AT TIME ZONE ${sql.raw(`'${timezone}'`)})`);

    // agentId -> dateStr -> count
    const dataMap = new Map<string, Map<string, number>>();
    for (const row of dailyCounts) {
      if (!dataMap.has(row.agentId)) dataMap.set(row.agentId, new Map());
      dataMap.get(row.agentId)!.set(row.date, Number(row.count));
    }

    const today = new Date();
    const timeline = Array.from({ length: days }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toISOString().split('T')[0];
      const point: Record<string, any> = { date: dateStr, total: 0 };
      for (const agent of userAgents) {
        const count = dataMap.get(agent.id)?.get(dateStr) || 0;
        point[agent.id] = count;
        point.total += count;
      }
      return point;
    });

    return { agents: userAgents, timeline };
  }

  private emptyHourlyTimeline(agentList: { id: string }[]) {
    return Array.from({ length: 24 }, (_, i) => {
      const point: Record<string, any> = { hour: i, total: 0 };
      for (const a of agentList) point[a.id] = 0;
      return point;
    });
  }

  private emptyDailyTimeline(days: number) {
    const today = new Date();
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (days - 1 - i));
      return { date: date.toISOString().split('T')[0], total: 0 };
    });
  }
}

export const globalDashboardService = new GlobalDashboardService();
