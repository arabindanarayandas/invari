// @ts-nocheck
import axios, { AxiosRequestConfig } from 'axios';
import https from 'https';
import { agentRepository } from '../repositories/agent.repository.js';
import { schemaRepository } from '../repositories/schema.repository.js';
import { logsRepository } from '../repositories/logs.repository.js';
import { validationService } from './validation.service.js';
import { repairService } from './repair.service.js';
import { securityService } from './security.service.js';
import { feedbackGeneratorService } from './feedback-generator.service.js';
import { fakeServerController } from '../controllers/fake-server.controller.js';
import type { RequestStatus, ProxyLogData, InvariFeedback } from '../types/proxy.types.js';

export class ProxyService {
  /**
   * Proxy handler using agent UUID and API key for authentication
   */
  async handleProxyRequestByAgentId(
    agentId: string,
    invariApiKey: string,
    method: string,
    path: string,
    requestBody: any,
    headers: Record<string, string>,
    agentIdentifier?: string
  ) {
    const startTime = Date.now();
    console.log('\n---------- SERVICE: handleProxyRequestByAgentId ----------');

    // Step 1: Get agent by ID
    console.log('Step 1: Looking up agent by ID:', agentId);
    const agent = await agentRepository.findById(agentId);
    if (!agent) {
      console.log('❌ Agent not found');
      throw new Error('Agent not found');
    }
    console.log('✓ Agent found:', agent.name);
    console.log('  Target URL:', agent.targetBaseUrl);

    // Step 2: Verify API key matches the agent
    console.log('Step 2: Verifying API key');
    const keyMatch = agent.invariApiKey === invariApiKey;
    console.log('  Expected key:', agent.invariApiKey.substring(0, 20) + '...');
    console.log('  Received key:', invariApiKey.substring(0, 20) + '...');
    console.log('  Keys match:', keyMatch);

    if (!keyMatch) {
      console.log('❌ Invalid Invari API Key for this agent');
      throw new Error('Invalid Invari API Key for this agent');
    }
    console.log('✓ API key validated');

    // Continue with the rest of the proxy logic
    console.log('Step 3: Processing proxy request...');
    return this.processProxyRequest(
      agent,
      method,
      path,
      requestBody,
      headers,
      agentIdentifier,
      startTime
    );
  }

  /**
   * Main proxy handler - receives, validates, repairs, forwards requests
   * (Legacy method using API key - kept for backward compatibility)
   */
  async handleProxyRequest(
    invariApiKey: string,
    method: string,
    path: string,
    requestBody: any,
    headers: Record<string, string>,
    agentIdentifier?: string
  ) {
    const startTime = Date.now();

    // Step 1: Authenticate and get agent
    const agent = await agentRepository.findByApiKey(invariApiKey);
    if (!agent) {
      throw new Error('Invalid Invari API Key');
    }

    // Continue with the rest of the proxy logic
    return this.processProxyRequest(
      agent,
      method,
      path,
      requestBody,
      headers,
      agentIdentifier,
      startTime
    );
  }

  /**
   * Core proxy processing logic (shared by both methods)
   */
  private async processProxyRequest(
    agent: any,
    method: string,
    path: string,
    requestBody: any,
    headers: Record<string, string>,
    agentIdentifier: string | undefined,
    startTime: number
  ) {
    console.log('\n---------- PROCESS PROXY REQUEST ----------');
    console.log('Method:', method);
    console.log('Path:', path);
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));

    // Step 2: Security scan for malicious patterns
    console.log('Step 4: Scanning request for malicious patterns...');
    console.log('  Request body to scan:', JSON.stringify(requestBody, null, 2));
    const securityThreats = securityService.scanRequestBody(requestBody);
    console.log('  Threats found:', securityThreats.length);

    if (securityThreats.length > 0) {
      console.log('⚠️  Security threats detected:', securityThreats.length);
      securityThreats.forEach(threat => {
        console.log(`  - ${threat.threatType} in "${threat.field}": ${threat.pattern} (${threat.severity})`);
      });

      // Block ALL security threats immediately (regardless of severity)
      console.log('❌ Request blocked due to security threats');

      const overhead = Date.now() - startTime;
      const [pathOnly, queryString] = path.split('?');
      const queryParams = queryString ? Object.fromEntries(new URLSearchParams(queryString)) : null;

      const headersToLog = { ...headers };
      delete headersToLog['x-flux-key'];
      delete headersToLog['authorization'];
      delete headersToLog['cookie'];

      await this.logRequest({
        agentId: agent.id,
        agentIdentifier,
        httpMethod: method,
        endpointPath: path,
        latencyTotalMs: overhead,
        overheadMs: overhead,
        status: 'blocked',
        requestHeaders: headersToLog,
        queryParams,
        originalBody: requestBody,
        sanitizedBody: null,
        responseStatus: null,
        responseHeaders: null,
        responseBody: null,
        driftDetails: {
          reason: 'Security threat detected',
          securityThreats: securityThreats.map(t => ({
            field: t.field,
            threatType: t.threatType,
            pattern: t.pattern,
            severity: t.severity,
          })),
          threatSummary: securityService.formatThreats(securityThreats),
        },
      });

      throw new Error(`Request blocked: Security threat detected - ${securityService.formatThreats(securityThreats)}`);
    } else {
      console.log('✓ No security threats detected');
    }

    // Step 3: Get active schema
    console.log('Step 5: Getting active OpenAPI schema...');
    const activeSchema = await schemaRepository.findActiveByAgentId(agent.id);
    if (!activeSchema) {
      console.log('❌ No active OpenAPI schema found');
      throw new Error('No active OpenAPI schema found for this agent');
    }
    console.log('✓ Active schema found (version:', activeSchema.version, ')');

    // Ensure schema is cached
    if (!validationService.isSchemaCached(agent.id)) {
    // @ts-ignore
      await validationService.parseAndCacheSchema(agent.id, activeSchema.schemaSpec);
    }

    // Step 4: Validate request
    console.log('Step 6: Validating request against schema...');
    const validationStart = Date.now();
    const { validation, schema, matchedPath, pathParams } =
      validationService.validateRequestAgainstSchema(
        agent.id,
        method,
        path,
        requestBody
      );
    const validationTime = Date.now() - validationStart;
    console.log('  Validation took:', validationTime, 'ms');
    console.log('  Valid:', validation.isValid);
    if (!validation.isValid) {
      console.log('  Errors:', JSON.stringify(validation.errors, null, 2));
    }

    let status: RequestStatus = 'stable';
    let sanitizedBody = requestBody;
    let driftDetails: any = null;
    let invariFeedback: InvariFeedback | null = null;

    // Step 5: If validation failed, attempt repair
    if (!validation.isValid) {
      console.log('Step 7: Validation failed, attempting repair...');
      // Endpoint not found or no schema - BLOCK
      if (!schema) {
        status = 'blocked';
        driftDetails = {
          errors: validation.errors,
          reason: 'Endpoint not found in OpenAPI specification',
        };

        // Log the blocked request
        const overhead = Date.now() - startTime;

        // Parse query params from path
        const [pathOnly, queryString] = path.split('?');
        const queryParams = queryString ? Object.fromEntries(new URLSearchParams(queryString)) : null;

        // Filter headers to log (remove sensitive ones)
        const headersToLog = { ...headers };
        delete headersToLog['x-invari-key'];
        delete headersToLog['authorization'];
        delete headersToLog['cookie'];

        await this.logRequest({
          agentId: agent.id,
          agentIdentifier,
          httpMethod: method,
          endpointPath: path,
          latencyTotalMs: overhead,
          overheadMs: overhead,
          status,
          requestHeaders: headersToLog,
          queryParams,
          originalBody: requestBody,
          sanitizedBody: null,
          responseStatus: null,
          responseHeaders: null,
          responseBody: null,
          driftDetails,
        });

        throw new Error(`Request blocked: ${driftDetails.reason}`);
      }

      // Attempt auto-repair
      const repairStart = Date.now();
      const schemaFields = validationService.getSchemaFields(schema);
      const repairResult = repairService.repairRequestBody(
        requestBody,
        schema,
        schemaFields
      );
      const repairTime = Date.now() - repairStart;

      if (repairResult.success) {
        // Re-validate repaired body
        const revalidation = validationService.validateRequestAgainstSchema(
          agent.id,
          method,
          path,
          repairResult.repairedBody
        );

        if (revalidation.validation.isValid) {
          status = 'repaired';
          sanitizedBody = repairResult.repairedBody;
          const confidence = repairService.calculateRepairConfidence(repairResult.repairs);

          // Generate feedback for LLM agents
          invariFeedback = feedbackGeneratorService.generateFeedback(
            repairResult.repairs,
            activeSchema.schemaSpec,
            method,
            matchedPath || path,
            confidence
          );

          driftDetails = {
            originalErrors: validation.errors,
            repairActions: repairResult.repairs,
            confidence,
            repairTimeMs: repairTime,
          };
        } else {
          // Repair failed - BLOCK
          status = 'blocked';
          driftDetails = {
            originalErrors: validation.errors,
            repairActions: repairResult.repairs,
            revalidationErrors: revalidation.validation.errors,
            reason: 'Auto-repair attempted but validation still fails',
          };

          const overhead = Date.now() - startTime;

          // Parse query params from path
          const [pathOnly1, queryString1] = path.split('?');
          const queryParams1 = queryString1 ? Object.fromEntries(new URLSearchParams(queryString1)) : null;

          // Filter headers to log (remove sensitive ones)
          const headersToLog1 = { ...headers };
          delete headersToLog1['x-flux-key'];
          delete headersToLog1['authorization'];
          delete headersToLog1['cookie'];

          await this.logRequest({
            agentId: agent.id,
            agentIdentifier,
            httpMethod: method,
            endpointPath: path,
            latencyTotalMs: overhead,
            overheadMs: overhead,
            status,
            requestHeaders: headersToLog1,
            queryParams: queryParams1,
            originalBody: requestBody,
            sanitizedBody: repairResult.repairedBody,
            responseStatus: null,
            responseHeaders: null,
            responseBody: null,
            driftDetails,
          });

          throw new Error('Request blocked: Unable to repair validation errors');
        }
      } else {
        // Repair unsuccessful - BLOCK
        status = 'blocked';
        driftDetails = {
          originalErrors: validation.errors,
          repairActions: repairResult.repairs,
          reason: 'Auto-repair failed',
        };

        const overhead = Date.now() - startTime;

        // Parse query params from path
        const [pathOnly2, queryString2] = path.split('?');
        const queryParams2 = queryString2 ? Object.fromEntries(new URLSearchParams(queryString2)) : null;

        // Filter headers to log (remove sensitive ones)
        const headersToLog2 = { ...headers };
    // @ts-ignore - fluxApiKey not in UpdateProjectDTO but valid for update
        delete headersToLog2['x-flux-key'];
        delete headersToLog2['authorization'];
        delete headersToLog2['cookie'];

        await this.logRequest({
          agentId: agent.id,
          agentIdentifier,
          httpMethod: method,
          endpointPath: path,
          latencyTotalMs: overhead,
          overheadMs: overhead,
          status,
          requestHeaders: headersToLog2,
          queryParams: queryParams2,
          originalBody: requestBody,
          sanitizedBody: null,
          responseStatus: null,
          responseHeaders: null,
          responseBody: null,
          driftDetails,
        });

        throw new Error('Request blocked: Unable to repair validation errors');
      }
    }

    // Step 6: Log validation results (Validation-Only Mode - No Proxying)
    console.log('Step 8: Logging validation results (validation-only mode)...');
    const overhead = Date.now() - startTime;
    console.log('  Invari overhead:', overhead, 'ms');
    console.log('  Status:', status);

    // Parse query params from path
    const [pathOnly, queryString] = path.split('?');
    const queryParams = queryString ? Object.fromEntries(new URLSearchParams(queryString)) : null;

    // Filter headers to log (remove sensitive ones)
    const headersToLog = { ...headers };
    delete headersToLog['x-invari-key'];
    delete headersToLog['authorization'];
    delete headersToLog['cookie'];

    await this.logRequest({
      agentId: agent.id,
      agentIdentifier,
      httpMethod: method,
      endpointPath: path,
      latencyTotalMs: null, // No API call in validation-only mode
      overheadMs: overhead,
      status,
      requestHeaders: headersToLog,
      queryParams,
      originalBody: requestBody,
      sanitizedBody: status === 'repaired' ? sanitizedBody : null,
      responseStatus: null, // No actual API response
      responseHeaders: null,
      responseBody: null,
      driftDetails,
    });
    console.log('✓ Validation results logged to database');

    // Step 7: Return validation feedback to client
    console.log('Step 9: Returning validation feedback to client');
    console.log('  Invari status:', status);
    console.log('========== VALIDATION COMPLETE ==========\n');
    return {
      status: 200, // Always return 200 for successful validation
      headers: { 'content-type': 'application/json' },
      data: {
        message: 'Request validation complete',
        validationStatus: status,
        validated: true,
        repaired: status === 'repaired',
        sanitizedBody: status === 'repaired' ? sanitizedBody : requestBody,
      },
      invariMetadata: {
        status,
        overhead: `${overhead}ms`,
        repaired: status === 'repaired',
        driftDetails: status === 'repaired' ? driftDetails : undefined,
        feedback: invariFeedback,
        mode: 'validation-only',
        notice: 'Invari is operating in validation-only mode. Requests are validated against OpenAPI spec but not forwarded to target API.',
      },
    };
  }

  /**
   * Log request to database
   */
  private async logRequest(logData: ProxyLogData) {
    try {
      await logsRepository.create(logData);
    } catch (error) {
      // Log to console but don't throw - logging failures shouldn't break the proxy
      console.error('Failed to log request:', error);
    }
  }

  /**
   * Get dashboard statistics for an agent
   */
  async getAgentStats(agentId: string, days: number = 7) {
    return await logsRepository.getStats(agentId, days);
  }

  /**
   * Get request logs for an agent with pagination
   */
  async getAgentLogs(
    agentId: string,
    page: number = 1,
    limit: number = 50,
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
    const offset = (page - 1) * limit;
    // @ts-expect-error - pagination params include limit/offset instead of page
    return await logsRepository.findByAgentId(agentId, { limit, offset }, filters, sorting);
  }
}

export const proxyService = new ProxyService();
