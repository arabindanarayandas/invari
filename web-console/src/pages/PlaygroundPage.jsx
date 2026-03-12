import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Send, Shield, CheckCircle, AlertTriangle,
  Activity, Zap, GitCommit, ChevronDown, ChevronUp, RotateCcw
} from 'lucide-react';
import { proxyRequest } from '../api/publicClient';
import {
  getDemoSpec, getDemoBaseUrl, getDemoEndpoints,
  getDemoLogs, addDemoLog, clearDemoLogs, hasDemoSession
} from '../hooks/useDemoSession';

const METHOD_COLORS = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-emerald-100 text-emerald-700',
  PUT: 'bg-amber-100 text-amber-700',
  PATCH: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
};

const StatusBadge = ({ status }) => {
  if (status === 'stable') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
      <CheckCircle className="w-3 h-3" /> Stable
    </span>
  );
  if (status === 'repaired') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
      <AlertTriangle className="w-3 h-3" /> Repaired
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
      <Shield className="w-3 h-3" /> Blocked
    </span>
  );
};

const PlaygroundPage = () => {
  const navigate = useNavigate();

  const [endpoints, setEndpoints] = useState([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [bodyText, setBodyText] = useState('');
  const [bodyError, setBodyError] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [expandedLog, setExpandedLog] = useState(null);
  const [endpointSearch, setEndpointSearch] = useState('');

  // Guard: redirect to /demo if no session
  useEffect(() => {
    if (!hasDemoSession()) {
      navigate('/demo', { replace: true });
      return;
    }
    setEndpoints(getDemoEndpoints());
    setLogs(getDemoLogs());
  }, [navigate]);

  const refreshLogs = useCallback(() => setLogs(getDemoLogs()), []);

  const selectEndpoint = (ep) => {
    setSelectedEndpoint(ep);
    setResult(null);
    setBodyError('');
    // Pre-populate body from schema example if available
    if (ep.requestBodySchema) {
      const example = buildExampleFromSchema(ep.requestBodySchema);
      setBodyText(JSON.stringify(example, null, 2));
    } else {
      setBodyText('');
    }
  };

  const handleSend = async () => {
    if (!selectedEndpoint) return;
    setBodyError('');

    let parsedBody = null;
    if (bodyText.trim()) {
      try {
        parsedBody = JSON.parse(bodyText);
      } catch {
        setBodyError('Invalid JSON body.');
        return;
      }
    }

    setSending(true);
    setResult(null);
    const startTs = Date.now();
    try {
      const spec = getDemoSpec();
      const baseUrl = getDemoBaseUrl();
      const res = await proxyRequest(spec, baseUrl, selectedEndpoint.method, selectedEndpoint.path, parsedBody);

      if (res.success) {
        setResult(res.data);
        const logEntry = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
          method: selectedEndpoint.method,
          path: selectedEndpoint.path,
          status: res.data.status,
          overheadMs: res.data.overheadMs,
          latencyTotalMs: res.data.latencyTotalMs,
          originalBody: res.data.originalBody,
          sanitizedBody: res.data.sanitizedBody,
          driftDetails: res.data.driftDetails,
          responseStatus: res.data.response?.status ?? null,
          responseBody: res.data.response?.body ?? null,
        };
        const updated = addDemoLog(logEntry);
        setLogs(updated);
      }
    } catch (err) {
      setResult({ status: 'blocked', driftDetails: { reason: err.message }, overheadMs: Date.now() - startTs });
    } finally {
      setSending(false);
    }
  };

  const handleClearLogs = () => {
    clearDemoLogs();
    setLogs([]);
  };

  const filteredEndpoints = endpoints.filter(ep =>
    `${ep.method} ${ep.path} ${ep.summary}`.toLowerCase().includes(endpointSearch.toLowerCase())
  );

  const stats = {
    total: logs.length,
    stable: logs.filter(l => l.status === 'stable').length,
    repaired: logs.filter(l => l.status === 'repaired').length,
    blocked: logs.filter(l => l.status === 'blocked').length,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/demo')}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Upload different spec
          </button>
          <div className="w-px h-4 bg-slate-200" />
          <span className="text-sm font-semibold text-slate-900">Invari Playground</span>
          <span className="text-xs text-slate-400 font-mono truncate max-w-xs">{getDemoBaseUrl()}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{endpoints.length} endpoints</span>
          <span className="text-slate-300">·</span>
          <span className="text-emerald-600 font-medium">No account needed</span>
        </div>
      </header>

      {/* Stats row */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center gap-8">
        {[
          { label: 'Requests', value: stats.total, color: 'text-slate-900' },
          { label: 'Stable', value: stats.stable, color: 'text-emerald-600' },
          { label: 'Repaired', value: stats.repaired, color: 'text-amber-600' },
          { label: 'Blocked', value: stats.blocked, color: 'text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`text-lg font-bold ${color}`}>{value}</span>
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Endpoint list */}
        <div className="w-72 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-slate-100">
            <input
              type="text"
              placeholder="Search endpoints…"
              value={endpointSearch}
              onChange={(e) => setEndpointSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredEndpoints.length === 0 ? (
              <div className="p-4 text-xs text-slate-400 text-center">No endpoints found</div>
            ) : (
              filteredEndpoints.map((ep, idx) => (
                <button
                  key={idx}
                  onClick={() => selectEndpoint(ep)}
                  className={`w-full text-left px-3 py-2.5 border-b border-slate-100 transition-colors ${
                    selectedEndpoint?.method === ep.method && selectedEndpoint?.path === ep.path
                      ? 'bg-slate-900 text-white'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      selectedEndpoint?.method === ep.method && selectedEndpoint?.path === ep.path
                        ? 'bg-white/20 text-white'
                        : METHOD_COLORS[ep.method] || 'bg-slate-100 text-slate-600'
                    }`}>
                      {ep.method}
                    </span>
                  </div>
                  <div className={`text-xs font-mono truncate ${
                    selectedEndpoint?.method === ep.method && selectedEndpoint?.path === ep.path
                      ? 'text-white'
                      : 'text-slate-700'
                  }`}>
                    {ep.path}
                  </div>
                  {ep.summary && (
                    <div className={`text-[10px] truncate mt-0.5 ${
                      selectedEndpoint?.method === ep.method && selectedEndpoint?.path === ep.path
                        ? 'text-slate-300'
                        : 'text-slate-400'
                    }`}>
                      {ep.summary}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Center: Request builder */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedEndpoint ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Activity className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Select an endpoint to start testing</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-4">
              {/* Endpoint header */}
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 text-sm font-bold rounded ${METHOD_COLORS[selectedEndpoint.method] || 'bg-slate-100 text-slate-600'}`}>
                  {selectedEndpoint.method}
                </span>
                <span className="font-mono text-slate-800 text-sm">{selectedEndpoint.path}</span>
                {selectedEndpoint.summary && (
                  <span className="text-xs text-slate-400">— {selectedEndpoint.summary}</span>
                )}
              </div>

              {/* Request body */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                  Request Body
                </label>
                <textarea
                  value={bodyText}
                  onChange={(e) => { setBodyText(e.target.value); setBodyError(''); }}
                  placeholder="// JSON request body"
                  className={`w-full h-48 px-3 py-2.5 bg-slate-50 border rounded-xl font-mono text-xs text-slate-700 placeholder-slate-400 focus:outline-none resize-none ${
                    bodyError ? 'border-red-300' : 'border-slate-300 focus:border-slate-400'
                  }`}
                />
                {bodyError && <p className="text-xs text-red-600 mt-1">{bodyError}</p>}
              </div>

              <button
                onClick={handleSend}
                disabled={sending}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {sending ? (
                  <span>Sending…</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Request
                  </>
                )}
              </button>

              {/* Result panel */}
              {result && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className={`flex items-center gap-3 px-4 py-3 ${
                    result.status === 'stable' ? 'bg-emerald-50 border-b border-emerald-100' :
                    result.status === 'repaired' ? 'bg-amber-50 border-b border-amber-100' :
                    'bg-red-50 border-b border-red-100'
                  }`}>
                    <StatusBadge status={result.status} />
                    {result.overheadMs !== undefined && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Zap className="w-3 h-3" />{result.overheadMs}ms overhead
                      </span>
                    )}
                    {result.response?.status && (
                      <span className={`text-xs font-mono font-semibold ml-auto ${
                        result.response.status < 300 ? 'text-emerald-700' :
                        result.response.status < 400 ? 'text-amber-700' : 'text-red-700'
                      }`}>
                        HTTP {result.response.status}
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-4 bg-white">
                    {/* Drift details */}
                    {result.driftDetails && (
                      <div className={`rounded-lg p-3 text-xs ${
                        result.status === 'blocked' ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'
                      }`}>
                        <p className="font-semibold text-slate-700 mb-1">
                          {result.status === 'blocked' ? 'Block reason' : 'Repair details'}
                        </p>
                        {result.driftDetails.reason && (
                          <p className="text-slate-600">{result.driftDetails.reason}</p>
                        )}
                        {result.driftDetails.repairActions?.map((action, i) => (
                          <div key={i} className="flex items-start gap-1.5 mt-1">
                            <GitCommit className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-700">
                              <strong>{action.type.replace(/_/g, ' ')}</strong>
                              {action.from && action.to && `: "${action.from}" → "${action.to}"`}
                              {action.field && action.fromType && ` ${action.field}: ${action.fromType} → ${action.toType}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bodies */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1.5">Original</p>
                        <pre className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[11px] font-mono text-slate-700 overflow-auto max-h-40 whitespace-pre-wrap">
                          {JSON.stringify(result.originalBody, null, 2) || '—'}
                        </pre>
                      </div>
                      {result.sanitizedBody != null && (
                        <div>
                          <p className="text-[10px] font-semibold text-emerald-600 uppercase mb-1.5">Repaired</p>
                          <pre className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-[11px] font-mono text-emerald-800 overflow-auto max-h-40 whitespace-pre-wrap">
                            {JSON.stringify(result.sanitizedBody, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Response body */}
                    {result.response?.body != null && (
                      <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1.5">Response</p>
                        <pre className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[11px] font-mono text-slate-700 overflow-auto max-h-40 whitespace-pre-wrap">
                          {typeof result.response.body === 'string'
                            ? result.response.body
                            : JSON.stringify(result.response.body, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Session log table */}
      {logs.length > 0 && (
        <div className="border-t border-slate-200 bg-white flex-shrink-0" style={{ maxHeight: '260px' }}>
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Session Log — {logs.length} requests</span>
            <button
              onClick={handleClearLogs}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: '215px' }}>
            {/* Header */}
            <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-100 grid grid-cols-[auto_auto_1fr_auto_auto] gap-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              <span className="w-28">Time</span>
              <span className="w-16">Method</span>
              <span>Path</span>
              <span className="w-24">Status</span>
              <span className="w-20 text-right">Overhead</span>
            </div>
            {logs.map((log) => (
              <div key={log.id}>
                <div
                  className="px-4 py-2 border-b border-slate-100 grid grid-cols-[auto_auto_1fr_auto_auto] gap-3 items-center hover:bg-slate-50 cursor-pointer"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <span className="text-xs text-slate-500 font-mono w-28">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-16 inline-block text-center ${METHOD_COLORS[log.method] || 'bg-slate-100 text-slate-600'}`}>
                    {log.method}
                  </span>
                  <span className="text-xs text-slate-600 font-mono truncate">{log.path}</span>
                  <span className="w-24"><StatusBadge status={log.status} /></span>
                  <span className="text-xs text-cyan-600 font-mono text-right w-20">{log.overheadMs}ms</span>
                </div>
                {expandedLog === log.id && (
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 mb-1">ORIGINAL BODY</p>
                      <pre className="text-[10px] font-mono text-slate-700 whitespace-pre-wrap">
                        {JSON.stringify(log.originalBody, null, 2) || '—'}
                      </pre>
                    </div>
                    {log.sanitizedBody != null && (
                      <div>
                        <p className="text-[10px] font-semibold text-emerald-600 mb-1">REPAIRED BODY</p>
                        <pre className="text-[10px] font-mono text-emerald-700 whitespace-pre-wrap">
                          {JSON.stringify(log.sanitizedBody, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.driftDetails?.reason && (
                      <div className="col-span-2">
                        <p className="text-[10px] font-semibold text-red-600 mb-1">REASON</p>
                        <p className="text-[10px] text-slate-600">{log.driftDetails.reason}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Generate a skeleton example object from a JSON Schema
function buildExampleFromSchema(schema) {
  if (!schema || typeof schema !== 'object') return {};
  if (schema.example !== undefined) return schema.example;
  if (schema.type === 'object' && schema.properties) {
    const obj = {};
    for (const [key, val] of Object.entries(schema.properties)) {
      obj[key] = buildExampleFromSchema(val);
    }
    return obj;
  }
  if (schema.type === 'array') return [buildExampleFromSchema(schema.items)];
  if (schema.type === 'string') return schema.enum?.[0] ?? 'string';
  if (schema.type === 'number' || schema.type === 'integer') return 0;
  if (schema.type === 'boolean') return false;
  return null;
}

export default PlaygroundPage;
