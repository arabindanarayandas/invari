import { Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as YAML from 'yaml';
import { aiRiskAnalyzerService } from '../services/ai-risk-analyzer.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Demo Controller
 *
 * Serves demo OpenAPI specs and provides AI risk analysis
 * Public endpoints - no authentication required
 */
export class DemoController {
  private demoSpecsPath: string;
  private availableSpecs: Array<{
    name: string;
    displayName: string;
    filename: string;
    domain: string;
  }>;

  constructor() {
    // Path to demo-specs directory (relative to engine/dist/controllers after compilation)
    this.demoSpecsPath = path.join(__dirname, '../../demo-specs');

    // Define available demo specs
    this.availableSpecs = [
      {
        name: 'booking',
        displayName: 'Wellness Partners Booking API',
        filename: 'booking-api-spec.yaml',
        domain: 'hospitality',
      },
      {
        name: 'banking',
        displayName: 'NexBank Core Banking API',
        filename: 'banking-api-spec.yaml',
        domain: 'financial',
      },
      {
        name: 'medical',
        displayName: 'MedCore Clinical API',
        filename: 'medical-api-spec.yaml',
        domain: 'healthcare',
      },
      {
        name: 'insurance',
        displayName: 'ProtectCore Insurance API',
        filename: 'insurance-api-spec.yaml',
        domain: 'insurance',
      },
    ];
  }

  /**
   * GET /api/demo/specs
   * Get list of available demo specs (lightweight - names only)
   */
  async getDemoSpecs(req: Request, res: Response) {
    try {
      // Return lightweight metadata only
      const specs = this.availableSpecs.map(spec => ({
        name: spec.name,
        displayName: spec.displayName,
        domain: spec.domain,
      }));

      return res.status(200).json({
        success: true,
        data: specs,
      });
    } catch (error) {
      console.error('Get demo specs error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch demo specs',
      });
    }
  }

  /**
   * POST /api/demo/analyze
   * Analyze an OpenAPI spec (by name or content) and return AI risk analysis
   */
  async analyzeSpec(req: Request, res: Response) {
    try {
      const { specName, specContent } = req.body;

      let spec: any;
      let usedSpecName = specName;

      // Load spec from demo library or use provided content
      if (specName) {
        const specInfo = this.availableSpecs.find(s => s.name === specName);
        if (!specInfo) {
          return res.status(404).json({
            success: false,
            error: `Demo spec '${specName}' not found`,
          });
        }

        const specPath = path.join(this.demoSpecsPath, specInfo.filename);
        const specText = await fs.readFile(specPath, 'utf-8');
        spec = YAML.parse(specText);
        usedSpecName = specInfo.displayName;
      } else if (specContent) {
        // Parse provided spec content
        try {
          // Try JSON first
          spec = JSON.parse(specContent);
        } catch {
          // Try YAML
          spec = YAML.parse(specContent);
        }
      } else {
        return res.status(400).json({
          success: false,
          error: 'Either specName or specContent is required',
        });
      }

      // Validate it's an OpenAPI spec
      if (!spec.openapi && !spec.swagger) {
        return res.status(400).json({
          success: false,
          error: 'Invalid OpenAPI specification',
        });
      }

      // Perform AI risk analysis
      const analysis = aiRiskAnalyzerService.analyzeSpec(spec, usedSpecName);

      return res.status(200).json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      console.error('Analyze spec error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to analyze spec',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/demo/specs/:name
   * Get full spec content by name (for advanced use cases)
   */
  async getSpecByName(req: Request, res: Response) {
    try {
      const { name } = req.params;

      const specInfo = this.availableSpecs.find(s => s.name === name);
      if (!specInfo) {
        return res.status(404).json({
          success: false,
          error: `Demo spec '${name}' not found`,
        });
      }

      const specPath = path.join(this.demoSpecsPath, specInfo.filename);
      const specText = await fs.readFile(specPath, 'utf-8');
      const spec = YAML.parse(specText);

      return res.status(200).json({
        success: true,
        data: {
          name: specInfo.name,
          displayName: specInfo.displayName,
          domain: specInfo.domain,
          spec,
        },
      });
    } catch (error) {
      console.error('Get spec by name error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch spec',
      });
    }
  }

  /**
   * POST /api/demo/validate
   * Validate and repair a request body against spec (no proxy forwarding)
   * Only supports POST and PATCH methods
   */
  async validateRequest(req: Request, res: Response) {
    try {
      const { spec, method, path: endpointPath, requestBody } = req.body;

      // Validate required fields
      if (!spec || typeof spec !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'spec is required and must be an object',
        });
      }

      if (!method || typeof method !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'method is required',
        });
      }

      if (!endpointPath || typeof endpointPath !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'path is required',
        });
      }

      // Only allow POST and PATCH
      const normalizedMethod = method.toUpperCase();
      if (normalizedMethod !== 'POST' && normalizedMethod !== 'PATCH') {
        return res.status(400).json({
          success: false,
          error: 'Only POST and PATCH methods are supported for validation',
        });
      }

      // Use publicProxyService to validate and repair (but skip forwarding)
      const { publicProxyService } = await import('../services/public-proxy.service.js');

      // Create a mock result without forwarding
      const startTime = Date.now();
      const { securityService } = await import('../services/security.service.js');
      const { parseOpenApiSpec, extractRequestSchema, validateRequest: validateReq, extractSchemaFields, findMatchingEndpoint } = await import('../utils/openapi-validator.js');
      const { repairService } = await import('../services/repair.service.js');
      const { feedbackGeneratorService } = await import('../services/feedback-generator.service.js');

      // 1. Security scan
      const threats = securityService.scanRequestBody(requestBody);
      if (threats.length > 0) {
        const overhead = Date.now() - startTime;
        return res.status(200).json({
          success: true,
          data: {
            status: 'blocked',
            originalBody: requestBody,
            sanitizedBody: null,
            overheadMs: overhead,
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
          },
        });
      }

      // 2. Parse spec
      let parsedSpec: any;
      try {
        parsedSpec = await parseOpenApiSpec(spec);
      } catch (err) {
        const overhead = Date.now() - startTime;
        return res.status(200).json({
          success: true,
          data: {
            status: 'blocked',
            originalBody: requestBody,
            sanitizedBody: null,
            overheadMs: overhead,
            feedback: null,
            driftDetails: {
              reason: 'Invalid OpenAPI specification',
              error: err instanceof Error ? err.message : 'Parse error',
            },
          },
        });
      }

      // 3. Find matching endpoint + validate
      const matchResult = findMatchingEndpoint(parsedSpec, endpointPath, normalizedMethod);
      if (!matchResult) {
        const overhead = Date.now() - startTime;
        return res.status(200).json({
          success: true,
          data: {
            status: 'blocked',
            originalBody: requestBody,
            sanitizedBody: null,
            overheadMs: overhead,
            feedback: null,
            driftDetails: {
              reason: `Endpoint ${normalizedMethod} ${endpointPath} not found in OpenAPI specification`,
            },
          },
        });
      }

      const schema = extractRequestSchema(parsedSpec, normalizedMethod, matchResult.path);

      let status: 'stable' | 'repaired' | 'blocked' = 'stable';
      let sanitizedBody = requestBody;
      let driftDetails: any = null;
      let feedback: any = null;

      if (schema) {
        const validation = validateReq(requestBody, schema);

        if (!validation.isValid) {
          // Attempt repair
          const schemaFields = extractSchemaFields(schema);
          const repairStart = Date.now();
          const repairResult = repairService.repairRequestBody(requestBody, schema, schemaFields);
          const repairTime = Date.now() - repairStart;

          if (repairResult.success) {
            const revalidation = validateReq(repairResult.repairedBody, schema);
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
                spec,
                normalizedMethod,
                matchResult.path,
                confidence
              );
            } else {
              // Repair still invalid — block
              const overhead = Date.now() - startTime;
              return res.status(200).json({
                success: true,
                data: {
                  status: 'blocked',
                  originalBody: requestBody,
                  sanitizedBody: repairResult.repairedBody,
                  overheadMs: overhead,
                  feedback: null,
                  driftDetails: {
                    originalErrors: validation.errors,
                    repairActions: repairResult.repairs,
                    revalidationErrors: revalidation.errors,
                    reason: 'Auto-repair attempted but validation still fails',
                  },
                },
              });
            }
          } else {
            // No repair possible — block
            const overhead = Date.now() - startTime;
            return res.status(200).json({
              success: true,
              data: {
                status: 'blocked',
                originalBody: requestBody,
                sanitizedBody: null,
                overheadMs: overhead,
                feedback: null,
                driftDetails: {
                  originalErrors: validation.errors,
                  repairActions: repairResult.repairs,
                  reason: 'Auto-repair failed',
                },
              },
            });
          }
        }
      }

      const overhead = Date.now() - startTime;

      return res.status(200).json({
        success: true,
        data: {
          status,
          originalBody: requestBody,
          sanitizedBody: status === 'repaired' ? sanitizedBody : null,
          driftDetails,
          overheadMs: overhead,
          feedback,
        },
      });
    } catch (error) {
      console.error('Validate request error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to validate request',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const demoController = new DemoController();
