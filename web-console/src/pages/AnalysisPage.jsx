import { useMemo, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import SpecResults from '../components/trial/SpecResults';
import apiClient from '../api/client';

/**
 * Tooltip component that shows immediately on hover
 * Uses fixed positioning to avoid modal overflow clipping
 * Automatically adjusts position to stay within viewport
 */
const Tooltip = ({ children, text, forceBottom = false, fullWidth = false }) => {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, align: 'center' });
  const buttonRef = useState(null)[0];

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipWidth = 350; // Approximate max width
    const viewportWidth = window.innerWidth;
    const padding = 16;

    let leftPos = rect.left + rect.width / 2;
    let align = 'center';

    // Check if tooltip would overflow on the right
    if (leftPos + tooltipWidth / 2 > viewportWidth - padding) {
      // Align to right edge of button
      leftPos = rect.right - padding;
      align = 'right';
    }
    // Check if tooltip would overflow on the left
    else if (leftPos - tooltipWidth / 2 < padding) {
      // Align to left edge of button
      leftPos = rect.left + padding;
      align = 'left';
    }

    if (forceBottom) {
      // Position below button
      setPosition({
        top: rect.bottom + 8,
        left: leftPos,
        align
      });
    } else {
      // Position above button
      setPosition({
        top: rect.top - 8,
        left: leftPos,
        align
      });
    }

    setShow(true);
  };

  const handleMouseLeave = () => {
    setShow(false);
  };

  const getTransform = () => {
    if (position.align === 'right') return 'translateX(-100%)';
    if (position.align === 'left') return 'translateX(0)';
    return 'translateX(-50%)';
  };

  const getArrowPosition = () => {
    if (position.align === 'right') return 'right-4';
    if (position.align === 'left') return 'left-4';
    return 'left-1/2 -translate-x-1/2';
  };

  return (
    <>
      <div
        className={`${fullWidth ? 'w-full' : 'inline-block'}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        ref={buttonRef}
      >
        {children}
      </div>
      {show && (
        <div
          className="fixed px-3 py-1.5 bg-slate-900 text-white text-xs rounded shadow-lg z-[9999] pointer-events-none max-w-[350px]"
          style={{
            top: forceBottom ? `${position.top}px` : 'auto',
            bottom: forceBottom ? 'auto' : `${window.innerHeight - position.top}px`,
            left: `${position.left}px`,
            transform: getTransform()
          }}
        >
          {text}
          <div className={`absolute ${getArrowPosition()} border-4 border-transparent ${
            forceBottom ? 'bottom-full border-b-slate-900' : 'top-full border-t-slate-900'
          }`}></div>
        </div>
      )}
    </>
  );
};

/**
 * Infer field type from repair types
 */
const inferTypeFromRepairs = (repairs) => {
  if (!repairs || repairs.length === 0) return 'string';

  for (const repair of repairs) {
    if (repair.type === 'date' || repair.type === 'datetime') return 'date';
    if (repair.type === 'time') return 'time';
    if (repair.type === 'phone') return 'string';
    if (repair.type === 'currency') return 'number';
    if (repair.type === 'boolean') return 'boolean';
    if (repair.type === 'enum') return 'enum';
    if (repair.type === 'type_coercion') return 'number';
    if (repair.type === 'unit_conversion') return 'number';
  }

  return 'string';
};

/**
 * Transform server analysis format to SpecResults format
 */
const transformServerAnalysis = (serverData) => {
  const endpoints = serverData.endpoints.map(ep => {
    // Transform repairs to aiRisks format
    const aiRisks = ep.repairs.map(repair => ({
      type: repair.type,
      severity: ep.risk === 'high' ? 'high' : ep.risk === 'med' ? 'medium' : 'low',
      message: `${repair.type}: ${repair.field}`,
      suggestion: `Invari auto-repairs from "${repair.from}" to "${repair.to}"`,
      field: repair.field
    }));

    // Create a map of field risks by field name to avoid duplicates
    const fieldRisksMap = {};
    ep.repairs.forEach(repair => {
      if (!fieldRisksMap[repair.field]) {
        fieldRisksMap[repair.field] = [];
      }
      fieldRisksMap[repair.field].push({
        type: repair.type,
        severity: ep.risk === 'high' ? 'high' : ep.risk === 'med' ? 'medium' : 'low',
        message: `${repair.type}: ${repair.field}`,
        suggestion: `Invari auto-repairs from "${repair.from}" to "${repair.to}"`,
        field: repair.field
      });
    });

    // Extract unique fields with their types from repairs
    const fields = Object.keys(fieldRisksMap).map(fieldName => ({
      name: fieldName,
      location: 'body',
      type: inferTypeFromRepairs(fieldRisksMap[fieldName]),
      required: false,
      risks: fieldRisksMap[fieldName]
    }));

    return {
      path: ep.path,
      method: ep.method,
      summary: '',
      description: '',
      aiRisks,
      fields
    };
  });

  // Calculate stats
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
      title: serverData.agentName || serverData.url || 'API',
      version: '1.0.0',
      description: serverData.headline || ''
    }
  };
};

/**
 * Analysis Page - OpenAPI Spec Analysis Results
 * Shows results directly (scanning already done on landing page)
 * Following the "Observational Blueprint" design
 */
const AnalysisPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Try to get spec data from location state or localStorage
  let specData = location.state?.specData;

  if (!specData) {
    // Try to load from localStorage
    const savedSpecData = localStorage.getItem('lastSpecData');
    if (savedSpecData) {
      try {
        specData = JSON.parse(savedSpecData);
      } catch (error) {
        console.error('Failed to parse saved spec data:', error);
      }
    }
  }

  // If still no spec data, redirect to landing page
  if (!specData) {
    return <Navigate to="/" replace />;
  }

  // Use server analysis directly (NO client-side analysis)
  const analysisResults = useMemo(() => {
    if (specData.serverAnalysis) {
      // Use server analysis and transform to expected format
      return transformServerAnalysis(specData.serverAnalysis);
    }

    // Fallback: return empty results
    console.warn('No server analysis found, showing empty results');
    return {
      endpoints: [],
      stats: { total: 0, safe: 0, lowRisk: 0, highRisk: 0 },
      apiInfo: { title: 'API', version: '1.0.0', description: '' }
    };
  }, [specData.serverAnalysis]);

  const handleReset = () => {
    // Reset sends user back to landing page to upload again
    navigate('/', { replace: true });
  };

  // Try it out state
  const [testingEndpoint, setTestingEndpoint] = useState(null);
  const [testBody, setTestBody] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState('');
  const [hallucinationInfo, setHallucinationInfo] = useState(null);
  const [isHallucinating, setIsHallucinating] = useState(false);

  // Resolve $ref in OpenAPI schema
  const resolveSchema = (schema, spec) => {
    if (!schema || typeof schema !== 'object') return schema;

    // Handle $ref
    if (schema.$ref) {
      const refPath = schema.$ref;
      if (refPath.startsWith('#/components/schemas/')) {
        const schemaName = refPath.replace('#/components/schemas/', '');
        const resolvedSchema = spec?.components?.schemas?.[schemaName];
        if (resolvedSchema) {
          // Recursively resolve in case the referenced schema also has refs
          return resolveSchema(resolvedSchema, spec);
        }
      }
      return schema;
    }

    // Handle allOf (merge schemas)
    if (schema.allOf && Array.isArray(schema.allOf)) {
      let merged = {};
      for (const subSchema of schema.allOf) {
        const resolved = resolveSchema(subSchema, spec);
        if (resolved.type === 'object' && resolved.properties) {
          merged.properties = { ...merged.properties, ...resolved.properties };
          if (resolved.required) {
            merged.required = [...(merged.required || []), ...resolved.required];
          }
        }
      }
      merged.type = 'object';
      return merged;
    }

    return schema;
  };

  // Build example from OpenAPI schema
  const buildExampleFromSchema = (schema, spec) => {
    if (!schema || typeof schema !== 'object') return {};

    // Resolve $ref if present
    schema = resolveSchema(schema, spec);

    // If example exists in schema, use it
    if (schema.example !== undefined) return schema.example;

    // Handle object type
    if (schema.type === 'object' && schema.properties) {
      const obj = {};
      for (const [key, val] of Object.entries(schema.properties)) {
        obj[key] = buildExampleFromSchema(val, spec);
      }
      return obj;
    }

    // Handle array type
    if (schema.type === 'array') {
      return schema.items ? [buildExampleFromSchema(schema.items, spec)] : [];
    }

    // Handle primitive types
    if (schema.type === 'string') {
      if (schema.enum && schema.enum.length > 0) return schema.enum[0];
      if (schema.format === 'date') return '2024-01-01';
      if (schema.format === 'date-time') return '2024-01-01T00:00:00Z';
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'uuid') return '';
      return '';
    }
    if (schema.type === 'number' || schema.type === 'integer') {
      if (schema.default !== undefined) return schema.default;
      return 0;
    }
    if (schema.type === 'boolean') {
      if (schema.default !== undefined) return schema.default;
      return false;
    }

    return null;
  };

  const hallucinateRequestBody = () => {
    if (!testBody || isHallucinating) return;

    setIsHallucinating(true);

    // Small delay for visual feedback
    setTimeout(() => {
      try {
        const body = JSON.parse(testBody);
        const keys = Object.keys(body);
        if (keys.length === 0) {
          setIsHallucinating(false);
          return;
        }

        // Shuffle keys to vary which field gets transformed
        const shuffledKeys = [...keys].sort(() => Math.random() - 0.5);

        // Try each key until we find one we can transform
        for (const key of shuffledKeys) {
          const originalValue = body[key];
          let newValue = originalValue;
          let changeType = '';
          let transformed = false;

          // Apply TYPE COERCION transformations
          if (typeof originalValue === 'number') {
            // Number → String with various formats
            const formats = [
              originalValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','), // Comma formatting
              originalValue.toString() + '.0', // Add decimal
              ' ' + originalValue.toString() + ' ', // Add spaces
              originalValue.toString()
            ];
            newValue = formats[Math.floor(Math.random() * formats.length)];
            changeType = 'Number → String';
            transformed = true;
          } else if (typeof originalValue === 'boolean') {
            // Boolean → String (various formats)
            const formats = [
              originalValue ? 'yes' : 'no',
              originalValue ? 'true' : 'false',
              originalValue ? 'True' : 'False',
              originalValue ? 'YES' : 'NO',
              originalValue ? '1' : '0'
            ];
            newValue = formats[Math.floor(Math.random() * formats.length)];
            changeType = 'Boolean → String';
            transformed = true;
          } else if (typeof originalValue === 'string' && originalValue.trim() !== '') {
            // String transformations
            if (/^\d+$/.test(originalValue)) {
              // String → Number (integer)
              newValue = parseInt(originalValue);
              changeType = 'String → Number';
              transformed = true;
            } else if (/^\d+\.\d+$/.test(originalValue)) {
              // String → Number (float)
              newValue = parseFloat(originalValue);
              changeType = 'String → Number';
              transformed = true;
            } else if (originalValue.toLowerCase() === 'true' || originalValue.toLowerCase() === 'false') {
              // String → Boolean
              newValue = originalValue.toLowerCase() === 'true';
              changeType = 'String → Boolean';
              transformed = true;
            } else if (originalValue.toLowerCase() === 'yes' || originalValue.toLowerCase() === 'no') {
              // String → Boolean
              newValue = originalValue.toLowerCase() === 'yes';
              changeType = 'String → Boolean';
              transformed = true;
            } else {
              // Case transformations for non-transformable strings
              const caseTransforms = [
                originalValue.toUpperCase(),
                originalValue.toLowerCase(),
                originalValue.charAt(0).toUpperCase() + originalValue.slice(1).toLowerCase()
              ].filter(v => v !== originalValue);

              if (caseTransforms.length > 0) {
                newValue = caseTransforms[Math.floor(Math.random() * caseTransforms.length)];
                changeType = 'Case Change';
                transformed = true;
              }
            }
          }

          // If we successfully transformed this field, apply it and break
          if (transformed && newValue !== originalValue) {
            body[key] = newValue;
            setTestBody(JSON.stringify(body, null, 2));

            // Set hallucination info for display
            setHallucinationInfo({
              field: key,
              from: JSON.stringify(originalValue),
              to: JSON.stringify(newValue),
              type: changeType
            });

            setIsHallucinating(false);
            return;
          }
        }

        // If we couldn't transform any field, just clear loading state
        setIsHallucinating(false);
      } catch (e) {
        console.error('Failed to hallucinate:', e);
        setIsHallucinating(false);
      }
    }, 300); // 300ms delay for visual feedback
  };

  const handleTryItOut = (endpoint) => {
    // Only allow POST and PATCH
    if (endpoint.method !== 'POST' && endpoint.method !== 'PATCH') {
      return;
    }

    setTestingEndpoint(endpoint);
    setTestResult(null);
    setTestError('');
    setHallucinationInfo(null);

    // Parse spec and extract request body schema
    let spec = specData.spec;
    if (typeof spec === 'string') {
      try {
        spec = JSON.parse(spec);
      } catch (e) {
        console.error('Could not parse spec:', e);
        setTestBody('{}');
        return;
      }
    }

    // Find the endpoint in the spec
    const paths = spec?.paths || {};
    const pathItem = paths[endpoint.path];

    if (pathItem) {
      const operation = pathItem[endpoint.method.toLowerCase()];

      if (operation?.requestBody?.content?.['application/json']?.schema) {
        const schema = operation.requestBody.content['application/json'].schema;
        const example = buildExampleFromSchema(schema, spec);
        setTestBody(JSON.stringify(example, null, 2));
        return;
      }
    }

    // Fallback to empty object
    setTestBody('{}');
  };

  const handleSendTest = async () => {
    if (!testingEndpoint || !specData.spec) return;

    setTestError('');
    setTestLoading(true);
    setTestResult(null);
    setHallucinationInfo(null);

    try {
      // Parse the body
      let parsedBody = null;
      if (testBody.trim()) {
        try {
          parsedBody = JSON.parse(testBody);
        } catch {
          setTestError('Invalid JSON body');
          setTestLoading(false);
          return;
        }
      }

      // Parse spec if it's a string
      let spec = specData.spec;
      if (typeof spec === 'string') {
        try {
          spec = JSON.parse(spec);
        } catch (e) {
          // Try YAML
          console.error('Could not parse spec:', e);
        }
      }

      const response = await apiClient.validateDemoRequest(
        spec,
        testingEndpoint.method,
        testingEndpoint.path,
        parsedBody
      );

      if (response.success) {
        setTestResult(response.data);
      } else {
        setTestError(response.error || 'Validation failed');
      }
    } catch (error) {
      console.error('Test request error:', error);
      setTestError(error.message || 'Failed to validate request');
    } finally {
      setTestLoading(false);
    }
  };

  const handleCloseTest = () => {
    setTestingEndpoint(null);
    setTestBody('');
    setTestResult(null);
    setTestError('');
    setHallucinationInfo(null);
  };

  return (
    <div className="min-h-screen bg-surface">
      <SpecResults
        results={analysisResults}
        specData={specData}
        onReset={handleReset}
        onTryItOut={handleTryItOut}
      />

      {/* Try it out modal */}
      {testingEndpoint && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseTest}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Try it out</h3>
                <button
                  onClick={handleCloseTest}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-bold rounded ${
                  testingEndpoint.method === 'POST' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {testingEndpoint.method}
                </span>
                <span className="font-mono text-sm text-slate-700">{testingEndpoint.path}</span>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Request Body
                  </label>
                  <Tooltip text="Introduce an AI hallucination (error) to test repair functionality" forceBottom={true}>
                    <button
                      onClick={hallucinateRequestBody}
                      disabled={isHallucinating}
                      className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-colors ${
                        isHallucinating
                          ? 'text-purple-400 bg-purple-50 cursor-not-allowed'
                          : 'text-purple-600 hover:text-purple-700 hover:bg-purple-50 cursor-pointer'
                      }`}
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isHallucinating ? 'animate-spin' : ''}`} />
                      {isHallucinating ? 'Hallucinating...' : 'Hallucinate'}
                    </button>
                  </Tooltip>
                </div>
                <textarea
                  value={testBody}
                  onChange={(e) => {
                    setTestBody(e.target.value);
                    // Clear hallucination info when user manually edits
                    if (hallucinationInfo) {
                      setHallucinationInfo(null);
                    }
                  }}
                  className="w-full h-48 px-3 py-2 font-mono text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-primary resize-none"
                  placeholder="// JSON request body"
                />
                {hallucinationInfo && (
                  <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-lg flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 text-xs">
                      <p className="font-semibold text-purple-900 mb-0.5">
                        Hallucinated field: <span className="font-mono bg-purple-100 px-1.5 py-0.5 rounded">{hallucinationInfo.field}</span>
                      </p>
                      <p className="text-purple-700">
                        <span className="font-medium">{hallucinationInfo.type}:</span>{' '}
                        <span className="font-mono">{hallucinationInfo.from}</span>
                        {' → '}
                        <span className="font-mono font-semibold">{hallucinationInfo.to}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => setHallucinationInfo(null)}
                      className="text-purple-400 hover:text-purple-600 transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {testError && (
                  <p className="text-sm text-red-600 mt-1">{testError}</p>
                )}
              </div>

              <Tooltip text="Validate request body against OpenAPI spec and apply Invari repairs if needed" fullWidth={true}>
                <button
                  onClick={handleSendTest}
                  disabled={testLoading}
                  className="w-full py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {testLoading ? 'Validating...' : 'Send Request'}
                </button>
              </Tooltip>

              {/* Result */}
              {testResult && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className={`p-3 ${
                    testResult.status === 'stable' ? 'bg-emerald-50' :
                    testResult.status === 'repaired' ? 'bg-amber-50' :
                    'bg-red-50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        testResult.status === 'stable' ? 'bg-emerald-100 text-emerald-700' :
                        testResult.status === 'repaired' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {testResult.status === 'stable' ? '✓ Stable' :
                         testResult.status === 'repaired' ? '⚠ Repaired' :
                         '✗ Blocked'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {testResult.overheadMs}ms overhead
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Drift details */}
                    {testResult.driftDetails && (
                      <div className={`p-3 rounded-lg text-sm ${
                        testResult.status === 'blocked' ? 'bg-red-50' : 'bg-amber-50'
                      }`}>
                        <p className="font-semibold mb-2">
                          {testResult.status === 'blocked' ? 'Block reason' : 'Repair details'}
                        </p>
                        {testResult.driftDetails.reason && (
                          <p className="text-slate-600 mb-2">{testResult.driftDetails.reason}</p>
                        )}
                        {testResult.driftDetails.repairActions?.map((action, i) => (
                          <div key={i} className="flex items-start gap-2 mt-1 text-xs">
                            <span className="text-amber-600">→</span>
                            <span>
                              <strong>{action.type.replace(/_/g, ' ')}</strong>
                              {action.field && `: ${action.field}`}
                              {action.from && action.to && ` "${action.from}" → "${action.to}"`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bodies comparison */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Original</p>
                        <pre className="bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono overflow-auto max-h-40">
                          {JSON.stringify(testResult.originalBody, null, 2)}
                        </pre>
                      </div>
                      {testResult.sanitizedBody && (
                        <div>
                          <p className="text-xs font-semibold text-emerald-600 uppercase mb-1.5">Repaired</p>
                          <pre className="bg-emerald-50 border border-emerald-200 rounded p-2 text-xs font-mono overflow-auto max-h-40">
                            {JSON.stringify(testResult.sanitizedBody, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Feedback */}
                    {testResult.feedback && (
                      <div className="p-3 bg-blue-50 rounded-lg text-sm">
                        <p className="font-semibold mb-1">Feedback</p>
                        <p className="text-slate-600">{testResult.feedback.summary || 'Validation successful'}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisPage;
