import { agentRepository } from '../repositories/agent.repository.js';
import { schemaRepository } from '../repositories/schema.repository.js';
import { logsRepository } from '../repositories/logs.repository.js';
import type { ProxyLogData, RequestStatus, RepairAction } from '../types/proxy.types.js';

/**
 * Chaos Bot Service
 * Simulates GPT-4o drift patterns by writing synthetic logs directly to the DB
 * for the latest agent. Called by the cron scheduler every second.
 *
 * Mode alternates every 100 requests:
 *   normal → 3:3:1 (stable:repaired:blocked)
 *   stress → 1:3:3 (stable:repaired:blocked)
 */

type DriftProfile = 'naming_convention' | 'type_mismatch' | 'naming_drift' | 'hallucination' | 'clean' | 'missing_required';

interface ChaosProfile {
  name: DriftProfile;
  status: RequestStatus;
  buildOriginalBody: () => Record<string, any>;
  buildSanitizedBody: () => Record<string, any> | null;
  buildDriftDetails: () => RepairAction[];
}

// ─── Individual profiles ──────────────────────────────────────────────────────

const PROFILE_CLEAN: ChaosProfile = {
  name: 'clean',
  status: 'stable',
  buildOriginalBody: () => ({
    partySize: 4,
    date: new Date(Date.now() + 86400000).toISOString(),
    userEmail: 'founder@invari.ai',
  }),
  buildSanitizedBody: () => null,
  buildDriftDetails: () => [],
};

const PROFILE_NAMING_CONVENTION: ChaosProfile = {
  name: 'naming_convention',
  status: 'repaired',
  buildOriginalBody: () => ({
    party_size: 4,                                      // snake_case instead of camelCase
    date: new Date(Date.now() + 86400000).toISOString(),
    userEmail: 'founder@invari.ai',
  }),
  buildSanitizedBody: () => ({
    partySize: 4,
    date: new Date(Date.now() + 86400000).toISOString(),
    userEmail: 'founder@invari.ai',
  }),
  buildDriftDetails: () => ([
    { type: 'field_rename', from: 'party_size', to: 'partySize', confidence: 0.95 },
  ] as RepairAction[]),
};

const PROFILE_TYPE_MISMATCH: ChaosProfile = {
  name: 'type_mismatch',
  status: 'repaired',
  buildOriginalBody: () => ({
    partySize: '4',                                     // number sent as string
    date: new Date(Date.now() + 86400000).toISOString(),
    userEmail: 'founder@invari.ai',
  }),
  buildSanitizedBody: () => ({
    partySize: 4,
    date: new Date(Date.now() + 86400000).toISOString(),
    userEmail: 'founder@invari.ai',
  }),
  buildDriftDetails: () => ([
    { type: 'type_coercion', field: 'partySize', fromType: 'string', toType: 'number', originalValue: '4', coercedValue: 4 },
  ] as RepairAction[]),
};

const PROFILE_NAMING_DRIFT: ChaosProfile = {
  name: 'naming_drift',
  status: 'repaired',
  buildOriginalBody: () => ({
    partySize: 4,
    date: new Date(Date.now() + 86400000).toISOString(),
    user_email: 'founder@invari.ai',                   // wrong field name
  }),
  buildSanitizedBody: () => ({
    partySize: 4,
    date: new Date(Date.now() + 86400000).toISOString(),
    userEmail: 'founder@invari.ai',
  }),
  buildDriftDetails: () => ([
    { type: 'field_rename', from: 'user_email', to: 'userEmail', confidence: 0.92 },
  ] as RepairAction[]),
};

const PROFILE_HALLUCINATION: ChaosProfile = {
  name: 'hallucination',
  status: 'repaired',
  buildOriginalBody: () => ({
    partySize: 4,
    date: 'tomorrow at 4pm',                           // NLP date string
    userEmail: 'founder@invari.ai',
  }),
  buildSanitizedBody: () => ({
    partySize: 4,
    date: new Date(Date.now() + 86400000).toISOString(),
    userEmail: 'founder@invari.ai',
  }),
  buildDriftDetails: () => ([
    { type: 'type_coercion', field: 'date', fromType: 'string (invalid date-time)', toType: 'string (date-time)', originalValue: 'tomorrow at 4pm', coercedValue: new Date(Date.now() + 86400000).toISOString() },
  ] as RepairAction[]),
};

const PROFILE_MISSING_REQUIRED: ChaosProfile = {
  name: 'missing_required',
  status: 'blocked',
  buildOriginalBody: () => ({
    date: new Date(Date.now() + 86400000).toISOString(),
    userEmail: 'founder@invari.ai',
    // partySize intentionally omitted — required field, no default
  }),
  buildSanitizedBody: () => null,
  buildDriftDetails: () => ([
    { type: 'repair_failed', field: 'partySize', reason: 'Missing required field with no default value' },
  ] as RepairAction[]),
};

// ─── Weighted pools ───────────────────────────────────────────────────────────

// Normal mode — 3:3:1 (stable:repaired:blocked)
const NORMAL_POOL: ChaosProfile[] = [
  PROFILE_CLEAN,
  PROFILE_CLEAN,
  PROFILE_CLEAN,
  PROFILE_NAMING_CONVENTION,
  PROFILE_TYPE_MISMATCH,
  PROFILE_NAMING_DRIFT,
  PROFILE_MISSING_REQUIRED,
];

// Stress mode — 1:3:3 (stable:repaired:blocked)
const STRESS_POOL: ChaosProfile[] = [
  PROFILE_CLEAN,
  PROFILE_NAMING_CONVENTION,
  PROFILE_TYPE_MISMATCH,
  PROFILE_HALLUCINATION,
  PROFILE_MISSING_REQUIRED,
  PROFILE_MISSING_REQUIRED,
  PROFILE_MISSING_REQUIRED,
];

// ─── Service ──────────────────────────────────────────────────────────────────

export class ChaosBotService {
  private running = false;
  private requestCount = 0;
  private mode: 'normal' | 'stress' = 'normal';

  start(): void {
    this.running = true;
    this.requestCount = 0;
    this.mode = 'normal';
    console.log('[Chaos Bot] Started — writing 1 log/s to latest agent (mode: normal 3:3:1)');
  }

  stop(): void {
    this.running = false;
    console.log(`[Chaos Bot] Stopped after ${this.requestCount} requests`);
  }

  isRunning(): boolean {
    return this.running;
  }

  async fireRequest(): Promise<void> {
    if (!this.running) return;

    // Increment counter and flip mode every 100 requests
    this.requestCount++;
    if (this.requestCount % 100 === 0) {
      this.mode = this.mode === 'normal' ? 'stress' : 'normal';
      const ratio = this.mode === 'normal' ? '3:3:1' : '1:3:3';
      console.log(`[Chaos Bot] Mode → ${this.mode} (${ratio} stable:repaired:blocked) after ${this.requestCount} requests`);
    }

    const pool = this.mode === 'normal' ? NORMAL_POOL : STRESS_POOL;
    const profile = pool[Math.floor(Math.random() * pool.length)];

    try {
      const agents = await agentRepository.findAll();
      if (!agents.length) return;

      const latestAgent = agents[agents.length - 1];

      const activeSchema = await schemaRepository.findActiveByAgentId(latestAgent.id);
      const endpoint = this.pickEndpoint(activeSchema?.schemaSpec);

      const log: ProxyLogData = {
        agentId: latestAgent.id,
        agentIdentifier: undefined,
        httpMethod: endpoint.method,
        endpointPath: endpoint.path,
        latencyTotalMs: Math.floor(Math.random() * 300) + 80,
        overheadMs: Math.floor(Math.random() * 30) + 5,
        status: profile.status,
        originalBody: profile.buildOriginalBody(),
        sanitizedBody: profile.buildSanitizedBody(),
        driftDetails: profile.buildDriftDetails(),
      };

      await logsRepository.create(log);
      console.log(`[Chaos Bot] ${profile.status.toUpperCase().padEnd(8)} — ${profile.name} → ${endpoint.method} ${endpoint.path}`);
    } catch (error: any) {
      console.error(`[Chaos Bot] ERROR — ${error.message}`);
    }
  }

  /**
   * Pick an endpoint from the active schema, or fall back to a sensible default.
   */
  private pickEndpoint(schemaSpec: any): { method: string; path: string } {
    if (!schemaSpec?.paths) {
      return { method: 'POST', path: '/api/check_availability' };
    }

    const endpoints: { method: string; path: string }[] = [];
    const methods = ['get', 'post', 'put', 'patch', 'delete'];

    for (const [path, pathItem] of Object.entries(schemaSpec.paths) as [string, any][]) {
      for (const method of methods) {
        if (pathItem[method]) {
          endpoints.push({ method: method.toUpperCase(), path });
        }
      }
    }

    if (!endpoints.length) return { method: 'POST', path: '/api/check_availability' };

    return endpoints[Math.floor(Math.random() * endpoints.length)];
  }
}

export const chaosBotService = new ChaosBotService();
