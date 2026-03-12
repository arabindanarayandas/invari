import { eq, desc, asc, and, gte, lte, sql, count, ilike } from 'drizzle-orm';
import { db, requestLogs } from '../db/index.js';
import type { ProxyLogData, RequestStatus } from '../types/proxy.types.js';
import type { PaginationParams } from '../types/api.types.js';

export class LogsRepository {
  async create(data: ProxyLogData) {
    const [log] = await db
      .insert(requestLogs)
      .values({
        agentId: data.agentId,
        agentIdentifier: data.agentIdentifier || null,
        httpMethod: data.httpMethod,
        endpointPath: data.endpointPath,
        latencyTotalMs: data.latencyTotalMs,
        overheadMs: data.overheadMs,
        status: data.status,
        originalBody: data.originalBody as any,
        sanitizedBody: data.sanitizedBody as any,
        driftDetails: data.driftDetails as any,
      })
      .returning();

    return log;
  }

  async findByAgentId(
    agentId: string,
    pagination: PaginationParams,
    filters?: {
      status?: RequestStatus;
      httpMethod?: string;
      endpointSearch?: string;
      startDate?: Date;
      endDate?: Date;
    },
    sorting?: {
      sortBy?: 'timestamp' | 'latencyTotalMs' | 'overheadMs';
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    const conditions = [eq(requestLogs.agentId, agentId)];

    if (filters?.status) {
      conditions.push(eq(requestLogs.status, filters.status));
    }

    if (filters?.httpMethod) {
      conditions.push(eq(requestLogs.httpMethod, filters.httpMethod));
    }

    if (filters?.endpointSearch) {
      conditions.push(ilike(requestLogs.endpointPath, `%${filters.endpointSearch}%`));
    }

    if (filters?.startDate) {
      conditions.push(gte(requestLogs.timestamp, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(requestLogs.timestamp, filters.endDate));
    }

    const where = and(...conditions);

    // Determine sorting
    const sortBy = sorting?.sortBy || 'timestamp';
    const sortOrder = sorting?.sortOrder || 'desc';
    const sortFn = sortOrder === 'asc' ? asc : desc;

    let orderByColumn;
    switch (sortBy) {
      case 'latencyTotalMs':
        orderByColumn = requestLogs.latencyTotalMs;
        break;
      case 'overheadMs':
        orderByColumn = requestLogs.overheadMs;
        break;
      default:
        orderByColumn = requestLogs.timestamp;
    }

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(requestLogs)
      .where(where);

    // Get paginated data
    const logs = await db
      .select()
      .from(requestLogs)
      .where(where)
      .orderBy(sortFn(orderByColumn))
      .limit(pagination.limit)
      .offset(pagination.offset);

    return {
      logs,
      total: Number(total),
    };
  }

  async getStats(agentId: string, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await db
      .select({
        totalRequests: count(),
        avgLatency: sql<number>`CAST(AVG(${requestLogs.overheadMs}) AS INTEGER)`,
        avgOverhead: sql<number>`CAST(AVG(${requestLogs.overheadMs}) AS INTEGER)`,
      })
      .from(requestLogs)
      .where(and(
        eq(requestLogs.agentId, agentId),
        gte(requestLogs.timestamp, startDate)
      ));

    // Get status counts
    const statusCounts = await db
      .select({
        status: requestLogs.status,
        count: count(),
      })
      .from(requestLogs)
      .where(and(
        eq(requestLogs.agentId, agentId),
        gte(requestLogs.timestamp, startDate)
      ))
      .groupBy(requestLogs.status);

    const statusMap = statusCounts.reduce((acc, { status, count }) => {
      acc[status as RequestStatus] = Number(count);
      return acc;
    }, {} as Record<RequestStatus, number>);

    return {
      totalRequests: Number(stats[0]?.totalRequests || 0),
      stableCount: statusMap.stable || 0,
      repairedCount: statusMap.repaired || 0,
      blockedCount: statusMap.blocked || 0,
      avgLatency: Number(stats[0]?.avgLatency || 0),
      avgOverhead: Number(stats[0]?.avgOverhead || 0),
    };
  }

  async deleteOldLogs(agentId: string, daysToKeep: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await db
      .delete(requestLogs)
      .where(and(
        eq(requestLogs.agentId, agentId),
        lte(requestLogs.timestamp, cutoffDate)
      ));
  }

  async createBulk(logsData: ProxyLogData[]) {
    if (logsData.length === 0) return [];

    const logs = await db
      .insert(requestLogs)
      .values(logsData.map(data => ({
        agentId: data.agentId,
        agentIdentifier: data.agentIdentifier || null,
        timestamp: data.timestamp, // Use provided timestamp
        httpMethod: data.httpMethod,
        endpointPath: data.endpointPath,
        latencyTotalMs: data.latencyTotalMs,
        overheadMs: data.overheadMs,
        status: data.status,
        originalBody: data.originalBody as any,
        sanitizedBody: data.sanitizedBody as any,
        driftDetails: data.driftDetails as any,
      })))
      .returning();

    return logs;
  }
}

export const logsRepository = new LogsRepository();
