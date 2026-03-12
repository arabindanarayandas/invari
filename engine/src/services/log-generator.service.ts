import { agentRepository } from '../repositories/agent.repository.js';
import { schemaRepository } from '../repositories/schema.repository.js';
import { logsRepository } from '../repositories/logs.repository.js';
import type { ProxyLogData, RequestStatus } from '../types/proxy.types.js';

export class LogGeneratorService {
  /**
   * Generate random logs for all agents
   */
  async generateLogsForAllAgents() {
    console.log('\n🔄 [Log Generator] Starting log generation...');

    try {
      // Get all agents
      const agents = await agentRepository.findAll();
      console.log(`   Found ${agents.length} agents`);

      let totalLogsGenerated = 0;

      for (const agent of agents) {
        // Get active schema for this agent
        const activeSchema = await schemaRepository.findActiveByAgentId(agent.id);

        if (!activeSchema) {
          console.log(`   ⏭️  Skipping agent "${agent.name}" - no active schema`);
          continue;
        }

        // Extract endpoints from schema
        const endpoints = this.extractEndpoints(activeSchema.schemaSpec);

        if (endpoints.length === 0) {
          console.log(`   ⏭️  Skipping agent "${agent.name}" - no endpoints in schema`);
          continue;
        }

        // Generate logs for this agent
        const logs = this.generateLogsForAgent(agent.id, endpoints);

        // Bulk insert
        await logsRepository.createBulk(logs);

        totalLogsGenerated += logs.length;
        console.log(`   ✓ Generated ${logs.length} logs for "${agent.name}"`);
      }

      console.log(`✅ [Log Generator] Complete! Generated ${totalLogsGenerated} total logs\n`);
    } catch (error) {
      console.error('❌ [Log Generator] Error:', error);
      throw error;
    }
  }

  /**
   * Extract endpoints from OpenAPI schema
   */
  private extractEndpoints(schemaSpec: any): Array<{ path: string; method: string }> {
    const endpoints: Array<{ path: string; method: string }> = [];

    if (!schemaSpec.paths) {
      return endpoints;
    }

    for (const [path, pathItem] of Object.entries(schemaSpec.paths) as [string, any][]) {
      const methods = ['get', 'post', 'put', 'patch', 'delete'];

      for (const method of methods) {
        if (pathItem[method]) {
          endpoints.push({ path, method: method.toUpperCase() });
        }
      }
    }

    return endpoints;
  }

  /**
   * Generate random logs for a single agent
   */
  private generateLogsForAgent(
    agentId: string,
    endpoints: Array<{ path: string; method: string }>
  ): ProxyLogData[] {
    // Random number of logs between 10-50
    const logCount = Math.floor(Math.random() * 41) + 10;

    // Calculate status distribution (10:3:1 = stable:blocked:repaired)
    const totalParts = 14; // 10 + 3 + 1
    const stableCount = Math.floor((logCount * 10) / totalParts);
    const blockedCount = Math.floor((logCount * 3) / totalParts);
    const repairedCount = logCount - stableCount - blockedCount;

    // Create status array
    const statuses: RequestStatus[] = [
      ...Array(stableCount).fill('stable'),
      ...Array(blockedCount).fill('blocked'),
      ...Array(repairedCount).fill('repaired'),
    ];

    // Shuffle statuses
    this.shuffleArray(statuses);

    // Generate timestamps spread across 30-minute window
    const timestamps = this.generateTimestamps(logCount);

    // Generate logs
    const logs: ProxyLogData[] = [];

    for (let i = 0; i < logCount; i++) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const status = statuses[i];
      const timestamp = timestamps[i];

      logs.push(this.generateSingleLog(agentId, endpoint, status, timestamp));
    }

    return logs;
  }

  /**
   * Generate a single log entry
   */
  private generateSingleLog(
    agentId: string,
    endpoint: { path: string; method: string },
    status: RequestStatus,
    timestamp: Date
  ): ProxyLogData {
    // Generate realistic latency
    const latency = this.generateLatency(status);
    const overhead = Math.floor(Math.random() * 30) + 10; // 10-40ms overhead

    // Generate request body
    const originalBody = this.generateRequestBody(endpoint.method);

    // Generate drift details for blocked/repaired
    let driftDetails: any = null;
    let sanitizedBody: object | null = null;

    if (status === 'blocked') {
      driftDetails = this.generateBlockedDetails();
    } else if (status === 'repaired') {
      driftDetails = this.generateRepairedDetails();
      sanitizedBody = { ...originalBody, _repaired: true };
    }

    return {
      agentId,
      agentIdentifier: undefined,
      timestamp, // Include the generated timestamp
      httpMethod: endpoint.method,
      endpointPath: endpoint.path,
      latencyTotalMs: latency,
      overheadMs: overhead,
      status,
      originalBody,
      sanitizedBody,
      driftDetails,
    };
  }

  /**
   * Generate realistic latency based on status
   */
  private generateLatency(status: RequestStatus): number {
    if (status === 'stable') {
      // 50-300ms for stable requests
      return Math.floor(Math.random() * 250) + 50;
    } else {
      // 100-600ms for blocked/repaired
      return Math.floor(Math.random() * 500) + 100;
    }
  }

  /**
   * Generate random request body
   */
  private generateRequestBody(method: string): object {
    if (method === 'GET') {
      return {};
    }

    const bodies = [
      { userId: this.randomId(), amount: Math.floor(Math.random() * 1000) + 10 },
      { email: `user${Math.floor(Math.random() * 1000)}@example.com`, name: 'Test User' },
      { productId: this.randomId(), quantity: Math.floor(Math.random() * 5) + 1 },
      { content: 'Sample content', type: 'message' },
      { status: 'active', priority: Math.floor(Math.random() * 5) + 1 },
    ];

    return bodies[Math.floor(Math.random() * bodies.length)];
  }

  /**
   * Generate blocked request details
   */
  private generateBlockedDetails() {
    const reasons = [
      { reason: 'Endpoint not found in OpenAPI specification', errors: [{ field: 'path', message: 'Invalid endpoint', path: '/' }] },
      { reason: 'Validation failed', errors: [{ field: 'userId', message: 'Required field missing', path: '/userId' }] },
      { reason: 'Type mismatch', errors: [{ field: 'amount', message: 'Should be number', path: '/amount' }] },
      { reason: 'Security threat detected', securityThreats: [{ field: 'input', threatType: 'sql_injection', severity: 'high' }] },
    ];

    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  /**
   * Generate repaired request details
   */
  private generateRepairedDetails() {
    const repairs = [
      {
        repairActions: [{ type: 'field_rename', from: 'user_id', to: 'userId', confidence: 0.95 }],
        confidence: 0.95,
        repairTimeMs: Math.floor(Math.random() * 50) + 10
      },
      {
        repairActions: [{ type: 'type_coercion', field: 'amount', fromType: 'string', toType: 'number' }],
        confidence: 0.90,
        repairTimeMs: Math.floor(Math.random() * 50) + 10
      },
      {
        repairActions: [{ type: 'default_injection', field: 'status', value: 'active', source: 'schema_default' }],
        confidence: 0.85,
        repairTimeMs: Math.floor(Math.random() * 50) + 10
      },
    ];

    return repairs[Math.floor(Math.random() * repairs.length)];
  }

  /**
   * Generate timestamps with irregular intervals spread across 5-minute window
   */
  private generateTimestamps(count: number): Date[] {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const windowMs = 5 * 60 * 1000; // 5 minutes in milliseconds

    const timestamps: Date[] = [];

    for (let i = 0; i < count; i++) {
      // Generate random offset within the 5-minute window
      // Use multiple random values to create more variation
      const random1 = Math.random();
      const random2 = Math.random();

      // Combine randoms for better distribution (using beta-like distribution)
      const combined = (random1 + random2) / 2;

      const offsetMs = combined * windowMs;
      const timestamp = new Date(fiveMinutesAgo.getTime() + offsetMs);

      timestamps.push(timestamp);
    }

    // Sort chronologically
    timestamps.sort((a, b) => a.getTime() - b.getTime());

    return timestamps;
  }

  /**
   * Shuffle array in place (Fisher-Yates algorithm)
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Generate random ID
   */
  private randomId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

export const logGeneratorService = new LogGeneratorService();
