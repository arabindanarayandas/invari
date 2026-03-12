/**
 * Types for API Schema Auto-Sync feature
 */

// Sync interval constants
export const SYNC_INTERVALS = {
  FIFTEEN_MIN: '15min',
  THIRTY_MIN: '30min',
  ONE_HOUR: '1hour',
  SIX_HOURS: '6hours',
  TWELVE_HOURS: '12hours',
  TWENTY_FOUR_HOURS: '24hours',
} as const;

export type SyncInterval = typeof SYNC_INTERVALS[keyof typeof SYNC_INTERVALS];

// Sync log status constants
export const SYNC_STATUS = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  NO_CHANGE: 'no_change',
} as const;

export type SyncStatus = typeof SYNC_STATUS[keyof typeof SYNC_STATUS];

// Schema subscription interface
export interface SchemaSubscription {
  id: string;
  agentId: string;
  sourceUrl: string;
  syncInterval: SyncInterval;
  nextRunAt: Date;
  lastAttemptAt?: Date;
  lastSuccessAt?: Date;
  lastVersionHash?: string;
  isActive: boolean;
  createdAt: Date;
}

// Schema sync log interface
export interface SchemaSyncLog {
  id: string;
  subscriptionId: string;
  status: SyncStatus;
  errorMessage?: string;
  latencyMs: number;
  fetchDurationMs?: number;
  validationDurationMs?: number;
  createdAt: Date;
}

// DTO for creating a subscription
export interface CreateSchemaSubscriptionDTO {
  agentId: string;
  sourceUrl: string;
  syncInterval: SyncInterval;
}

// DTO for updating a subscription
export interface UpdateSchemaSubscriptionDTO {
  sourceUrl?: string;
  syncInterval?: SyncInterval;
  isActive?: boolean;
}

// Result of a sync operation
export interface SyncResult {
  success: boolean;
  status: SyncStatus;
  errorMessage?: string;
  versionHash?: string;
  schemaChanged: boolean;
  latencyMs: number;
  fetchDurationMs?: number;
  validationDurationMs?: number;
}

/**
 * Helper function to convert sync interval to minutes
 */
export function getIntervalMinutes(interval: SyncInterval): number {
  switch (interval) {
    case SYNC_INTERVALS.FIFTEEN_MIN:
      return 15;
    case SYNC_INTERVALS.THIRTY_MIN:
      return 30;
    case SYNC_INTERVALS.ONE_HOUR:
      return 60;
    case SYNC_INTERVALS.SIX_HOURS:
      return 360;
    case SYNC_INTERVALS.TWELVE_HOURS:
      return 720;
    case SYNC_INTERVALS.TWENTY_FOUR_HOURS:
      return 1440;
    default:
      throw new Error(`Invalid sync interval: ${interval}`);
  }
}

/**
 * Helper function to normalize timestamp (set seconds to :00)
 */
export function normalizeTimestamp(date: Date): Date {
  const normalized = new Date(date);
  normalized.setSeconds(0);
  normalized.setMilliseconds(0);
  return normalized;
}

/**
 * Helper function to calculate next run time
 */
export function calculateNextRunAt(interval: SyncInterval, fromDate: Date = new Date()): Date {
  const minutes = getIntervalMinutes(interval);
  const nextRun = new Date(fromDate);
  nextRun.setMinutes(nextRun.getMinutes() + minutes);
  return normalizeTimestamp(nextRun);
}

/**
 * Validate sync interval value
 */
export function isValidSyncInterval(value: string): value is SyncInterval {
  return Object.values(SYNC_INTERVALS).includes(value as SyncInterval);
}
