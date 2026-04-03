import { useState } from 'react';
import { Send, Copy, Zap, ChevronDown, ChevronUp, FileText, X, Sparkles } from 'lucide-react';
import Card from './Card';
import toast from 'react-hot-toast';
import HowToTestModal from './HowToTestModal';

const AgentPlayground = ({ application }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [requestBody, setRequestBody] = useState('{}');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRequestCollapsed, setIsRequestCollapsed] = useState(false);
  const [isResponseCollapsed, setIsResponseCollapsed] = useState(false);
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [showHowToModal, setShowHowToModal] = useState(false);
  const [hallucinationInfo, setHallucinationInfo] = useState(null);
  const [isHallucinating, setIsHallucinating] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Get endpoints from OpenAPI spec
  const endpoints = application?.endpoints || [];

  // Generate sample payload from schema
  const getSamplePayload = (endpoint) => {
    if (!endpoint) return {};

    const path = endpoint.path;
    const method = endpoint.method;

    // Try to get schema from OpenAPI spec
    const schema = application?.spec?.paths?.[path]?.[method.toLowerCase()]?.requestBody?.content?.['application/json']?.schema;

    if (schema?.properties) {
      // Generate valid payload from schema using examples and formats
      const payload = {};
      Object.keys(schema.properties).forEach(key => {
        const prop = schema.properties[key];

        // Use example first, then default, then generate based on type/format
        if (prop.example !== undefined) {
          payload[key] = prop.example;
        } else if (prop.default !== undefined) {
          payload[key] = prop.default;
        } else if (prop.type === 'string') {
          // Generate format-appropriate values
          if (prop.format === 'date') {
            payload[key] = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          } else if (prop.format === 'email') {
            payload[key] = 'user@example.com';
          } else if (prop.format === 'uri' || prop.format === 'url') {
            payload[key] = 'https://example.com';
          } else if (prop.pattern?.includes('[0-9]:[0-9]')) {
            payload[key] = '19:30'; // Time pattern
          } else if (prop.pattern?.includes('\\+')) {
            payload[key] = '+1-555-0100'; // Phone pattern
          } else {
            payload[key] = 'test_value';
          }
        } else if (prop.type === 'number' || prop.type === 'integer') {
          payload[key] = prop.minimum || 1;
        } else if (prop.type === 'boolean') {
          payload[key] = true;
        }
      });
      return payload;
    }

    return {};
  };

  const handleEndpointSelect = (endpoint) => {
    setSelectedEndpoint(endpoint);
    const samplePayload = getSamplePayload(endpoint);
    setRequestBody(JSON.stringify(samplePayload, null, 2));
    setResponse(null);
    setHallucinationInfo(null);
  };

  const hallucinateRequestBody = () => {
    if (!requestBody || isHallucinating) return;

    setIsHallucinating(true);

    // Small delay for visual feedback
    setTimeout(() => {
      try {
        const body = JSON.parse(requestBody);
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
            setRequestBody(JSON.stringify(body, null, 2));

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

  const sendRequest = async (endpointOverride = null, bodyOverride = null) => {
    const endpoint = endpointOverride || selectedEndpoint;

    if (!endpoint || !endpoint.method || !endpoint.path || !application?.invariApiKey) {
      toast.error('Please select an endpoint and ensure API key is available');
      return;
    }

    try {
      setLoading(true);
      let body;
      try {
        body = bodyOverride !== null ? bodyOverride : JSON.parse(requestBody);
      } catch (e) {
        toast.error('Invalid JSON in request body');
        return;
      }

      const startTime = Date.now();

      const httpMethod = endpoint.method.toUpperCase();

      const fetchOptions = {
        method: httpMethod,
        headers: {
          'Content-Type': 'application/json',
          'X-Invari-Key': application.invariApiKey,
          'X-Invari-Agent-Id': 'playground-tester',
        },
      };

      // Only include body for methods that support it
      if (['POST', 'PUT', 'PATCH'].includes(httpMethod)) {
        fetchOptions.body = JSON.stringify(body);
      }

      const res = await fetch(`${API_BASE_URL}/proxy/${application.id}${endpoint.path}`, fetchOptions);

      const responseTime = Date.now() - startTime;
      const data = await res.json();

      // Extract Invari metadata from nested _invari_metadata object
      const invariStatus = data._invari_metadata?.status;
      const invariOverhead = data._invari_metadata?.overhead;
      const invariRepaired = data._invari_metadata?.repaired;
      const invariMode = data._invari_metadata?.mode;

      // Remove Invari wrapper fields from response display, keep only actual API response
      const { _invari_metadata, message, validationStatus, validated, repaired, ...actualData } = data;

      setResponse({
        status: res.status,
        statusText: res.ok ? 'OK' : 'Error',
        responseTime,
        data: actualData,
        invariMetadata: {
          status: invariStatus,
          overhead: invariOverhead,
          repaired: invariRepaired,
          mode: invariMode,
        },
      });

      if (res.ok) {
        toast.success(`Request sent successfully (${responseTime}ms)`);
      } else {
        toast.error(`Request failed: ${res.status} ${res.statusText}`);
      }
    } catch (error) {
      toast.error(`Request failed: ${error.message}`);
      setResponse({
        status: 0,
        statusText: 'Network Error',
        data: { error: error.message },
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getEndpointSpec = () => {
    if (!selectedEndpoint || !application?.spec) return null;

    const path = selectedEndpoint.path;
    const method = selectedEndpoint.method.toLowerCase();
    const endpointSpec = application.spec.paths?.[path]?.[method];

    return endpointSpec;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="font-serif text-[22px] font-normal text-on-surface">Agent Simulation Playground</h2>
            <span
              onClick={() => setShowHowToModal(true)}
              className="text-[13px] text-green hover:text-green-dark cursor-pointer transition-colors underline"
              title="How to test your agent"
            >
              How to test
            </span>
          </div>
          <p className="text-slate-600">
            Test how AI agents interact with Invari proxy. Use the Hallucinate button to introduce realistic AI errors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Panel: Endpoint Selector */}
        <div className="space-y-4">
          <Card className="p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Available Endpoints</h3>

            {/* Endpoint Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Select Endpoint
              </label>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {endpoints.map((endpoint, idx) => (
                  <div
                    key={idx}
                    className={`relative w-full text-left p-3 rounded-[8px] border transition-all ${
                      selectedEndpoint === endpoint
                        ? 'bg-indigo-50 border-indigo-500'
                        : 'bg-white border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <div
                      onClick={() => handleEndpointSelect(endpoint)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded ${
                          endpoint.method === 'GET' ? 'bg-[#dcfce7] text-[#166534]' :
                          endpoint.method === 'POST' ? 'bg-[#dbeafe] text-[#1d4ed8]' :
                          endpoint.method === 'PUT' ? 'bg-[#fef3c7] text-[#b45309]' :
                          endpoint.method === 'PATCH' ? 'bg-[#fef3c7] text-[#b45309]' :
                          endpoint.method === 'DELETE' ? 'bg-[#fee2e2] text-[#dc2626]' :
                          'bg-surface-container-high text-on-surface-variant'
                        }`}>
                          {endpoint.method}
                        </span>
                        <span className="font-mono text-xs text-slate-900 flex-1">{endpoint.path}</span>
                      </div>
                      {endpoint.summary && (
                        <div className="text-xs text-slate-600 mt-1 ml-12">{endpoint.summary}</div>
                      )}
                    </div>

                    {/* Simulate Icon */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedEndpoint === endpoint) {
                          // If already selected, simulate directly
                          const samplePayload = getSamplePayload(endpoint);
                          const payloadString = JSON.stringify(samplePayload, null, 2);
                          setRequestBody(payloadString);
                          setResponse(null);
                          setHallucinationInfo(null);
                          sendRequest(endpoint, samplePayload);
                        }
                      }}
                      disabled={selectedEndpoint !== endpoint}
                      className={`absolute top-2 right-2 p-2 rounded-[8px] border transition-all group ${
                        selectedEndpoint === endpoint
                          ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 hover:border-emerald-400 cursor-pointer'
                          : 'bg-slate-50 border-slate-300 opacity-50 cursor-not-allowed pointer-events-none'
                      }`}
                      title={selectedEndpoint === endpoint ? 'Simulate request' : 'Select endpoint first'}
                    >
                      <Zap className={`w-4 h-4 ${
                        selectedEndpoint === endpoint
                          ? 'text-emerald-600 group-hover:text-emerald-700'
                          : 'text-slate-400'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Panel: Request & Response Viewer */}
        <div className="space-y-4">
          {/* Request Card */}
          {selectedEndpoint && (
            <Card className="p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Request</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSpecModal(true)}
                    className="p-1 hover:bg-indigo-50 rounded transition-all"
                    title="View API Spec"
                  >
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </button>
                  <button
                    onClick={() => setIsRequestCollapsed(!isRequestCollapsed)}
                    className="p-1 hover:bg-slate-100 rounded transition-all"
                  >
                    {isRequestCollapsed ? (
                      <ChevronDown className="w-5 h-5 text-slate-600" />
                    ) : (
                      <ChevronUp className="w-5 h-5 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>

              {!isRequestCollapsed && (
                <div className="space-y-4">
                  {/* Selected Endpoint Info */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-[8px]">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded ${
                        selectedEndpoint.method === 'GET' ? 'bg-[#dcfce7] text-[#166534]' :
                        selectedEndpoint.method === 'POST' ? 'bg-[#dbeafe] text-[#1d4ed8]' :
                        selectedEndpoint.method === 'PUT' ? 'bg-[#fef3c7] text-[#b45309]' :
                        selectedEndpoint.method === 'PATCH' ? 'bg-[#fef3c7] text-[#b45309]' :
                        selectedEndpoint.method === 'DELETE' ? 'bg-[#fee2e2] text-[#dc2626]' :
                        'bg-surface-container-high text-on-surface-variant'
                      }`}>
                        {selectedEndpoint.method}
                      </span>
                      <span className="font-mono text-xs text-slate-900">{selectedEndpoint.path}</span>
                    </div>
                    {selectedEndpoint.summary && (
                      <div className="text-xs text-slate-600">{selectedEndpoint.summary}</div>
                    )}
                  </div>

                  {/* Request Body Editor */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-slate-700">
                        Request Body (JSON)
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(requestBody)}
                          className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                        <button
                          onClick={hallucinateRequestBody}
                          disabled={isHallucinating}
                          className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                            isHallucinating
                              ? 'text-purple-400 bg-purple-50 cursor-not-allowed'
                              : 'text-purple-600 hover:text-purple-700 hover:bg-purple-50 cursor-pointer'
                          }`}
                          title="Introduce an AI hallucination (error) to test repair functionality"
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${isHallucinating ? 'animate-spin' : ''}`} />
                          {isHallucinating ? 'Hallucinating...' : 'Hallucinate'}
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={requestBody}
                      onChange={(e) => {
                        setRequestBody(e.target.value);
                        // Clear hallucination info when user manually edits
                        if (hallucinationInfo) {
                          setHallucinationInfo(null);
                        }
                      }}
                      rows={10}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-[8px] text-sm text-slate-900 font-mono focus:outline-none focus:border-indigo-500 resize-none"
                      placeholder='{"userId": 123, "amount": 100}'
                    />
                    {hallucinationInfo && (
                      <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-lg flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 text-[12px]">
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
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={() => sendRequest()}
                    disabled={!selectedEndpoint || loading}
                    className="w-full px-[18px] py-[9px] bg-primary hover:opacity-88 disabled:bg-surface-container-high disabled:text-on-surface-variant text-white rounded-[8px] font-medium text-[13px] transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      'Sending...'
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Request
                      </>
                    )}
                  </button>
                </div>
              )}
            </Card>
          )}

          {/* Response Card */}
          <Card className="p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Response</h3>
              {response && (
                <button
                  onClick={() => setIsResponseCollapsed(!isResponseCollapsed)}
                  className="p-1 hover:bg-slate-100 rounded transition-all"
                >
                  {isResponseCollapsed ? (
                    <ChevronDown className="w-5 h-5 text-slate-600" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-slate-600" />
                  )}
                </button>
              )}
            </div>

            {!response ? (
              <div className="text-center py-12 text-slate-400">
                <Zap className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Send a request to see the response</p>
              </div>
            ) : !isResponseCollapsed ? (
              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-[8px] font-semibold ${
                    response.status >= 200 && response.status < 300
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {response.status} {response.statusText}
                  </span>
                  <span className="text-xs text-slate-600">
                    {response.responseTime}ms
                  </span>
                </div>

                {/* Invari Metadata */}
                {response.invariMetadata && (
                  <div className="p-3 bg-slate-100 border border-slate-300 rounded-[8px]">
                    <div className="text-xs font-semibold text-slate-700 mb-2">Invari Metadata</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Status:</span>
                        <span className={`font-medium ${
                          response.invariMetadata.status === 'stable' ? 'text-emerald-700' :
                          response.invariMetadata.status === 'repaired' ? 'text-amber-700' :
                          'text-red-700'
                        }`}>
                          {response.invariMetadata.status || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Overhead:</span>
                        <span className="text-slate-700">{response.invariMetadata.overhead || 'N/A'}</span>
                      </div>
                      {/* {response.invariMetadata.mode && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Mode:</span>
                          <span className="text-slate-700 font-mono text-[10px]">{response.invariMetadata.mode}</span>
                        </div>
                      )} */}
                      {response.invariMetadata.repaired && (
                        <div className="mt-2 pt-2 border-t border-slate-300">
                          <span className="text-amber-700 font-medium">✓ Request was auto-repaired by Invari</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Response Body */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Response Body
                    </label>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(response.data, null, 2))}
                      className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                  <div className="bg-white border border-slate-300 rounded-[8px] p-3 max-h-96 overflow-auto">
                    <pre className="text-xs text-slate-900 font-mono whitespace-pre-wrap">
                      {JSON.stringify(response.data, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      {/* How To Test Modal */}
      {showHowToModal && (
        <HowToTestModal
          onClose={() => setShowHowToModal(false)}
          proxyUrl={`${API_BASE_URL}/proxy/${application?.id}`}
        />
      )}

      {/* Spec Modal */}
      {showSpecModal && selectedEndpoint && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSpecModal(false)}
        >
          <div
            className="bg-surface rounded-[16px] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-7 pb-4">
              <h2 className="font-serif text-[21px] font-normal text-on-surface mb-[6px]">API Specification</h2>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded ${
                  selectedEndpoint.method === 'GET' ? 'bg-[#dcfce7] text-[#166534]' :
                  selectedEndpoint.method === 'POST' ? 'bg-[#dbeafe] text-[#1d4ed8]' :
                  selectedEndpoint.method === 'PUT' ? 'bg-[#fef3c7] text-[#b45309]' :
                  selectedEndpoint.method === 'PATCH' ? 'bg-[#fef3c7] text-[#b45309]' :
                  selectedEndpoint.method === 'DELETE' ? 'bg-[#fee2e2] text-[#dc2626]' :
                  'bg-surface-container-high text-on-surface-variant'
                }`}>
                  {selectedEndpoint.method}
                </span>
                <span className="font-mono text-[13px] text-muted">{selectedEndpoint.path}</span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-7 pt-4">
              {(() => {
                const spec = getEndpointSpec();
                if (!spec) return <p className="text-muted text-[13px]">No specification available</p>;

                return (
                  <div className="space-y-6">
                    {/* Summary & Description */}
                    {(spec.summary || spec.description) && (
                      <div>
                        {spec.summary && <h4 className="text-[14px] font-semibold text-on-surface mb-2">{spec.summary}</h4>}
                        {spec.description && <p className="text-[13px] text-muted">{spec.description}</p>}
                      </div>
                    )}

                    {/* Parameters */}
                    {spec.parameters && spec.parameters.length > 0 && (
                      <div>
                        <h4 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted font-semibold mb-3">Parameters</h4>
                        <div className="space-y-3">
                          {spec.parameters.map((param, idx) => (
                            <div key={idx} className="p-3 bg-surface-low border border-outline rounded-[8px]">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-[13px] font-medium text-on-surface">{param.name}</span>
                                <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-700">
                                  {param.in}
                                </span>
                                {param.required && (
                                  <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-red-100 text-red-700">
                                    required
                                  </span>
                                )}
                              </div>
                              {param.description && <p className="text-[12px] text-muted mt-1">{param.description}</p>}
                              {param.schema && (
                                <div className="text-[12px] text-muted mt-1">
                                  Type: <code className="font-mono">{param.schema.type || 'any'}</code>
                                  {param.schema.enum && ` (${param.schema.enum.join(', ')})`}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Request Body */}
                    {spec.requestBody && (
                      <div>
                        <h4 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted font-semibold mb-3">Request Body</h4>
                        <div className="p-4 bg-surface-low border border-outline rounded-[8px]">
                          {spec.requestBody.required && (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded bg-red-100 text-red-700 mb-2">
                              required
                            </span>
                          )}
                          {spec.requestBody.content?.['application/json']?.schema && (
                            <div className="mt-2">
                              <pre className="text-[12px] text-on-surface font-mono whitespace-pre-wrap overflow-x-auto">
                                {JSON.stringify(spec.requestBody.content['application/json'].schema, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Responses */}
                    {spec.responses && (
                      <div>
                        <h4 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted font-semibold mb-3">Responses</h4>
                        <div className="space-y-3">
                          {Object.entries(spec.responses).map(([status, response]) => (
                            <div key={status} className="p-3 bg-surface-low border border-outline rounded-[8px]">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                                  status.startsWith('2') ? 'bg-emerald-100 text-emerald-700' :
                                  status.startsWith('4') ? 'bg-amber-100 text-amber-700' :
                                  status.startsWith('5') ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {status}
                                </span>
                                <span className="text-[13px] text-on-surface">{response.description}</span>
                              </div>
                              {response.content?.['application/json']?.schema && (
                                <div className="mt-2">
                                  <pre className="text-[12px] text-muted font-mono whitespace-pre-wrap overflow-x-auto">
                                    {JSON.stringify(response.content['application/json'].schema, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {spec.tags && spec.tags.length > 0 && (
                      <div>
                        <h4 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted font-semibold mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {spec.tags.map((tag, idx) => (
                            <span key={idx} className="px-3 py-1 text-[10px] font-medium rounded-full bg-green-bg text-green border border-green">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-7 pt-4">
              <button
                onClick={() => setShowSpecModal(false)}
                className="w-full px-[18px] py-[9px] bg-primary text-white border-0 rounded-[8px] text-[13px] font-medium hover:opacity-88 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentPlayground;
