import axios, { AxiosRequestConfig } from 'axios';
import { parseOpenApiSpec, extractRequestSchema, validateRequest, extractSchemaFields, findMatchingEndpoint } from '../utils/openapi-validator.js';
import { repairService } from './repair.service.js';
import { securityService } from './security.service.js';
import { feedbackGeneratorService } from './feedback-generator.service.js';

export interface PublicProxyResult {
  status: 'stable' | 'repaired' | 'blocked';
  originalBody: any;
  sanitizedBody: any;
  driftDetails: any;
  overheadMs: number;
  latencyTotalMs: number;
  response: {
    status: number | null;
    body: any;
    headers: Record<string, string>;
  } | null;
  feedback: any;
}

export interface SpecEndpoint {
  method: string;
  path: string;
  summary: string;
  requestBodySchema: any;
}

/**
 * Stateless public proxy service — no DB reads or writes.
 * The OpenAPI spec is passed inline with every request.
 */
export class PublicProxyService {
  /**
   * Parse a spec and extract all endpoints (for the playground UI).
   */
  async parseSpec(specJson: object): Promise<SpecEndpoint[]> {
    const parsed = await parseOpenApiSpec(specJson);
    const endpoints: SpecEndpoint[] = [];

    const paths = (parsed as any).paths || {};
    const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

    for (const [path, pathItem] of Object.entries(paths as Record<string, any>)) {
      for (const method of HTTP_METHODS) {
        if (pathItem[method]) {
          const op = pathItem[method];
          const schema = extractRequestSchema(parsed, method.toUpperCase(), path) || null;
          endpoints.push({
            method: method.toUpperCase(),
            path,
            summary: op.summary || op.operationId || '',
            requestBodySchema: schema,
          });
        }
      }
    }

    return endpoints;
  }

  /**
   * Validate, optionally repair, forward, and return a result — no DB.
   */
  async processRequest(
    specJson: object,
    baseUrl: string,
    method: string,
    path: string,
    requestBody: any,
    headers: Record<string, string> = {}
  ): Promise<PublicProxyResult> {
    const startTime = Date.now();

    // 1. Security scan
    const threats = securityService.scanRequestBody(requestBody);
    if (threats.length > 0) {
      const overhead = Date.now() - startTime;
      return {
        status: 'blocked',
        originalBody: requestBody,
        sanitizedBody: null,
        overheadMs: overhead,
        latencyTotalMs: overhead,
        response: null,
        feedback: null,
        driftDetails: {
          reason: 'Security threat detected',
          threatSummary: securityService.formatThreats(threats),
          securityThreats: threats.map(t => ({
            field: t.field,
            threatType: t.threatType,
            pattern: t.pattern,
            severity: t.severity,
          })),
        },
      };
    }

    // 2. Parse spec
    let parsedSpec: any;
    try {
      parsedSpec = await parseOpenApiSpec(specJson);
    } catch (err) {
      const overhead = Date.now() - startTime;
      return {
        status: 'blocked',
        originalBody: requestBody,
        sanitizedBody: null,
        overheadMs: overhead,
        latencyTotalMs: overhead,
        response: null,
        feedback: null,
        driftDetails: {
          reason: 'Invalid OpenAPI specification',
          error: err instanceof Error ? err.message : 'Parse error',
        },
      };
    }

    // 3. Find matching endpoint + validate
    const matchResult = findMatchingEndpoint(parsedSpec, path, method);
    if (!matchResult) {
      const overhead = Date.now() - startTime;
      return {
        status: 'blocked',
        originalBody: requestBody,
        sanitizedBody: null,
        overheadMs: overhead,
        latencyTotalMs: overhead,
        response: null,
        feedback: null,
        driftDetails: {
          reason: `Endpoint ${method} ${path} not found in OpenAPI specification`,
        },
      };
    }

    const schema = extractRequestSchema(parsedSpec, method.toUpperCase(), matchResult.path);

    let status: 'stable' | 'repaired' | 'blocked' = 'stable';
    let sanitizedBody = requestBody;
    let driftDetails: any = null;
    let feedback: any = null;

    if (schema) {
      const validation = validateRequest(requestBody, schema);

      if (!validation.isValid) {
        // Attempt repair
        const schemaFields = extractSchemaFields(schema);
        const repairStart = Date.now();
        const repairResult = repairService.repairRequestBody(requestBody, schema, schemaFields);
        const repairTime = Date.now() - repairStart;

        if (repairResult.success) {
          const revalidation = validateRequest(repairResult.repairedBody, schema);
          if (revalidation.isValid) {
            status = 'repaired';
            sanitizedBody = repairResult.repairedBody;
            const confidence = repairService.calculateRepairConfidence(repairResult.repairs);
            driftDetails = {
              originalErrors: validation.errors,
              repairActions: repairResult.repairs,
              confidence,
              repairTimeMs: repairTime,
            };
            feedback = feedbackGeneratorService.generateFeedback(
              repairResult.repairs,
              specJson,
              method,
              matchResult.path,
              confidence
            );
          } else {
            // Repair still invalid — block
            const overhead = Date.now() - startTime;
            return {
              status: 'blocked',
              originalBody: requestBody,
              sanitizedBody: repairResult.repairedBody,
              overheadMs: overhead,
              latencyTotalMs: overhead,
              response: null,
              feedback: null,
              driftDetails: {
                originalErrors: validation.errors,
                repairActions: repairResult.repairs,
                revalidationErrors: revalidation.errors,
                reason: 'Auto-repair attempted but validation still fails',
              },
            };
          }
        } else {
          // No repair possible — block
          const overhead = Date.now() - startTime;
          return {
            status: 'blocked',
            originalBody: requestBody,
            sanitizedBody: null,
            overheadMs: overhead,
            latencyTotalMs: overhead,
            response: null,
            feedback: null,
            driftDetails: {
              originalErrors: validation.errors,
              repairActions: repairResult.repairs,
              reason: 'Auto-repair failed',
            },
          };
        }
      }
    }

    // 4. Forward to target
    const forwardStart = Date.now();
    try {
      const targetUrl = `${baseUrl.replace(/\/$/, '')}${path}`;
      const forwardHeaders: Record<string, string> = { ...headers };
      delete forwardHeaders['content-length'];
      delete forwardHeaders['connection'];
      delete forwardHeaders['host'];

      if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && !forwardHeaders['content-type']) {
        forwardHeaders['content-type'] = 'application/json';
      }

      const axiosConfig: AxiosRequestConfig = {
        method: method as any,
        url: targetUrl,
        headers: forwardHeaders,
        validateStatus: () => true,
        timeout: 30000,
        maxRedirects: 5,
      };

      if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        axiosConfig.data = sanitizedBody;
      }

      const response = await axios(axiosConfig);
      const forwardTime = Date.now() - forwardStart;
      const totalTime = Date.now() - startTime;
      const overheadMs = totalTime - forwardTime;

      return {
        status,
        originalBody: requestBody,
        sanitizedBody: status === 'repaired' ? sanitizedBody : null,
        driftDetails,
        overheadMs,
        latencyTotalMs: totalTime,
        feedback,
        response: {
          status: response.status,
          body: response.data,
          headers: response.headers as Record<string, string>,
        },
      };
    } catch (error) {
      const overhead = Date.now() - startTime;
      return {
        status: 'blocked',
        originalBody: requestBody,
        sanitizedBody: null,
        overheadMs: overhead,
        latencyTotalMs: overhead,
        response: null,
        feedback: null,
        driftDetails: {
          reason: 'Failed to forward request to target API',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}

export const publicProxyService = new PublicProxyService();
