import { db } from '../db/index.js';
import { requestLogs } from '../db/schema.js';
import { eq, gte, sql, and } from 'drizzle-orm';

export class AnalyticsService {
  /**
   * Get daily request counts for the last 30 days
   */
  async getDailyRequestCounts(agentId: string, days: number = 30, timezone: string = 'UTC') {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    // Query to get daily request counts (timezone-aware)
    const dailyCounts = await db
      .select({
        date: sql<string>`DATE(${requestLogs.timestamp} AT TIME ZONE ${sql.raw(`'${timezone}'`)})`.as('date'),
        count: sql<number>`COUNT(*)::int`.as('count'),
      })
      .from(requestLogs)
      .where(
        and(
          eq(requestLogs.agentId, agentId),
          gte(requestLogs.timestamp, startDate)
        )
      )
      .groupBy(sql`DATE(${requestLogs.timestamp} AT TIME ZONE ${sql.raw(`'${timezone}'`)})`)
      .orderBy(sql`DATE(${requestLogs.timestamp} AT TIME ZONE ${sql.raw(`'${timezone}'`)})`);

    // Create a map of existing data
    const dataMap = new Map<string, number>();
    dailyCounts.forEach((row) => {
      dataMap.set(row.date, row.count);
    });

    // Fill in missing dates with 0 counts
    const result = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      result.push({
        date: dateStr,
        count: dataMap.get(dateStr) || 0,
      });
    }

    return result;
  }

  /**
   * Get monthly request counts for the last N months
   */
  async getMonthlyRequestCounts(agentId: string, months: number = 12, timezone: string = 'UTC') {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - (months - 1));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // Query to get monthly request counts (timezone-aware)
    const monthlyCounts = await db
      .select({
        year: sql<number>`EXTRACT(YEAR FROM ${requestLogs.timestamp} AT TIME ZONE ${sql.raw(`'${timezone}'`)})::int`.as('year'),
        month: sql<number>`EXTRACT(MONTH FROM ${requestLogs.timestamp} AT TIME ZONE ${sql.raw(`'${timezone}'`)})::int`.as('month'),
        count: sql<number>`COUNT(*)::int`.as('count'),
      })
      .from(requestLogs)
      .where(
        and(
          eq(requestLogs.agentId, agentId),
          gte(requestLogs.timestamp, startDate)
        )
      )
      .groupBy(
        sql`EXTRACT(YEAR FROM ${requestLogs.timestamp} AT TIME ZONE ${sql.raw(`'${timezone}'`)})`,
        sql`EXTRACT(MONTH FROM ${requestLogs.timestamp} AT TIME ZONE ${sql.raw(`'${timezone}'`)})`
      )
      .orderBy(
        sql`EXTRACT(YEAR FROM ${requestLogs.timestamp} AT TIME ZONE ${sql.raw(`'${timezone}'`)})`,
        sql`EXTRACT(MONTH FROM ${requestLogs.timestamp} AT TIME ZONE ${sql.raw(`'${timezone}'`)})`
      );

    // Create a map of existing data
    const dataMap = new Map<string, number>();
    monthlyCounts.forEach((row) => {
      const key = `${row.year}-${String(row.month).padStart(2, '0')}`;
      dataMap.set(key, row.count);
    });

    // Fill in missing months with 0 counts
    const result = [];
    const today = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      date.setDate(1); // First day of the month
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // JavaScript months are 0-indexed
      const key = `${year}-${String(month).padStart(2, '0')}`;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;

      result.push({
        date: dateStr,
        count: dataMap.get(key) || 0,
      });
    }

    return result;
  }

  /**
   * Get request counts by status for a date range
   */
  async getRequestsByStatus(agentId: string, days: number = 30, timezone: string = 'UTC') {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const statusCounts = await db
      .select({
        status: requestLogs.status,
        count: sql<number>`COUNT(*)::int`.as('count'),
      })
      .from(requestLogs)
      .where(
        and(
          eq(requestLogs.agentId, agentId),
          gte(requestLogs.timestamp, startDate)
        )
      )
      .groupBy(requestLogs.status);

    return statusCounts;
  }

  /**
   * Get hourly request distribution (24 hours)
   */
  async getHourlyDistribution(agentId: string, timezone: string = 'UTC') {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - 23);
    startDate.setMinutes(0, 0, 0);

    const hourlyCounts = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${requestLogs.timestamp} AT TIME ZONE ${sql.raw(`'${timezone}'`)})::int`.as('hour'),
        count: sql<number>`COUNT(*)::int`.as('count'),
      })
      .from(requestLogs)
      .where(
        and(
          eq(requestLogs.agentId, agentId),
          gte(requestLogs.timestamp, startDate)
        )
      )
      .groupBy(sql`EXTRACT(HOUR FROM ${requestLogs.timestamp} AT TIME ZONE ${sql.raw(`'${timezone}'`)})`);

    // Fill in all 24 hours
    const dataMap = new Map<number, number>();
    hourlyCounts.forEach((row) => {
      dataMap.set(row.hour, row.count);
    });

    const result = [];
    for (let i = 0; i < 24; i++) {
      result.push({
        hour: i,
        count: dataMap.get(i) || 0,
      });
    }

    return result;
  }
}

export const analyticsService = new AnalyticsService();
