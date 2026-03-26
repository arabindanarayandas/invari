/**
 * OpenAPI Spec Analyzer
 * Parses OpenAPI specs and identifies AI-prone issues
 */

import yaml from 'js-yaml';

/**
 * Analyzes an OpenAPI specification and identifies potential issues
 * for AI-generated API requests
 *
 * @param {Object|string} spec - OpenAPI 3.x specification object or raw YAML/JSON string
 * @returns {Object} Analysis results with endpoints and risk categorization
 */
export function analyzeOpenAPISpec(spec) {
  // Parse spec if it's a string (YAML or JSON)
  let parsedSpec = spec;
  if (typeof spec === 'string') {
    try {
      // Try YAML first (also handles JSON)
      parsedSpec = yaml.load(spec);
    } catch (error) {
      console.error('Failed to parse spec:', error);
      throw new Error('Invalid OpenAPI specification format');
    }
  }

  const endpoints = [];
  const paths = parsedSpec.paths || {};

  // Iterate through all paths and methods
  Object.entries(paths).forEach(([path, pathItem]) => {
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

    methods.forEach(method => {
      if (pathItem[method]) {
        const operation = pathItem[method];
        const endpoint = {
          path,
          method: method.toUpperCase(),
          summary: operation.summary || '',
          description: operation.description || '',
          aiRisks: [],
          fields: []
        };

        // Analyze parameters (query, path, header)
        if (operation.parameters) {
          operation.parameters.forEach(param => {
            const fieldRisks = analyzeParameter(param);
            endpoint.fields.push({
              name: param.name,
              location: param.in,
              type: param.schema?.type || 'unknown',
              required: param.required || false,
              risks: fieldRisks
            });
            endpoint.aiRisks.push(...fieldRisks);
          });
        }

        // Analyze request body
        if (operation.requestBody) {
          const bodyRisks = analyzeRequestBody(operation.requestBody);
          endpoint.aiRisks.push(...bodyRisks.risks);
          endpoint.fields.push(...bodyRisks.fields);
        }

        // Remove duplicate risks
        endpoint.aiRisks = [...new Set(endpoint.aiRisks)];

        endpoints.push(endpoint);
      }
    });
  });

  // Categorize endpoints by risk level
  const stats = {
    total: endpoints.length,
    safe: endpoints.filter(e => e.aiRisks.length === 0).length,
    lowRisk: endpoints.filter(e => e.aiRisks.length > 0 && e.aiRisks.length <= 2).length,
    highRisk: endpoints.filter(e => e.aiRisks.length > 2).length
  };

  return {
    endpoints,
    stats,
    apiInfo: {
      title: parsedSpec.info?.title || 'API',
      version: parsedSpec.info?.version || '1.0.0',
      description: parsedSpec.info?.description || ''
    }
  };
}

/**
 * Analyzes a parameter for AI-prone issues
 * @param {Object} param - OpenAPI parameter object
 * @returns {Array<Object>} Array of risk objects
 */
function analyzeParameter(param) {
  const risks = [];
  const schema = param.schema || {};

  // Check for snake_case (AI models often use camelCase)
  if (param.name.includes('_')) {
    risks.push({
      type: 'naming',
      severity: 'medium',
      message: `Uses snake_case: "${param.name}"`,
      suggestion: `AI models may send camelCase instead`,
      field: param.name
    });
  }

  // Check for date/time fields (formatting issues)
  if (schema.type === 'string' && (schema.format === 'date' || schema.format === 'date-time')) {
    risks.push({
      type: 'date-format',
      severity: 'high',
      message: `Date field without strict format`,
      suggestion: `AI may send various date formats (ISO, Unix, relative)`,
      field: param.name
    });
  }

  // Check for enums (LLMs may hallucinate values)
  if (schema.enum && schema.enum.length > 0) {
    risks.push({
      type: 'enum',
      severity: 'high',
      message: `Enum with ${schema.enum.length} values`,
      suggestion: `AI may generate invalid enum values`,
      field: param.name,
      validValues: schema.enum
    });
  }

  // Check for required number fields (type coercion issues)
  if (param.required && schema.type === 'number' || schema.type === 'integer') {
    risks.push({
      type: 'type-coercion',
      severity: 'medium',
      message: `Required numeric field`,
      suggestion: `AI may send as string instead of number`,
      field: param.name
    });
  }

  return risks;
}

/**
 * Analyzes request body for AI-prone issues
 * @param {Object} requestBody - OpenAPI requestBody object
 * @returns {Object} Object with risks array and fields array
 */
function analyzeRequestBody(requestBody) {
  const risks = [];
  const fields = [];

  const content = requestBody.content || {};
  const jsonContent = content['application/json'];

  if (jsonContent && jsonContent.schema) {
    const schema = jsonContent.schema;

    // Handle schema references
    const properties = schema.properties || {};
    const required = schema.required || [];

    Object.entries(properties).forEach(([fieldName, fieldSchema]) => {
      const fieldRisks = [];

      // Check for snake_case
      if (fieldName.includes('_')) {
        const risk = {
          type: 'naming',
          severity: 'medium',
          message: `Uses snake_case: "${fieldName}"`,
          suggestion: `AI models may send camelCase instead`,
          field: fieldName
        };
        fieldRisks.push(risk);
        risks.push(risk);
      }

      // Check for date fields
      if (fieldSchema.type === 'string' && (fieldSchema.format === 'date' || fieldSchema.format === 'date-time')) {
        const risk = {
          type: 'date-format',
          severity: 'high',
          message: `Date field without strict format`,
          suggestion: `AI may send various date formats`,
          field: fieldName
        };
        fieldRisks.push(risk);
        risks.push(risk);
      }

      // Check for enums
      if (fieldSchema.enum) {
        const risk = {
          type: 'enum',
          severity: 'high',
          message: `Enum with ${fieldSchema.enum.length} values`,
          suggestion: `AI may generate invalid enum values`,
          field: fieldName,
          validValues: fieldSchema.enum
        };
        fieldRisks.push(risk);
        risks.push(risk);
      }

      // Check for required fields (missing field issues)
      if (required.includes(fieldName)) {
        const risk = {
          type: 'required',
          severity: 'high',
          message: `Required field`,
          suggestion: `AI may omit this field`,
          field: fieldName
        };
        fieldRisks.push(risk);
        risks.push(risk);
      }

      // Check for type coercion issues
      if ((fieldSchema.type === 'number' || fieldSchema.type === 'integer') && required.includes(fieldName)) {
        const risk = {
          type: 'type-coercion',
          severity: 'medium',
          message: `Required numeric field`,
          suggestion: `AI may send as string`,
          field: fieldName
        };
        fieldRisks.push(risk);
        risks.push(risk);
      }

      fields.push({
        name: fieldName,
        location: 'body',
        type: fieldSchema.type || 'object',
        required: required.includes(fieldName),
        risks: fieldRisks
      });
    });
  }

  return { risks, fields };
}
