import crypto from 'crypto';
import axios from 'axios';
import { schemaSubscriptionRepository } from '../repositories/schema-subscription.repository.js';
import { schemaSyncLogsRepository } from '../repositories/schema-sync-logs.repository.js';
import { schemaRepository } from '../repositories/schema.repository.js';
import { parseOpenApiSpec } from '../utils/openapi-validator.js';
import { SYNC_STATUS, type SyncResult, type SchemaSubscription } from '../types/schema-subscription.types.js';
import { validationService } from './validation.service.js';

// Configuration
const MAX_RETRIES = parseInt(process.env.SCHEMA_SYNC_MAX_RETRIES || '3', 10);
const TIMEOUT_MS = parseInt(process.env.SCHEMA_SYNC_TIMEOUT_MS || '30000', 10);

export class SchemaSyncService {
  /**
   * Process all pending subscriptions
   */
  async processPendingSyncs(): Promise<void> {
    try {
      const pendingSubscriptions = await schemaSubscriptionRepository.findPendingSubscriptions();

      if (pendingSubscriptions.length === 0) {
        return;
      }

      console.log(`[Schema Sync] Processing ${pendingSubscriptions.length} pending subscriptions`);

      // Process all subscriptions in parallel
      await Promise.allSettled(
        pendingSubscriptions.map(subscription => this.syncSubscription(subscription))
      );

      console.log(`[Schema Sync] Completed processing ${pendingSubscriptions.length} subscriptions`);
    } catch (error) {
      console.error('[Schema Sync] Error in processPendingSyncs:', error);
    }
  }

  /**
   * Sync a single subscription
   */
  async syncSubscription(subscription: SchemaSubscription): Promise<SyncResult> {
    const startTime = Date.now();
    let fetchDurationMs: number | undefined;
    let validationDurationMs: number | undefined;

    try {
      console.log(`[Schema Sync] Starting sync for agent ${subscription.agentId} from ${subscription.sourceUrl}`);

      // Fetch the OpenAPI spec with retries
      const fetchStartTime = Date.now();
      const specData = await this.fetchWithRetry(subscription.sourceUrl);
      fetchDurationMs = Date.now() - fetchStartTime;

      // Calculate hash of the response
      const versionHash = this.calculateHash(specData);

      // Check if the spec has changed
      if (subscription.lastVersionHash === versionHash) {
        console.log(`[Schema Sync] No changes detected for agent ${subscription.agentId}`);

        // Update next run time even though nothing changed
        await schemaSubscriptionRepository.updateNextRunAt(subscription.id, subscription.syncInterval);

        const latencyMs = Date.now() - startTime;

        // Log the outcome
        await schemaSyncLogsRepository.createLog({
          subscriptionId: subscription.id,
          status: SYNC_STATUS.NO_CHANGE,
          latencyMs,
          fetchDurationMs,
        });

        return {
          success: true,
          status: SYNC_STATUS.NO_CHANGE,
          versionHash,
          schemaChanged: false,
          latencyMs,
          fetchDurationMs,
        };
      }

      // Validate the OpenAPI spec
      const validationStartTime = Date.now();
      let parsedSpec: any;
      try {
        parsedSpec = await parseOpenApiSpec(specData);
        validationDurationMs = Date.now() - validationStartTime;
      } catch (validationError) {
        const errorMessage = `Invalid OpenAPI spec: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`;
        console.error(`[Schema Sync] ${errorMessage} for agent ${subscription.agentId}`);

        // Update next run time even on failure
        await schemaSubscriptionRepository.updateNextRunAt(subscription.id, subscription.syncInterval);

        const latencyMs = Date.now() - startTime;

        // Log the failure
        await schemaSyncLogsRepository.createLog({
          subscriptionId: subscription.id,
          status: SYNC_STATUS.FAILURE,
          errorMessage,
          latencyMs,
          fetchDurationMs,
          validationDurationMs: Date.now() - validationStartTime,
        });

        return {
          success: false,
          status: SYNC_STATUS.FAILURE,
          errorMessage,
          schemaChanged: false,
          latencyMs,
          fetchDurationMs,
          validationDurationMs: Date.now() - validationStartTime,
        };
      }

      // Deactivate all previous schemas for this agent
      await schemaRepository.deactivateAllForAgent(subscription.agentId);

      // Insert new schema version
      await schemaRepository.create({
        agentId: subscription.agentId,
        version: (parsedSpec.info?.version as string) || null,
        schemaSpec: specData,
        isActive: true,
        subscriptionId: subscription.id,
        versionHash,
      });

      // Update subscription with new hash and success timestamp
      await schemaSubscriptionRepository.updateLastHash(subscription.id, versionHash, subscription.syncInterval);

      // Invalidate validation cache for this agent
      validationService.clearSchemaCache(subscription.agentId);

      const latencyMs = Date.now() - startTime;

      // Log the success
      await schemaSyncLogsRepository.createLog({
        subscriptionId: subscription.id,
        status: SYNC_STATUS.SUCCESS,
        latencyMs,
        fetchDurationMs,
        validationDurationMs,
      });

      console.log(`[Schema Sync] Successfully synced new version for agent ${subscription.agentId}`);

      return {
        success: true,
        status: SYNC_STATUS.SUCCESS,
        versionHash,
        schemaChanged: true,
        latencyMs,
        fetchDurationMs,
        validationDurationMs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Schema Sync] Error syncing subscription ${subscription.id}:`, error);

      // Update next run time even on failure to prevent stuck jobs
      await schemaSubscriptionRepository.updateNextRunAt(subscription.id, subscription.syncInterval);

      const latencyMs = Date.now() - startTime;

      // Log the failure
      await schemaSyncLogsRepository.createLog({
        subscriptionId: subscription.id,
        status: SYNC_STATUS.FAILURE,
        errorMessage,
        latencyMs,
        fetchDurationMs,
        validationDurationMs,
      });

      return {
        success: false,
        status: SYNC_STATUS.FAILURE,
        errorMessage,
        schemaChanged: false,
        latencyMs,
        fetchDurationMs,
        validationDurationMs,
      };
    }
  }

  /**
   * Fetch URL with exponential backoff retries
   */
  private async fetchWithRetry(url: string, retryCount: number = 0): Promise<any> {
    try {
      const response = await axios.get(url, {
        timeout: TIMEOUT_MS,
        headers: {
          'Accept': 'application/json, application/yaml, application/x-yaml, text/yaml',
          'User-Agent': 'FluxGuard-Schema-Sync/1.0',
        },
      });

      return response.data;
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`[Schema Sync] Retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms for ${url}`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Calculate SHA-256 hash of data
   */
  private calculateHash(data: any): string {
    const jsonString = JSON.stringify(data);
    return crypto.createHash('sha256').update(jsonString).digest('hex');
  }

  /**
   * Trigger an immediate sync for a subscription (used when creating/updating)
   */
  async triggerImmediateSync(subscriptionId: string): Promise<SyncResult> {
    const subscription = await schemaSubscriptionRepository.findById(subscriptionId);

    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    return await this.syncSubscription(subscription);
  }
}

export const schemaSyncService = new SchemaSyncService();
