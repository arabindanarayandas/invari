import { useState } from 'react';
import { Send, Copy, Zap, Code, AlertTriangle, CheckCircle, Shield, ChevronDown, ChevronUp, FileText, X } from 'lucide-react';
import Card from './Card';
import toast from 'react-hot-toast';

const AgentPlayground = ({ application }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [requestBody, setRequestBody] = useState('{}');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testMode, setTestMode] = useState('valid'); // valid, drift, attack
  const [isRequestCollapsed, setIsRequestCollapsed] = useState(false);
  const [isResponseCollapsed, setIsResponseCollapsed] = useState(false);
  const [showSpecModal, setShowSpecModal] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // Get endpoints from OpenAPI spec
  const endpoints = application?.endpoints || [];

  // Sample payloads for different test modes
  const getSamplePayload = (endpoint, mode) => {
    if (!endpoint) return {};

    const path = endpoint.path;
    const method = endpoint.method;

    // Try to get schema from OpenAPI spec
    const schema = application?.spec?.paths?.[path]?.[method.toLowerCase()]?.requestBody?.content?.['application/json']?.schema;

    if (mode === 'valid' && schema?.properties) {
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

    if (mode === 'drift') {
      // Generate payload with schema drift (wrong field names, wrong types)
      // This simulates an AI agent using outdated API knowledge
      if (schema?.properties) {
        const payload = {};
        Object.keys(schema.properties).forEach(key => {
          const prop = schema.properties[key];
          // Introduce drift: wrong field names and wrong types
          if (key === 'userId' || key === 'customerId') {
            payload['usr_id'] = prop.example || "12345"; // Wrong field name
          } else if (key === 'amount' || key === 'partySize') {
            payload['amt'] = String(prop.example || 100); // Wrong field name + wrong type
          } else if (key === 'date') {
            payload['dt'] = prop.example || "2026-02-15"; // Wrong field name
          } else if (key === 'time') {
            payload['tm'] = prop.example || "19:30"; // Wrong field name
          } else if (key === 'phoneNumber') {
            payload['phone'] = prop.example || "+1-555-0100"; // Wrong field name
          } else if (key === 'customerName') {
            payload['name'] = prop.example || "John Doe"; // Wrong field name
          } else if (prop.type === 'number' || prop.type === 'integer') {
            payload[key] = String(prop.example || 123); // Wrong type (string instead of number)
          } else if (prop.type === 'string') {
            payload[key] = prop.example || prop.default || 'value';
          }
        });
        return payload;
      }
      return {
        usr_id: "123",
        amt: "100.00",
        curr: "USD"
      };
    }

    if (mode === 'malicious') {
      // Generate payload with malicious values injected into normal-looking fields
      // This simulates an AI agent being manipulated to inject malicious code
      if (schema?.properties) {
        const payload = {};
        const keys = Object.keys(schema.properties);
        keys.forEach((key, index) => {
          const prop = schema.properties[key];
          // Inject different types of attacks into string fields
          if (prop.type === 'string') {
            if (key === 'customerName' || key === 'name' || index === 0) {
              // SQL Injection in name fields
              payload[key] = "admin' OR '1'='1' --";
            } else if (key === 'email' || (prop.format === 'email' && index === 1)) {
              // Email with XSS
              payload[key] = "user+<script>alert('xss')</script>@example.com";
            } else if (key === 'specialRequests' || key === 'notes' || key === 'query') {
              // Command Injection in free-text fields
              payload[key] = "normal request; cat /etc/passwd; echo 'done'";
            } else {
              // Use example or generate realistic value with injection attempt
              payload[key] = prop.example || "normal_value";
            }
          } else if (prop.type === 'number' || prop.type === 'integer') {
            payload[key] = prop.example || prop.minimum || 100;
          } else if (prop.type === 'boolean') {
            payload[key] = true;
          }
        });
        return payload;
      }
      // Fallback malicious payload
      return {
        userId: "1' OR '1'='1' --",
        query: "SELECT * FROM users; DROP TABLE users;--",
        command: "test && rm -rf /tmp/*"
      };
    }

    return {};
  };

  const handleEndpointSelect = (endpoint) => {
    setSelectedEndpoint(endpoint);
    const samplePayload = getSamplePayload(endpoint, testMode);
    setRequestBody(JSON.stringify(samplePayload, null, 2));
    setResponse(null);
  };

  const handleTestModeChange = (mode) => {
    setTestMode(mode);
    if (selectedEndpoint) {
      const samplePayload = getSamplePayload(selectedEndpoint, mode);
      setRequestBody(JSON.stringify(samplePayload, null, 2));
    }
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

      // Extract Invari metadata from headers
      const invariStatus = res.headers.get('X-Invari-Status');
      const invariOverhead = res.headers.get('X-Invari-Overhead');
      const invariRepaired = res.headers.get('X-Invari-Repaired');
      const invariMode = res.headers.get('X-Invari-Mode');

      setResponse({
        status: res.status,
        statusText: res.ok ? 'OK' : 'Error',
        responseTime,
        data,
        invariMetadata: {
          status: invariStatus,
          overhead: invariOverhead,
          repaired: invariRepaired === 'true',
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
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Agent Simulation Playground</h2>
          <p className="text-slate-600">
            Test how AI agents interact with Invari proxy. Simulate valid requests, schema drift, and attacks.
          </p>
        </div>
      </div>

      {/* Test Mode Selector */}
      <div className="flex gap-3">
        <button
          onClick={() => handleTestModeChange('valid')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            testMode === 'valid'
              ? 'bg-emerald-50 border-2 border-emerald-500 text-emerald-700'
              : 'bg-white border border-slate-300 text-slate-700 hover:border-slate-400'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Valid Request
        </button>
        <button
          onClick={() => handleTestModeChange('drift')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            testMode === 'drift'
              ? 'bg-amber-50 border-2 border-amber-500 text-amber-700'
              : 'bg-white border border-slate-300 text-slate-700 hover:border-slate-400'
          }`}
        >
          <Code className="w-4 h-4" />
          Schema Drift
        </button>
        <button
          onClick={() => handleTestModeChange('malicious')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            testMode === 'malicious'
              ? 'bg-red-50 border-2 border-red-500 text-red-700'
              : 'bg-white border border-slate-300 text-slate-700 hover:border-slate-400'
          }`}
        >
          <Shield className="w-4 h-4" />
          Malicious Injection
        </button>
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
                    className={`relative w-full text-left p-3 rounded-lg border transition-all ${
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
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                          endpoint.method === 'POST' ? 'bg-emerald-100 text-emerald-700' :
                          endpoint.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                          endpoint.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
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
                          const samplePayload = getSamplePayload(endpoint, testMode);
                          const payloadString = JSON.stringify(samplePayload, null, 2);
                          setRequestBody(payloadString);
                          setResponse(null);
                          sendRequest(endpoint, samplePayload);
                        }
                      }}
                      disabled={selectedEndpoint !== endpoint}
                      className={`absolute top-2 right-2 p-2 rounded-lg border transition-all group ${
                        selectedEndpoint === endpoint
                          ? testMode === 'valid' ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 hover:border-emerald-400 cursor-pointer' :
                            testMode === 'drift' ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 hover:border-amber-400 cursor-pointer' :
                            'bg-red-50 hover:bg-red-100 border-red-300 hover:border-red-400 cursor-pointer'
                          : 'bg-slate-50 border-slate-300 opacity-50 cursor-not-allowed pointer-events-none'
                      }`}
                      title={selectedEndpoint === endpoint ? `Simulate ${testMode === 'valid' ? 'valid' : testMode === 'drift' ? 'drift' : 'malicious'} request` : 'Select endpoint first'}
                    >
                      <Zap className={`w-4 h-4 ${
                        selectedEndpoint === endpoint
                          ? testMode === 'valid' ? 'text-emerald-600 group-hover:text-emerald-700' :
                            testMode === 'drift' ? 'text-amber-600 group-hover:text-amber-700' :
                            'text-red-600 group-hover:text-red-700'
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
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        selectedEndpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                        selectedEndpoint.method === 'POST' ? 'bg-emerald-100 text-emerald-700' :
                        selectedEndpoint.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                        selectedEndpoint.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
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
                      <button
                        onClick={() => copyToClipboard(requestBody)}
                        className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                    </div>
                    <textarea
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      rows={10}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:outline-none focus:border-indigo-500 resize-none"
                      placeholder='{"userId": 123, "amount": 100}'
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={() => sendRequest()}
                    disabled={!selectedEndpoint || loading}
                    className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
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
                  <span className={`px-3 py-1 rounded-lg font-semibold ${
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
                  <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg">
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
                      {response.invariMetadata.mode && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Mode:</span>
                          <span className="text-slate-700 font-mono text-[10px]">{response.invariMetadata.mode}</span>
                        </div>
                      )}
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
                  <div className="bg-white border border-slate-300 rounded-lg p-3 max-h-96 overflow-auto">
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

      {/* Info Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 bg-emerald-50 border-emerald-200 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-emerald-700 mb-1">Valid Request</h4>
              <p className="text-xs text-slate-600">
                Sends a properly formatted request that matches your OpenAPI schema. Should pass through without modification.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-amber-50 border-amber-200 shadow-sm">
          <div className="flex items-start gap-3">
            <Code className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-amber-700 mb-1">Schema Drift</h4>
              <p className="text-xs text-slate-600">
                Sends wrong field names or types. Invari will attempt to auto-repair using fuzzy matching and type coercion.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-red-50 border-red-200 shadow-sm">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-red-700 mb-1">Malicious Injection</h4>
              <p className="text-xs text-slate-600">
                Injects SQL injection and command injection patterns into request field values. Invari scans all values and blocks malicious content.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Spec Modal */}
      {showSpecModal && selectedEndpoint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">API Specification</h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                    selectedEndpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                    selectedEndpoint.method === 'POST' ? 'bg-emerald-100 text-emerald-700' :
                    selectedEndpoint.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                    selectedEndpoint.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {selectedEndpoint.method}
                  </span>
                  <span className="font-mono text-xs text-slate-900">{selectedEndpoint.path}</span>
                </div>
              </div>
              <button
                onClick={() => setShowSpecModal(false)}
                className="p-2 hover:bg-slate-100 rounded transition-all"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                const spec = getEndpointSpec();
                if (!spec) return <p className="text-slate-600">No specification available</p>;

                return (
                  <div className="space-y-6">
                    {/* Summary & Description */}
                    {(spec.summary || spec.description) && (
                      <div>
                        {spec.summary && <h4 className="text-sm font-semibold text-slate-900 mb-2">{spec.summary}</h4>}
                        {spec.description && <p className="text-sm text-slate-600">{spec.description}</p>}
                      </div>
                    )}

                    {/* Parameters */}
                    {spec.parameters && spec.parameters.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-3">Parameters</h4>
                        <div className="space-y-3">
                          {spec.parameters.map((param, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm font-medium text-slate-900">{param.name}</span>
                                <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
                                  {param.in}
                                </span>
                                {param.required && (
                                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700">
                                    required
                                  </span>
                                )}
                              </div>
                              {param.description && <p className="text-xs text-slate-600 mt-1">{param.description}</p>}
                              {param.schema && (
                                <div className="text-xs text-slate-500 mt-1">
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
                        <h4 className="text-sm font-semibold text-slate-900 mb-3">Request Body</h4>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                          {spec.requestBody.required && (
                            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700 mb-2">
                              required
                            </span>
                          )}
                          {spec.requestBody.content?.['application/json']?.schema && (
                            <div className="mt-2">
                              <pre className="text-xs text-slate-900 font-mono whitespace-pre-wrap overflow-x-auto">
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
                        <h4 className="text-sm font-semibold text-slate-900 mb-3">Responses</h4>
                        <div className="space-y-3">
                          {Object.entries(spec.responses).map(([status, response]) => (
                            <div key={status} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                                  status.startsWith('2') ? 'bg-emerald-100 text-emerald-700' :
                                  status.startsWith('4') ? 'bg-amber-100 text-amber-700' :
                                  status.startsWith('5') ? 'bg-red-100 text-red-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {status}
                                </span>
                                <span className="text-sm text-slate-900">{response.description}</span>
                              </div>
                              {response.content?.['application/json']?.schema && (
                                <div className="mt-2">
                                  <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap overflow-x-auto">
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
                        <h4 className="text-sm font-semibold text-slate-900 mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {spec.tags.map((tag, idx) => (
                            <span key={idx} className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
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
            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowSpecModal(false)}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all"
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
