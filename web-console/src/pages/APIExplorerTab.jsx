import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Search,
  ChevronDown,
  ChevronRight,
  Code,
  FileText,
  AlertCircle,
  FlaskConical,
  Loader,
  GitCompare,
} from 'lucide-react';
import apiClient from '../api/client';
import Card from '../components/Card';

const APIExplorerTab = ({ application }) => {
  const [schemas, setSchemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [endpoints, setEndpoints] = useState(null);
  const [endpointsLoading, setEndpointsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethods, setSelectedMethods] = useState(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
  const [expandedEndpoints, setExpandedEndpoints] = useState(new Set());
  const [compareMode, setCompareMode] = useState(false);
  const [compareSchemaId, setCompareSchemaId] = useState(null);
  const [diffData, setDiffData] = useState(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [schemaFilter, setSchemaFilter] = useState('all'); // 'all', 'manual', 'auto-sync'
  const [expandedDiffItems, setExpandedDiffItems] = useState(new Set());

  useEffect(() => {
    loadSchemas();
  }, [application?.id]);

  useEffect(() => {
    if (selectedSchema) {
      loadEndpoints(selectedSchema.id);
    }
  }, [selectedSchema]);

  const loadSchemas = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getSchemas(application.id);
      if (response.success) {
        setSchemas(response.data);
        // Auto-select active schema
        const activeSchema = response.data.find((s) => s.isActive);
        if (activeSchema) {
          setSelectedSchema(activeSchema);
        } else if (response.data.length > 0) {
          setSelectedSchema(response.data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load schemas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEndpoints = async (schemaId) => {
    try {
      setEndpointsLoading(true);
      setCompareMode(false);
      setDiffData(null);
      const response = await apiClient.getSchemaEndpoints(application.id, schemaId);
      if (response.success) {
        setEndpoints(response.data);
      }
    } catch (error) {
      console.error('Failed to load endpoints:', error);
    } finally {
      setEndpointsLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!selectedSchema || !compareSchemaId) return;

    try {
      setDiffLoading(true);
      const response = await apiClient.compareSchemas(
        application.id,
        compareSchemaId,
        selectedSchema.id
      );
      if (response.success) {
        setDiffData(response.data);
        setCompareMode(true);
      }
    } catch (error) {
      console.error('Failed to compare schemas:', error);
    } finally {
      setDiffLoading(false);
    }
  };

  const toggleEndpoint = (endpointId) => {
    const newExpanded = new Set(expandedEndpoints);
    if (newExpanded.has(endpointId)) {
      newExpanded.delete(endpointId);
    } else {
      newExpanded.add(endpointId);
    }
    setExpandedEndpoints(newExpanded);
  };

  const toggleDiffItem = (diffItemId) => {
    const newExpanded = new Set(expandedDiffItems);
    if (newExpanded.has(diffItemId)) {
      newExpanded.delete(diffItemId);
    } else {
      newExpanded.add(diffItemId);
    }
    setExpandedDiffItems(newExpanded);
  };

  const toggleMethod = (method) => {
    if (selectedMethods.includes(method)) {
      setSelectedMethods(selectedMethods.filter((m) => m !== method));
    } else {
      setSelectedMethods([...selectedMethods, method]);
    }
  };

  const getMethodColor = (method) => {
    switch (method) {
      case 'GET':
        return 'bg-blue-500/20 text-blue-700 border-blue-300';
      case 'POST':
        return 'bg-emerald-500/20 text-emerald-700 border-emerald-300';
      case 'PUT':
      case 'PATCH':
        return 'bg-amber-500/20 text-amber-700 border-amber-300';
      case 'DELETE':
        return 'bg-red-500/20 text-red-700 border-red-300';
      default:
        return 'bg-slate-500/20 text-slate-700 border-slate-300';
    }
  };

  const filteredSchemas = schemas.filter((schema) => {
    if (schemaFilter === 'all') return true;
    if (schemaFilter === 'manual') return schema.sourceType === 'manual';
    if (schemaFilter === 'auto-sync') return schema.sourceType === 'auto-sync';
    return true;
  });

  const filteredEndpoints = endpoints?.endpoints?.filter((endpoint) => {
    const matchesSearch =
      searchQuery === '' ||
      endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMethod = selectedMethods.includes(endpoint.method);
    return matchesSearch && matchesMethod;
  }) || [];

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Panel: Version Selector */}
      <div className="col-span-4 space-y-4">
        <Card className="p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Schema Versions</h3>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSchemaFilter('all')}
              className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-all ${
                schemaFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSchemaFilter('manual')}
              className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-all ${
                schemaFilter === 'manual'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Manual
            </button>
            <button
              onClick={() => setSchemaFilter('auto-sync')}
              className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-all ${
                schemaFilter === 'auto-sync'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Auto-Sync
            </button>
          </div>

          {/* Schema List */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : filteredSchemas.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600">No schemas found</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredSchemas.map((schema) => (
                <button
                  key={schema.id}
                  onClick={() => setSelectedSchema(schema)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selectedSchema?.id === schema.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {schema.isActive && (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      )}
                      <span className="text-xs font-semibold text-slate-900">
                        {schema.specVersion}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                      schema.sourceType === 'auto-sync'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {schema.sourceType === 'auto-sync' ? 'Auto' : 'Manual'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mb-1">
                    {schema.endpointCount} endpoints
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {new Date(schema.createdAt).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Right Panel: Endpoint Explorer */}
      <div className="col-span-8 space-y-4">
        {/* Header */}
        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {endpoints?.title || 'API Endpoints'}
              </h3>
              <p className="text-xs text-slate-600">
                Version: {selectedSchema?.specVersion || 'N/A'}
                {selectedSchema?.isActive && (
                  <span className="ml-2 text-emerald-600 font-semibold">(Active)</span>
                )}
              </p>
            </div>
            {endpoints && endpoints.endpointCount > 0 && (
              <span className="text-xs text-slate-600">
                {filteredEndpoints.length} of {endpoints.endpointCount} endpoints
              </span>
            )}
          </div>

          {/* Compare Controls */}
          <div className="flex items-center gap-2">
            <select
              value={compareSchemaId || ''}
              onChange={(e) => setCompareSchemaId(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-300"
            >
              <option value="">Select version to compare...</option>
              {schemas
                .filter((s) => s.id !== selectedSchema?.id)
                .map((schema) => (
                  <option key={schema.id} value={schema.id}>
                    {schema.specVersion} - {schema.sourceType} ({schema.endpointCount} endpoints)
                  </option>
                ))}
            </select>
            <button
              onClick={handleCompare}
              disabled={!compareSchemaId || diffLoading}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-lg font-medium text-sm transition-all disabled:cursor-not-allowed flex items-center gap-2"
            >
              <GitCompare className="w-4 h-4" />
              {diffLoading ? 'Comparing...' : 'Compare'}
            </button>
          </div>
        </Card>

        {/* Diff View or Endpoint Explorer */}
        {compareMode && diffData ? (
          <Card className="p-4 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-900 mb-2">Comparison Results</h4>
              <p className="text-xs text-slate-600">
                Comparing {diffData.fromSchema.version} → {diffData.toSchema.version}
              </p>
              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-emerald-600">+{diffData.summary.added} added</span>
                <span className="text-red-600">-{diffData.summary.removed} removed</span>
                <span className="text-amber-600">~{diffData.summary.modified} modified</span>
                <span className="text-slate-600">{diffData.summary.unchanged} unchanged</span>
              </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {/* Added Endpoints */}
              {diffData.added.map((endpoint, idx) => (
                <div key={`added-${idx}`} className="p-3 bg-emerald-50 border-l-4 border-emerald-500 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-700">+ ADDED</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getMethodColor(endpoint.method)}`}>
                      {endpoint.method}
                    </span>
                    <span className="text-xs font-mono text-slate-900">{endpoint.path}</span>
                  </div>
                  {endpoint.summary && (
                    <p className="text-xs text-slate-600 mt-1">{endpoint.summary}</p>
                  )}
                </div>
              ))}

              {/* Removed Endpoints */}
              {diffData.removed.map((endpoint, idx) => (
                <div key={`removed-${idx}`} className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-red-700">- REMOVED</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getMethodColor(endpoint.method)}`}>
                      {endpoint.method}
                    </span>
                    <span className="text-xs font-mono text-slate-900">{endpoint.path}</span>
                  </div>
                  {endpoint.summary && (
                    <p className="text-xs text-slate-600 mt-1">{endpoint.summary}</p>
                  )}
                </div>
              ))}

              {/* Modified Endpoints */}
              {diffData.modified.map((endpoint, idx) => {
                const diffItemId = `modified-${endpoint.method}-${endpoint.path}-${idx}`;
                const isExpanded = expandedDiffItems.has(diffItemId);

                return (
                  <div key={diffItemId} className="bg-amber-50 border-l-4 border-amber-500 rounded">
                    <button
                      onClick={() => toggleDiffItem(diffItemId)}
                      className="w-full p-3 text-left"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-amber-700" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-amber-700" />
                        )}
                        <span className="text-xs font-bold text-amber-700">~ MODIFIED</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getMethodColor(endpoint.method)}`}>
                          {endpoint.method}
                        </span>
                        <span className="text-xs font-mono text-slate-900">{endpoint.path}</span>
                      </div>
                      {endpoint.summary && (
                        <p className="text-xs text-slate-600 mt-1 pl-6">{endpoint.summary}</p>
                      )}
                      <p className="text-xs text-amber-700 mt-1 pl-6">{endpoint.changes}</p>
                    </button>

                    {isExpanded && endpoint.detailedChanges && (
                      <div className="px-3 pb-3 pl-9 space-y-3 border-t border-amber-200 pt-3">
                        {/* Summary Changes */}
                        {endpoint.detailedChanges.summary && (
                          <div className="p-2 bg-white rounded border border-amber-200">
                            <h6 className="text-xs font-semibold text-slate-900 mb-1">Summary Changed</h6>
                            <div className="space-y-1">
                              <div className="flex items-start gap-2">
                                <span className="text-[10px] font-bold text-red-600">-</span>
                                <span className="text-xs text-red-700 line-through">{endpoint.detailedChanges.summary.from || '(none)'}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-[10px] font-bold text-emerald-600">+</span>
                                <span className="text-xs text-emerald-700">{endpoint.detailedChanges.summary.to || '(none)'}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Description Changes */}
                        {endpoint.detailedChanges.description && (
                          <div className="p-2 bg-white rounded border border-amber-200">
                            <h6 className="text-xs font-semibold text-slate-900 mb-1">Description Changed</h6>
                            <div className="space-y-1">
                              <div className="flex items-start gap-2">
                                <span className="text-[10px] font-bold text-red-600">-</span>
                                <span className="text-xs text-red-700 line-through">{endpoint.detailedChanges.description.from || '(none)'}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-[10px] font-bold text-emerald-600">+</span>
                                <span className="text-xs text-emerald-700">{endpoint.detailedChanges.description.to || '(none)'}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Parameter Changes */}
                        {endpoint.detailedChanges.parameters && (
                          <div className="p-2 bg-white rounded border border-amber-200">
                            <h6 className="text-xs font-semibold text-slate-900 mb-2">Parameter Changes</h6>
                            <div className="space-y-2">
                              {/* Added Parameters */}
                              {endpoint.detailedChanges.parameters.added.map((param, pidx) => (
                                <div key={`added-${pidx}`} className="flex items-start gap-2 p-2 bg-emerald-50 rounded">
                                  <span className="text-[10px] font-bold text-emerald-600">+</span>
                                  <div className="flex-1">
                                    <div className="text-xs font-mono text-emerald-900">
                                      {param.name} <span className="text-emerald-600">({param.in})</span>
                                    </div>
                                    <div className="text-[10px] text-emerald-700">
                                      Type: {param.type}{param.required ? ' • Required' : ' • Optional'}
                                    </div>
                                    {param.description && (
                                      <div className="text-[10px] text-emerald-600 mt-1">{param.description}</div>
                                    )}
                                  </div>
                                </div>
                              ))}

                              {/* Removed Parameters */}
                              {endpoint.detailedChanges.parameters.removed.map((param, pidx) => (
                                <div key={`removed-${pidx}`} className="flex items-start gap-2 p-2 bg-red-50 rounded">
                                  <span className="text-[10px] font-bold text-red-600">-</span>
                                  <div className="flex-1">
                                    <div className="text-xs font-mono text-red-900 line-through">
                                      {param.name} <span className="text-red-600">({param.in})</span>
                                    </div>
                                    <div className="text-[10px] text-red-700">
                                      Type: {param.type}{param.required ? ' • Required' : ' • Optional'}
                                    </div>
                                    {param.description && (
                                      <div className="text-[10px] text-red-600 mt-1">{param.description}</div>
                                    )}
                                  </div>
                                </div>
                              ))}

                              {/* Modified Parameters */}
                              {endpoint.detailedChanges.parameters.modified.map((param, pidx) => (
                                <div key={`modified-${pidx}`} className="flex items-start gap-2 p-2 bg-amber-50 rounded">
                                  <span className="text-[10px] font-bold text-amber-600">~</span>
                                  <div className="flex-1">
                                    <div className="text-xs font-mono text-amber-900">
                                      {param.name} <span className="text-amber-600">({param.in})</span>
                                    </div>
                                    {param.changes.required && (
                                      <div className="text-[10px] text-amber-700 mt-1">
                                        Required: {param.changes.required.from ? 'true' : 'false'} → {param.changes.required.to ? 'true' : 'false'}
                                      </div>
                                    )}
                                    {param.changes.schema && (
                                      <div className="text-[10px] text-amber-700 mt-1">
                                        Type changed
                                      </div>
                                    )}
                                    {param.changes.description && (
                                      <div className="text-[10px] text-amber-700 mt-1">
                                        Description changed
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Request Body Changes */}
                        {endpoint.detailedChanges.requestBody && (
                          <div className="p-2 bg-white rounded border border-amber-200">
                            <h6 className="text-xs font-semibold text-slate-900 mb-1">Request Body Changed</h6>
                            {endpoint.detailedChanges.requestBody.type === 'added' && (
                              <div className="p-2 bg-emerald-50 rounded">
                                <span className="text-[10px] font-bold text-emerald-600">+ Added request body</span>
                              </div>
                            )}
                            {endpoint.detailedChanges.requestBody.type === 'removed' && (
                              <div className="p-2 bg-red-50 rounded">
                                <span className="text-[10px] font-bold text-red-600">- Removed request body</span>
                              </div>
                            )}
                            {endpoint.detailedChanges.requestBody.type === 'modified' && (
                              <div className="p-2 bg-amber-50 rounded">
                                <span className="text-[10px] font-bold text-amber-600">~ Request body schema modified</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Response Changes */}
                        {endpoint.detailedChanges.responses && (
                          <div className="p-2 bg-white rounded border border-amber-200">
                            <h6 className="text-xs font-semibold text-slate-900 mb-2">Response Changes</h6>
                            <div className="space-y-2">
                              {/* Added Responses */}
                              {endpoint.detailedChanges.responses.added.map((resp, ridx) => (
                                <div key={`added-${ridx}`} className="flex items-start gap-2 p-2 bg-emerald-50 rounded">
                                  <span className="text-[10px] font-bold text-emerald-600">+</span>
                                  <div className="flex-1">
                                    <div className="text-xs font-mono text-emerald-900">
                                      {resp.statusCode} {resp.description}
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* Removed Responses */}
                              {endpoint.detailedChanges.responses.removed.map((resp, ridx) => (
                                <div key={`removed-${ridx}`} className="flex items-start gap-2 p-2 bg-red-50 rounded">
                                  <span className="text-[10px] font-bold text-red-600">-</span>
                                  <div className="flex-1">
                                    <div className="text-xs font-mono text-red-900 line-through">
                                      {resp.statusCode} {resp.description}
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* Modified Responses */}
                              {endpoint.detailedChanges.responses.modified.map((resp, ridx) => (
                                <div key={`modified-${ridx}`} className="flex items-start gap-2 p-2 bg-amber-50 rounded">
                                  <span className="text-[10px] font-bold text-amber-600">~</span>
                                  <div className="flex-1">
                                    <div className="text-xs font-mono text-amber-900">
                                      {resp.statusCode} - Schema modified
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <>
            {/* Search and Filters */}
            <Card className="p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search endpoints..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-300"
                  />
                </div>
              </div>

              {/* Method Filters */}
              <div className="flex gap-2">
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => (
                  <button
                    key={method}
                    onClick={() => toggleMethod(method)}
                    className={`px-3 py-1 text-xs font-bold rounded border transition-all ${
                      selectedMethods.includes(method)
                        ? getMethodColor(method)
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </Card>

            {/* Endpoints List */}
            {endpointsLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader className="w-6 h-6 text-slate-400 animate-spin" />
              </div>
            ) : !endpoints ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">Select a schema version to view endpoints</p>
                </div>
              </div>
            ) : filteredEndpoints.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">No endpoints match your filters</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEndpoints.map((endpoint, idx) => {
                  const endpointId = `${endpoint.method}-${endpoint.path}-${idx}`;
                  const isExpanded = expandedEndpoints.has(endpointId);

                  return (
                    <Card key={endpointId} className="p-3 shadow-sm">
                      <button
                        onClick={() => toggleEndpoint(endpointId)}
                        className="w-full flex items-start justify-between group"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                          <span className={`px-2 py-1 text-xs font-bold rounded border ${getMethodColor(endpoint.method)}`}>
                            {endpoint.method}
                          </span>
                          <div className="flex-1 text-left">
                            <div className="text-sm font-mono text-slate-900">
                              {endpoint.path}
                            </div>
                            {endpoint.summary && (
                              <div className="text-xs text-slate-600 mt-0.5">
                                {endpoint.summary}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="mt-3 pl-7 space-y-3 border-t border-slate-200 pt-3">
                          {endpoint.description && (
                            <div>
                              <h5 className="text-xs font-semibold text-slate-900 mb-1">Description</h5>
                              <p className="text-xs text-slate-600">{endpoint.description}</p>
                            </div>
                          )}

                          {endpoint.parameters && endpoint.parameters.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-slate-900 mb-1">Parameters</h5>
                              <div className="space-y-1">
                                {endpoint.parameters.map((param, pidx) => (
                                  <div key={pidx} className="text-xs text-slate-600 font-mono">
                                    {param.name} ({param.in}): {param.schema?.type || 'any'}
                                    {param.required && <span className="text-red-600 ml-1">*</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {endpoint.requestBody && (
                            <div>
                              <h5 className="text-xs font-semibold text-slate-900 mb-1">Request Body</h5>
                              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                                <pre className="text-xs text-slate-700 whitespace-pre-wrap">
                                  {JSON.stringify(endpoint.requestBody, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}

                          {endpoint.responses && (
                            <div>
                              <h5 className="text-xs font-semibold text-slate-900 mb-1">Responses</h5>
                              <div className="space-y-2">
                                {Object.keys(endpoint.responses).map((statusCode) => (
                                  <div key={statusCode} className="p-2 bg-slate-50 rounded border border-slate-200">
                                    <div className="text-xs font-semibold text-slate-900 mb-1">
                                      {statusCode}: {endpoint.responses[statusCode].description || 'Response'}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default APIExplorerTab;
