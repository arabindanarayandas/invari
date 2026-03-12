import React, { useState, useEffect } from 'react';
import {
  Activity, Search, X, Pause, Shield, CheckCircle, AlertTriangle,
  ArrowUpDown, ArrowUp, ArrowDown, GitCommit,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { useAgentLogs } from '../hooks/useAgentStats';

const LiveTrafficPage = ({ application }) => {
  const [selectedLog, setSelectedLog] = useState(null);
  const [page, setPage] = useState(1);
  const [methodFilter, setMethodFilter] = useState(null);
  const [endpointSearch, setEndpointSearch] = useState('');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isLive, setIsLive] = useState(true);

  // Build filters object
  const filters = {};
  if (methodFilter) filters.httpMethod = methodFilter;
  if (endpointSearch) filters.endpointSearch = endpointSearch;

  // Build sorting object
  const sorting = {
    sortBy: sortBy || 'timestamp',
    sortOrder: sortOrder || 'desc',
  };

  const { logs: backendLogs, pagination, loading: logsLoading } = useAgentLogs(
    application?.id,
    page,
    50,
    filters,
    sorting,
    isLive, // Enable polling when in live mode
    1000 // Poll every 1 second (1000ms)
  );

  const logs = backendLogs || [];

  // Reset to page 1 when filters or sort change
  useEffect(() => { setPage(1); }, [methodFilter, endpointSearch, sortBy, sortOrder]);

  // Reset to page 1 when going live
  useEffect(() => { if (isLive) setPage(1); }, [isLive]);

  // Handle column sorting
  const handleSort = (columnName) => {
    if (sortBy === columnName) {
      // Toggle sort order if clicking the same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending
      setSortBy(columnName);
      setSortOrder('desc');
    }
  };

  // Render sort icon for a column
  const renderSortIcon = (columnName) => {
    if (sortBy !== columnName) {
      return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    }
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3 h-3" />
      : <ArrowDown className="w-3 h-3" />;
  };

  return (
    <div className="space-y-6">
      {/* Live Traffic Panel */}
      <div className="relative">
        <Card className="bg-white shadow-sm flex flex-col h-[calc(100vh-250px)] min-h-[600px]">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-semibold text-slate-900">Live Traffic Monitor</h2>
                {isLive ? (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-600 text-[10px] font-semibold">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    Live
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-600 text-[10px] font-semibold">
                    <Pause className="w-2.5 h-2.5" />
                    Paused
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsLive(!isLive)}
                className={`p-1.5 border rounded transition-colors ${
                  isLive
                    ? 'bg-slate-100 border-slate-300 hover:border-slate-400'
                    : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                }`}
                title={isLive ? 'Pause traffic' : 'Resume traffic'}
              >
                {isLive ? (
                  <Pause className="w-4 h-4 text-red-600" />
                ) : (
                  <Activity className="w-4 h-4 text-emerald-600" />
                )}
              </button>
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search endpoint..."
                value={endpointSearch}
                onChange={(e) => setEndpointSearch(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-300"
              />

              <select
                value={methodFilter || ''}
                onChange={(e) => setMethodFilter(e.target.value || null)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-700 focus:outline-none focus:border-indigo-300"
              >
                <option value="">All Methods</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </div>

          {/* Table Header */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-[auto_auto_1fr_auto_auto] gap-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider items-center">
              <button
                onClick={() => handleSort('timestamp')}
                className="flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer w-32"
              >
                Time
                {renderSortIcon('timestamp')}
              </button>
              <div className="w-16">Method</div>
              <div>Endpoint</div>
              <div className="w-24">Status</div>
              <button
                onClick={() => handleSort('overheadMs')}
                className="flex items-center justify-end gap-1 hover:text-slate-700 transition-colors cursor-pointer w-20"
              >
                Overhead
                {renderSortIcon('overheadMs')}
              </button>
            </div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto">
            {logsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-slate-600">Loading logs...</div>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-slate-600">No requests logged yet</div>
              </div>
            ) : (
              logs.map((log) => {
                // Format timestamp
                const timestamp = new Date(log.timestamp).toLocaleTimeString();

                return (
                  <div
                    key={log.id}
                    className={`px-4 py-3 border-b border-slate-200 transition-all ${
                      selectedLog?.id === log.id
                        ? 'bg-indigo-50 border-l-2 border-l-indigo-300'
                        : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="grid grid-cols-[auto_auto_1fr_auto_auto] gap-3 items-center">
                      <div className="text-xs text-slate-500 font-mono w-32">
                        {timestamp}
                      </div>
                      <div className="w-16">
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                          log.httpMethod === 'GET' ? 'bg-blue-100 text-blue-600' :
                          log.httpMethod === 'POST' ? 'bg-emerald-100 text-emerald-600' :
                          log.httpMethod === 'PUT' || log.httpMethod === 'PATCH' ? 'bg-amber-100 text-amber-600' :
                          log.httpMethod === 'DELETE' ? 'bg-red-100 text-red-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {log.httpMethod}
                        </span>
                      </div>
                      <div
                        className="text-xs text-slate-600 font-mono truncate cursor-pointer"
                        onClick={() => {
                          if (selectedLog?.id === log.id) {
                            setSelectedLog(null);
                          } else {
                            setSelectedLog(log);
                          }
                        }}
                      >
                        {log.endpointPath}
                      </div>
                      <div className="w-24">
                        <Badge status={log.status} />
                      </div>
                      <div className="text-xs text-cyan-600 text-right font-mono w-20">
                        {log.overheadMs}ms
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Bar */}
          {pagination && pagination.totalPages > 1 && (
            <div className="px-4 py-2.5 border-t border-slate-200 flex items-center justify-between bg-white">
              <span className="text-xs text-slate-500">
                {pagination.total.toLocaleString()} total &middot; page {pagination.page} of {pagination.totalPages}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page <= 1}
                  className="px-2 py-1 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  «
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1 text-slate-600 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* Page number pills */}
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === '...' ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`min-w-[26px] px-1.5 py-1 text-xs rounded border transition-colors ${
                          page === p
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )
                }

                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="p-1 text-slate-600 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPage(pagination.totalPages)}
                  disabled={page >= pagination.totalPages}
                  className="px-2 py-1 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* Slide-out Panel: Request Details Inspector */}
        <div
          className={`fixed top-0 right-0 h-full w-[500px] bg-white border-l border-slate-200 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
            selectedLog ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <Card className="bg-transparent border-0 flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900">Request Details</h2>
                {selectedLog && (
                  <span className="text-xs text-slate-500 font-mono">{selectedLog.id}</span>
                )}
              </div>
              {selectedLog && (
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-slate-600" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {selectedLog ? (
                <div className="space-y-6">
                  {/* Request Overview */}
                  <div className="bg-slate-100 rounded-lg p-4 border border-slate-300 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Request Overview</h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-start">
                        <span className="text-slate-600">Request ID:</span>
                        <span className="text-slate-700 font-mono text-right break-all max-w-[60%]">{selectedLog.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Timestamp:</span>
                        <span className="text-slate-700 font-mono">{new Date(selectedLog.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Method:</span>
                        <span className={`font-mono font-semibold ${
                          selectedLog.httpMethod === 'GET' ? 'text-blue-600' :
                          selectedLog.httpMethod === 'POST' ? 'text-emerald-600' :
                          selectedLog.httpMethod === 'PUT' || selectedLog.httpMethod === 'PATCH' ? 'text-amber-600' :
                          selectedLog.httpMethod === 'DELETE' ? 'text-red-600' :
                          'text-slate-700'
                        }`}>{selectedLog.httpMethod}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-slate-600">Endpoint:</span>
                        <span className="text-slate-700 font-mono text-right break-all max-w-[60%]">{selectedLog.endpointPath}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Agent Identifier:</span>
                        <span className="text-slate-700 font-mono">{selectedLog.agentIdentifier || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                      selectedLog.status === 'blocked'
                        ? 'bg-red-50 border-red-200'
                        : selectedLog.status === 'repaired'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-emerald-50 border-emerald-200'
                    }`}>
                      {selectedLog.status === 'blocked' ? (
                        <Shield className="w-4 h-4 text-red-600" />
                      ) : selectedLog.status === 'repaired' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      )}
                      <span className={`text-sm font-semibold ${
                        selectedLog.status === 'blocked'
                          ? 'text-red-600'
                          : selectedLog.status === 'repaired'
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}>
                        {selectedLog.status === 'blocked' ? 'Blocked' : selectedLog.status === 'repaired' ? 'Repaired' : 'Stable'}
                      </span>
                    </div>
                    {selectedLog.status === 'repaired' && selectedLog.driftDetails?.confidence !== undefined && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 border border-green-300 rounded-lg shadow-sm">
                        <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-xs font-semibold text-green-700">
                          Confidence: {(selectedLog.driftDetails.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Overhead Display */}
                  <div className="bg-slate-100 rounded-lg p-4 border border-slate-300 shadow-sm">
                    <div className="text-xs text-slate-600 mb-2">Invari Overhead</div>
                    <div className="text-2xl font-bold text-slate-900 mb-1">{selectedLog.overheadMs}ms</div>
                    <div className="text-xs text-slate-500">Validation processing time</div>
                  </div>

                  {/* Drift Details */}
                  {selectedLog.driftDetails && (
                    <div className="space-y-3">
                      {/* Repair Summary */}
                      {selectedLog.status === 'repaired' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                              <span className="text-xs font-semibold text-amber-700">Auto-Repaired Request</span>
                            </div>
                            {selectedLog.driftDetails.repairTimeMs !== undefined && (
                              <span className="text-xs text-amber-600 font-mono">
                                {selectedLog.driftDetails.repairTimeMs}ms
                              </span>
                            )}
                          </div>

                          {/* Original Errors */}
                          {selectedLog.driftDetails.originalErrors && selectedLog.driftDetails.originalErrors.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <div className="text-xs font-semibold text-slate-700 mb-1">Issues Detected:</div>
                              {selectedLog.driftDetails.originalErrors.map((error, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-xs">
                                  <span className="text-red-600">✗</span>
                                  <div>
                                    <span className="font-mono text-red-700">{error.field}</span>
                                    <span className="text-slate-600"> - {error.message}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Blocked Details */}
                      {selectedLog.status === 'blocked' && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 mt-0.5 text-red-600" />
                            <div className="flex-1">
                              <div className="text-xs font-semibold text-red-600 mb-1">Request Blocked</div>
                              <div className="text-xs text-slate-700">
                                {selectedLog.driftDetails.reason || JSON.stringify(selectedLog.driftDetails, null, 2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Request Body */}
                  {selectedLog.originalBody && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-3">Request Body</h3>
                      <div className="mb-3">
                        <div className="text-xs text-amber-600 font-medium mb-2">Original Payload</div>
                        <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 font-mono text-xs max-h-64 overflow-auto">
                          <pre className="text-slate-700 whitespace-pre-wrap">
                            {JSON.stringify(selectedLog.originalBody, null, 2)}
                          </pre>
                        </div>
                      </div>

                      {/* Sanitized Payload */}
                      {selectedLog.sanitizedBody && (
                        <div>
                          <div className="text-xs text-emerald-600 font-medium mb-2">Sanitized Payload</div>
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 font-mono text-xs max-h-64 overflow-auto">
                            <pre className="text-emerald-700 whitespace-pre-wrap">
                              {JSON.stringify(selectedLog.sanitizedBody, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Repair Actions - Enhanced with OpenAPI Spec Display */}
                      {selectedLog.driftDetails?.repairActions && selectedLog.driftDetails.repairActions.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-semibold text-slate-700">Repair Actions Applied</div>
                            <div className="flex-1 border-t border-slate-300"></div>
                          </div>
                          {selectedLog.driftDetails.repairActions.map((action, idx) => (
                            <div key={idx} className="bg-white border border-slate-300 rounded-lg p-3 shadow-sm">
                              <div className="flex items-start gap-2 mb-2">
                                <GitCommit className="w-3.5 h-3.5 text-indigo-600 mt-0.5" />
                                <div className="flex-1">
                                  <div className="text-xs font-semibold text-slate-900 capitalize">
                                    {action.type.replace(/_/g, ' ')}
                                  </div>
                                </div>
                              </div>

                              {/* Type Coercion */}
                              {action.type === 'type_coercion' && (
                                <div className="ml-5 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-600">Field:</span>
                                    <span className="text-xs font-mono text-slate-900">{action.field}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="flex-1 bg-red-50 border border-red-200 rounded px-2 py-1">
                                      <div className="text-[9px] text-red-600 font-medium mb-0.5">Original</div>
                                      <div className="text-red-700 font-mono">
                                        {JSON.stringify(action.originalValue)} ({action.fromType})
                                      </div>
                                    </div>
                                    <div className="text-slate-400">→</div>
                                    <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                                      <div className="text-[9px] text-emerald-600 font-medium mb-0.5">Corrected</div>
                                      <div className="text-emerald-700 font-mono">
                                        {JSON.stringify(action.coercedValue)} ({action.toType})
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Field Rename */}
                              {action.type === 'field_rename' && (
                                <div className="ml-5 space-y-2">
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="flex-1 bg-red-50 border border-red-200 rounded px-2 py-1">
                                      <div className="text-[9px] text-red-600 font-medium mb-0.5">Received</div>
                                      <div className="text-red-700 font-mono line-through">{action.from}</div>
                                    </div>
                                    <div className="text-slate-400">→</div>
                                    <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                                      <div className="text-[9px] text-emerald-600 font-medium mb-0.5">Expected (OpenAPI)</div>
                                      <div className="text-emerald-700 font-mono">{action.to}</div>
                                    </div>
                                  </div>
                                  {action.confidence !== undefined && (
                                    <div className="text-[10px] text-slate-600 ml-1">
                                      Match confidence: {(action.confidence * 100).toFixed(0)}%
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Other action types */}
                              {!['type_coercion', 'field_rename'].includes(action.type) && action.field && (
                                <div className="ml-5 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-600">Field:</span>
                                    <span className="text-xs font-mono text-slate-900">{action.field}</span>
                                  </div>
                                  {action.reason && (
                                    <div className="text-[10px] text-slate-600 italic ml-1">
                                      {action.reason}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Response Details */}
                  {selectedLog.responseStatus && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-3">Response</h3>
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-slate-600">Status Code:</span>
                          <span className={`px-2 py-1 rounded font-mono text-xs font-semibold ${
                            selectedLog.responseStatus >= 200 && selectedLog.responseStatus < 300
                              ? 'bg-emerald-100 text-emerald-600'
                              : selectedLog.responseStatus >= 400
                              ? 'bg-red-100 text-red-600'
                              : 'bg-amber-100 text-amber-600'
                          }`}>
                            {selectedLog.responseStatus}
                          </span>
                        </div>
                      </div>

                      {/* Response Body */}
                      {selectedLog.responseBody && (
                        <div>
                          <div className="text-xs text-slate-600 font-medium mb-2">Response Body</div>
                          <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 font-mono text-xs max-h-64 overflow-auto">
                            <pre className="text-slate-700 whitespace-pre-wrap">
                              {typeof selectedLog.responseBody === 'string'
                                ? selectedLog.responseBody
                                : JSON.stringify(selectedLog.responseBody, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                  <Search className="w-12 h-12 opacity-20 mb-3" />
                  <p className="text-sm">Select a request to view details</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Backdrop Overlay */}
        {selectedLog && (
          <div
            className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
            onClick={() => setSelectedLog(null)}
          />
        )}
      </div>
    </div>
  );
};

export default LiveTrafficPage;
