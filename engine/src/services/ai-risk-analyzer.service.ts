import type { OpenAPIV3 } from 'openapi-types';

/**
 * AI Risk Analyzer Service
 *
 * Intelligently analyzes OpenAPI specifications to identify endpoints and fields
 * that are prone to AI hallucinations. Based on real-world patterns from AI agents.
 */

export interface AIRiskField {
  fieldName: string;
  fieldPath: string;
  riskType: 'date' | 'time' | 'datetime' | 'phone' | 'currency' | 'boolean' | 'enum' | 'type_coercion' | 'field_name' | 'unit_conversion';
  originalType: string;
  constraints?: any;
  enumValues?: string[];
}

export interface RepairExample {
  type: string;
  field?: string;
  from: string;
  to: string;
}

export interface EndpointAnalysis {
  method: string;
  path: string;
  risk: 'high' | 'med' | 'low' | 'safe';
  riskScore: number;
  aiProneFields: string[];
  repairs: RepairExample[];
  summary?: string;
}

export interface SpecAnalysis {
  url: string;
  agentName: string;
  headline: string;
  domain: string;
  pills: Array<{ label: string; cls: string }>;
  endpoints: EndpointAnalysis[];
  traffic: Array<any>;
}

class AIRiskAnalyzerService {
  /**
   * Analyze an OpenAPI spec and identify AI-prone endpoints
   */
  analyzeSpec(spec: any, specName?: string): SpecAnalysis {
    const info = spec.info || {};
    const title = info.title || specName || 'API';
    const serverUrl = this.extractServerUrl(spec);

    // Analyze all endpoints
    const endpoints: EndpointAnalysis[] = [];
    const paths = spec.paths || {};

    for (const [path, pathItem] of Object.entries(paths)) {
      const methods = ['get', 'post', 'put', 'patch', 'delete'];

      for (const method of methods) {
        const operation = (pathItem as any)[method];
        if (!operation) continue;

        const analysis = this.analyzeEndpoint(method, path, operation, spec);
        endpoints.push(analysis);
      }
    }

    // Calculate summary statistics
    const highCount = endpoints.filter(e => e.risk === 'high').length;
    const medCount = endpoints.filter(e => e.risk === 'med').length;
    const lowCount = endpoints.filter(e => e.risk === 'low').length;
    const safeCount = endpoints.filter(e => e.risk === 'safe').length;

    const totalRisks = endpoints.reduce((sum, e) => sum + e.repairs.length, 0);

    const pills = [];
    if (highCount) pills.push({ label: `${highCount} High AI risk`, cls: 'high' });
    if (medCount) pills.push({ label: `${medCount} Med AI risk`, cls: 'med' });
    if (lowCount) pills.push({ label: `${lowCount} Low AI risk`, cls: 'low' });
    if (safeCount) pills.push({ label: `${safeCount} AI-safe`, cls: 'safe' });

    // Generate simulated traffic
    const traffic = this.generateTrafficSimulation(endpoints);

    return {
      url: serverUrl,
      agentName: this.extractAgentName(title, serverUrl),
      headline: `${totalRisks} places where AI-generated requests will break`,
      domain: `${serverUrl} — ${endpoints.length} endpoints scanned`,
      pills,
      endpoints,
      traffic,
    };
  }

  /**
   * Analyze a single endpoint for AI risk
   */
  private analyzeEndpoint(
    method: string,
    path: string,
    operation: any,
    spec: any
  ): EndpointAnalysis {
    const methodUpper = method.toUpperCase();
    const isWriteOperation = ['POST', 'PUT', 'PATCH'].includes(methodUpper);

    // For GET/DELETE, check only path parameters
    if (!isWriteOperation) {
      const pathParams = this.extractPathParameters(path, operation);
      const pathRisks = this.analyzeParameters(pathParams);

      if (pathRisks.length === 0) {
        return {
          method: methodUpper,
          path,
          risk: 'safe',
          riskScore: 0,
          aiProneFields: [],
          repairs: [],
        };
      }

      return {
        method: methodUpper,
        path,
        risk: 'low',
        riskScore: 0.3,
        aiProneFields: pathRisks.map(r => r.fieldName),
        repairs: this.generateRepairExamples(pathRisks, path),
      };
    }

    // Analyze request body for write operations
    const requestBody = operation.requestBody;
    if (!requestBody) {
      return {
        method: methodUpper,
        path,
        risk: 'safe',
        riskScore: 0,
        aiProneFields: [],
        repairs: [],
      };
    }

    const schema = this.extractSchema(requestBody, spec);
    const aiProneFields = this.analyzeSchema(schema, spec);

    // Calculate risk score
    const riskScore = this.calculateRiskScore(aiProneFields, methodUpper);
    const riskLevel = this.determineRiskLevel(riskScore);

    // Generate repair examples
    const repairs = this.generateRepairExamples(aiProneFields, path);

    return {
      method: methodUpper,
      path,
      risk: riskLevel,
      riskScore,
      aiProneFields: aiProneFields.map(f => f.fieldName),
      repairs,
    };
  }

  /**
   * Extract and analyze schema to find AI-prone fields
   */
  private analyzeSchema(schema: any, spec: any, path: string = ''): AIRiskField[] {
    if (!schema) return [];

    const risks: AIRiskField[] = [];

    // Handle $ref
    if (schema.$ref) {
      const resolvedSchema = this.resolveRef(schema.$ref, spec);
      return this.analyzeSchema(resolvedSchema, spec, path);
    }

    // Handle allOf, oneOf, anyOf
    if (schema.allOf) {
      for (const subSchema of schema.allOf) {
        risks.push(...this.analyzeSchema(subSchema, spec, path));
      }
      return risks;
    }

    // Analyze object properties
    if (schema.type === 'object' && schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const fieldPath = path ? `${path}.${propName}` : propName;
        const fieldRisks = this.analyzeField(propName, propSchema as any, spec, fieldPath);
        risks.push(...fieldRisks);

        // Recursively analyze nested objects
        if ((propSchema as any).type === 'object') {
          risks.push(...this.analyzeSchema(propSchema, spec, fieldPath));
        }
      }
    }

    return risks;
  }

  /**
   * Analyze a single field for AI risk patterns
   */
  private analyzeField(
    fieldName: string,
    fieldSchema: any,
    spec: any,
    fieldPath: string
  ): AIRiskField[] {
    const risks: AIRiskField[] = [];

    // Safety check - return empty if fieldName is invalid
    if (!fieldName || typeof fieldName !== 'string') {
      return risks;
    }

    // Resolve $ref if present
    if (fieldSchema.$ref) {
      fieldSchema = this.resolveRef(fieldSchema.$ref, spec);
    }

    const type = fieldSchema.type;
    const format = fieldSchema.format;
    const pattern = fieldSchema.pattern;
    const enumValues = fieldSchema.enum;

    const fieldLower = fieldName.toLowerCase();

    // 1. Date fields
    if (format === 'date' || format === 'date-time' ||
        fieldLower.includes('date') || fieldLower.includes('datetime')) {
      risks.push({
        fieldName,
        fieldPath,
        riskType: format === 'date-time' ? 'datetime' : 'date',
        originalType: type || 'string',
        constraints: { format },
      });
    }

    // 2. Time fields
    if (fieldLower.includes('time') && !fieldLower.includes('datetime') &&
        (type === 'string' || !type)) {
      risks.push({
        fieldName,
        fieldPath,
        riskType: 'time',
        originalType: type || 'string',
        constraints: { pattern },
      });
    }

    // 3. Phone number fields
    if (fieldLower.includes('phone') || fieldLower.includes('mobile') ||
        fieldLower.includes('tel') || (pattern && pattern.includes('+'))) {
      risks.push({
        fieldName,
        fieldPath,
        riskType: 'phone',
        originalType: type || 'string',
        constraints: { pattern },
      });
    }

    // 4. Currency/Amount fields (high risk if in pence/cents)
    if ((fieldLower.includes('amount') || fieldLower.includes('price') ||
         fieldLower.includes('cost') || fieldLower.includes('pence') ||
         fieldLower.includes('cents')) && type === 'integer') {
      risks.push({
        fieldName,
        fieldPath,
        riskType: 'currency',
        originalType: type,
        constraints: { minimum: fieldSchema.minimum, maximum: fieldSchema.maximum },
      });
    }

    // 5. Boolean fields with natural language context
    if (type === 'boolean' ||
        (fieldLower.includes('is') || fieldLower.includes('has') ||
         fieldLower.includes('requires') || fieldLower.includes('send'))) {
      risks.push({
        fieldName,
        fieldPath,
        riskType: 'boolean',
        originalType: type || 'boolean',
      });
    }

    // 6. Enum fields (natural language mapping risk)
    if (enumValues && Array.isArray(enumValues)) {
      risks.push({
        fieldName,
        fieldPath,
        riskType: 'enum',
        originalType: type || 'string',
        enumValues,
      });
    }

    // 7. Type coercion risk (string type on numeric-sounding fields)
    if (type === 'string' &&
        (fieldLower.includes('count') || fieldLower.includes('size') ||
         fieldLower.includes('number') || fieldLower.includes('quantity') ||
         fieldLower.includes('duration') || fieldLower.includes('age'))) {
      risks.push({
        fieldName,
        fieldPath,
        riskType: 'type_coercion',
        originalType: type,
      });
    }

    // 8. Integer fields that might receive strings
    if (type === 'integer' &&
        (fieldLower.includes('party') || fieldLower.includes('guest') ||
         fieldLower.includes('count') || fieldLower.includes('number') ||
         fieldLower.includes('quantity'))) {
      risks.push({
        fieldName,
        fieldPath,
        riskType: 'type_coercion',
        originalType: type,
      });
    }

    // 9. Unit conversion fields (height, weight, dosage)
    if (fieldLower.includes('height') || fieldLower.includes('weight') ||
        fieldLower.includes('dosage') || fieldLower.includes('coverage') ||
        fieldLower.includes('temperature')) {
      risks.push({
        fieldName,
        fieldPath,
        riskType: 'unit_conversion',
        originalType: type || 'number',
        constraints: fieldSchema,
      });
    }

    // 10. Field name variations (camelCase vs snake_case)
    if (fieldName.includes('_') || /[A-Z]/.test(fieldName)) {
      risks.push({
        fieldName,
        fieldPath,
        riskType: 'field_name',
        originalType: type || 'unknown',
      });
    }

    return risks;
  }

  /**
   * Calculate risk score based on AI-prone fields and operation type
   */
  private calculateRiskScore(fields: AIRiskField[], method: string): number {
    if (fields.length === 0) return 0;

    // Weight different risk types
    const weights: Record<string, number> = {
      date: 0.15,
      datetime: 0.15,
      time: 0.12,
      phone: 0.12,
      currency: 0.18, // High risk - money
      boolean: 0.08,
      enum: 0.12,
      type_coercion: 0.10,
      field_name: 0.06,
      unit_conversion: 0.18, // High risk - medical/financial
    };

    // Calculate weighted score
    const fieldScore = fields.reduce((sum, field) => {
      return sum + (weights[field.riskType] || 0.1);
    }, 0);

    // Bonus for write operations
    const methodBonus = ['POST', 'PUT', 'PATCH'].includes(method) ? 0.2 : 0;

    // Complexity factor (more fields = higher risk)
    const complexityFactor = Math.min(fields.length / 10, 0.3);

    return Math.min(fieldScore + methodBonus + complexityFactor, 1.0);
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): 'high' | 'med' | 'low' | 'safe' {
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'med';
    if (score >= 0.15) return 'low';
    return 'safe';
  }

  /**
   * Generate realistic repair examples based on AI-prone fields
   */
  private generateRepairExamples(fields: AIRiskField[], path: string): RepairExample[] {
    const repairs: RepairExample[] = [];

    // Limit to top 5 most critical repairs for display
    const sortedFields = [...fields].sort((a, b) => {
      const priorities: Record<string, number> = {
        currency: 5,
        unit_conversion: 5,
        datetime: 4,
        date: 4,
        phone: 3,
        enum: 3,
        type_coercion: 2,
        time: 2,
        boolean: 1,
        field_name: 1,
      };
      return (priorities[b.riskType] || 0) - (priorities[a.riskType] || 0);
    }).slice(0, 5);

    for (const field of sortedFields) {
      const examples = this.getRepairExamplesForField(field, path);
      repairs.push(...examples);
    }

    return repairs.slice(0, 6); // Max 6 repairs per endpoint for display
  }

  /**
   * Get specific repair examples for a field type
   */
  private getRepairExamplesForField(field: AIRiskField, path: string): RepairExample[] {
    const examples: RepairExample[] = [];

    switch (field.riskType) {
      case 'date':
        examples.push({
          type: 'Date normalisation',
          field: field.fieldName,
          from: '"next Friday"',
          to: '"2026-04-03"',
        });
        if (Math.random() > 0.5) {
          examples.push({
            type: 'Date normalisation',
            field: field.fieldName,
            from: '"tomorrow"',
            to: '"2026-03-31"',
          });
        }
        break;

      case 'datetime':
        examples.push({
          type: 'DateTime normalisation',
          field: field.fieldName,
          from: '"tomorrow at 9:30am"',
          to: '"2026-03-31T09:30:00Z"',
        });
        break;

      case 'time':
        examples.push({
          type: 'Time normalisation',
          field: field.fieldName,
          from: '"7:30pm"',
          to: '"19:30"',
        });
        break;

      case 'phone':
        examples.push({
          type: 'Phone normalisation',
          field: field.fieldName,
          from: '"07700900123"',
          to: '"+447700900123"',
        });
        break;

      case 'currency':
        if (field.fieldName.toLowerCase().includes('pence') ||
            field.fieldName.toLowerCase().includes('cents')) {
          examples.push({
            type: 'Unit conversion',
            field: field.fieldName,
            from: '"£50"',
            to: '5000',
          });
          examples.push({
            type: 'Type coercion',
            field: field.fieldName,
            from: '"50.00" (string)',
            to: '5000 (integer)',
          });
        } else {
          examples.push({
            type: 'Type coercion',
            field: field.fieldName,
            from: '"99.99" (string)',
            to: '99.99 (float)',
          });
        }
        break;

      case 'boolean':
        examples.push({
          type: 'Boolean coercion',
          field: field.fieldName,
          from: '"yes"',
          to: 'true',
        });
        break;

      case 'enum':
        if (field.enumValues && field.enumValues.length > 0) {
          const enumVal = field.enumValues[0];
          examples.push({
            type: 'Enum normalisation',
            field: field.fieldName,
            from: `"${this.generateNaturalLanguageForEnum(enumVal)}"`,
            to: `"${enumVal}"`,
          });
        }
        break;

      case 'type_coercion':
        if (field.originalType === 'integer') {
          examples.push({
            type: 'Type coercion',
            field: field.fieldName,
            from: '"Ten"',
            to: '10',
          });
          examples.push({
            type: 'Type coercion',
            field: field.fieldName,
            from: '"5" (string)',
            to: '5 (integer)',
          });
        }
        break;

      case 'unit_conversion':
        if (field.fieldName.toLowerCase().includes('height')) {
          examples.push({
            type: 'Unit conversion',
            field: field.fieldName,
            from: '"5ft 10"',
            to: '178',
          });
        } else if (field.fieldName.toLowerCase().includes('weight')) {
          examples.push({
            type: 'Unit conversion',
            field: field.fieldName,
            from: '"11 stone"',
            to: '69.9',
          });
        } else if (field.fieldName.toLowerCase().includes('dosage')) {
          examples.push({
            type: 'Unit conversion',
            field: field.fieldName,
            from: '"0.5g"',
            to: '500',
          });
          examples.push({
            type: 'Unit strip',
            field: field.fieldName,
            from: '"500mg"',
            to: '500',
          });
        } else if (field.fieldName.toLowerCase().includes('temperature')) {
          examples.push({
            type: 'Unit strip',
            field: field.fieldName,
            from: '"38.5°C"',
            to: '38.5',
          });
        }
        break;

      case 'field_name':
        const alternativeName = this.generateAlternativeFieldName(field.fieldName);
        examples.push({
          type: 'Field rename',
          from: `"${alternativeName}"`,
          to: `"${field.fieldName}"`,
        });
        break;
    }

    return examples;
  }

  /**
   * Generate natural language version of enum value
   */
  private generateNaturalLanguageForEnum(enumValue: string): string {
    const mapping: Record<string, string> = {
      'monthly': 'every month',
      'annually': 'per year',
      'Faster_Payments': 'faster payments',
      'gp_consultation': 'GP visit',
      'twice_daily': 'twice a day',
      'oral': 'by mouth',
      'tablet': 'pill',
      'non_smoker': 'non-smoker',
      'ex_smoker': 'gave up years ago',
      'critical_illness': 'critical illness',
    };

    return mapping[enumValue] || enumValue.replace(/_/g, ' ');
  }

  /**
   * Generate alternative field name (AI hallucination)
   */
  private generateAlternativeFieldName(fieldName: string): string {
    const alternatives: Record<string, string> = {
      'partySize': 'num_people',
      'contactPhone': 'phone',
      'contactEmail': 'email',
      'locationId': 'location',
      'requestedDate': 'booking_date',
      'amountPence': 'amount',
      'debitAccountId': 'from_account',
      'creditSortCode': 'to_sort_code',
      'paymentReference': 'reference',
    };

    return alternatives[fieldName] || fieldName.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  /**
   * Generate simulated traffic based on endpoints
   */
  private generateTrafficSimulation(endpoints: EndpointAnalysis[]): any[] {
    const traffic: any[] = [];
    const riskyEndpoints = endpoints.filter(e => e.repairs.length > 0).slice(0, 6);

    const statuses = ['repaired', 'repaired', 'blocked', 'passed', 'repaired', 'blocked'];
    const times = ['2:26:55', '2:26:50', '2:26:46', '2:26:35', '2:25:04', '2:24:52'];

    riskyEndpoints.forEach((endpoint, i) => {
      const status = statuses[i % statuses.length];
      const time = times[i] || `2:2${5 - Math.floor(i / 2)}:${55 - (i * 5)}`;

      const detail = status === 'passed' ? [] :
        status === 'blocked' ? [{ from: 'Security threat detected', to: 'Blocked — invalid request' }] :
        endpoint.repairs.slice(0, 2).map(r => ({ from: r.from, to: r.to }));

      traffic.push({
        time,
        method: endpoint.method,
        endpoint: endpoint.path.length > 20 ? endpoint.path.slice(0, 18) + '..' : endpoint.path,
        status,
        detail,
      });
    });

    return traffic;
  }

  /**
   * Extract path parameters
   */
  private extractPathParameters(path: string, operation: any): AIRiskField[] {
    const params = operation.parameters || [];
    const pathParams = params.filter((p: any) => p.in === 'path');
    return this.analyzeParameters(pathParams);
  }

  /**
   * Analyze parameters for AI risk
   */
  private analyzeParameters(params: any[]): AIRiskField[] {
    const risks: AIRiskField[] = [];

    for (const param of params) {
      const schema = param.schema || {};
      const fieldRisks = this.analyzeField(param.name, schema, {}, param.name);
      risks.push(...fieldRisks);
    }

    return risks;
  }

  /**
   * Extract request body schema
   */
  private extractSchema(requestBody: any, spec: any): any {
    if (!requestBody.content) return null;

    const jsonContent = requestBody.content['application/json'];
    if (!jsonContent) return null;

    return jsonContent.schema;
  }

  /**
   * Resolve $ref references in the spec
   */
  private resolveRef(ref: string, spec: any): any {
    if (!ref.startsWith('#/')) return {};

    const path = ref.slice(2).split('/');
    let current = spec;

    for (const segment of path) {
      if (!current[segment]) return {};
      current = current[segment];
    }

    return current;
  }

  /**
   * Extract server URL from spec
   */
  private extractServerUrl(spec: any): string {
    if (spec.servers && spec.servers[0]) {
      const url = spec.servers[0].url;
      return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    }
    return 'api.example.com';
  }

  /**
   * Extract agent name from title or URL
   */
  private extractAgentName(title: string, url: string): string {
    // Extract from URL
    const urlParts = url.split('.');
    if (urlParts.length > 1) {
      return urlParts[0];
    }

    // Extract from title
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
  }
}

export const aiRiskAnalyzerService = new AIRiskAnalyzerService();
