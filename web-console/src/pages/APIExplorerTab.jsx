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
        return 'bg-primary/10 text-primary border-primary/20';
      case 'POST':
        return 'bg-success/10 text-success border-success/20';
      case 'PUT':
      case 'PATCH':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'DELETE':
        return 'bg-error/10 text-error border-error/20';
      default:
        return 'bg-surface-container-low text-on-surface-variant border-outline-variant';
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
        <Card className="p-4">
          <h3 className="text-body-sm font-semibold text-on-surface mb-3">Schema Versions</h3>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSchemaFilter('all')}
              className={`flex-1 px-2 py-1 text-label-sm font-medium rounded-sm transition-all ${
                schemaFilter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSchemaFilter('manual')}
              className={`flex-1 px-2 py-1 text-label-sm font-medium rounded-sm transition-all ${
                schemaFilter === 'manual'
                  ? 'bg-primary text-white'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              Manual
            </button>
            <button
              onClick={() => setSchemaFilter('auto-sync')}
              className={`flex-1 px-2 py-1 text-label-sm font-medium rounded-sm transition-all ${
                schemaFilter === 'auto-sync'
                  ? 'bg-primary text-white'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              Auto-Sync
            </button>
          </div>

          {/* Schema List */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader className="w-6 h-6 text-on-surface-variant animate-spin" />
            </div>
          ) : filteredSchemas.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-on-surface-variant mx-auto mb-2" />
              <p className="text-body-sm text-on-surface-variant">No schemas found</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredSchemas.map((schema) => (
                <button
                  key={schema.id}
                  onClick={() => setSelectedSchema(schema)}
                  className={`w-full text-left p-3 rounded-sm border-2 transition-all ${
                    selectedSchema?.id === schema.id
                      ? 'border-primary bg-primary/10'
                      : 'border-outline-variant hover:border-outline bg-surface'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {schema.isActive && (
                        <CheckCircle className="w-4 h-4 text-success" />
                      )}
                      <span className="text-label-sm font-semibold text-on-surface">
                        {schema.specVersion}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 text-label-sm font-semibold rounded-sm ${
                      schema.sourceType === 'auto-sync'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-surface-container-low text-on-surface-variant'
                    }`}>
                      {schema.sourceType === 'auto-sync' ? 'Auto' : 'Manual'}
                    </span>
                  </div>
                  <div className="text-label-sm text-on-surface-variant mb-1">
                    {schema.endpointCount} endpoints
                  </div>
                  <div className="text-label-sm text-on-surface-variant">
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
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-body-sm font-semibold text-on-surface">
                {endpoints?.title || 'API Endpoints'}
              </h3>
              <p className="text-label-sm text-on-surface-variant">
                Version: {selectedSchema?.specVersion || 'N/A'}
                {selectedSchema?.isActive && (
                  <span className="ml-2 text-success font-semibold">(Active)</span>
                )}
              </p>
            </div>
            {endpoints && endpoints.endpointCount > 0 && (
              <span className="text-label-sm text-on-surface-variant">
                {filteredEndpoints.length} of {endpoints.endpointCount} endpoints
              </span>
            )}
          </div>

          {/* Compare Controls */}
          <div className="flex items-center gap-2">
            <select
              value={compareSchemaId || ''}
              onChange={(e) => setCompareSchemaId(e.target.value)}
              className="flex-1 px-3 py-2 text-body-sm border border-outline-variant rounded-sm focus:outline-none focus:border-primary text-on-surface"
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
              className="px-4 py-2 bg-primary hover:bg-blue-700 disabled:bg-surface-container-high disabled:text-on-surface-variant text-white rounded-sm font-medium text-body-sm transition-all disabled:cursor-not-allowed flex items-center gap-2"
            >
              <GitCompare className="w-4 h-4" />
              {diffLoading ? 'Comparing...' : 'Compare'}
            </button>
          </div>
        </Card>

        {/* Diff View or Endpoint Explorer */}
        {compareMode && diffData ? (
          <Card className="p-4">
            <div className="mb-4">
              <h4 className="text-body-sm font-semibold text-on-surface mb-2">Comparison Results</h4>
              <p className="text-label-sm text-on-surface-variant">
                Comparing {diffData.fromSchema.version} → {diffData.toSchema.version}
              </p>
              <div className="flex gap-4 mt-2 text-label-sm">
                <span className="text-success">+{diffData.summary.added} added</span>
                <span className="text-error">-{diffData.summary.removed} removed</span>
                <span className="text-warning">~{diffData.summary.modified} modified</span>
                <span className="text-on-surface-variant">{diffData.summary.unchanged} unchanged</span>
              </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {/* Added Endpoints */}
              {diffData.added.map((endpoint, idx) => (
                <div key={`added-${idx}`} className="p-3 bg-success/10 border-l-4 border-success rounded-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-label-sm font-bold text-success">+ ADDED</span>
                    <span className={`px-2 py-0.5 text-label-sm font-bold rounded-sm border ${getMethodColor(endpoint.method)}`}>
                      {endpoint.method}
                    </span>
                    <span className="text-label-sm font-mono text-on-surface">{endpoint.path}</span>
                  </div>
                  {endpoint.summary && (
                    <p className="text-label-sm text-on-surface-variant mt-1">{endpoint.summary}</p>
                  )}
                </div>
              ))}

              {/* Removed Endpoints */}
              {diffData.removed.map((endpoint, idx) => (
                <div key={`removed-${idx}`} className="p-3 bg-error/10 border-l-4 border-error rounded-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-label-sm font-bold text-error">- REMOVED</span>
                    <span className={`px-2 py-0.5 text-label-sm font-bold rounded-sm border ${getMethodColor(endpoint.method)}`}>
                      {endpoint.method}
                    </span>
                    <span className="text-label-sm font-mono text-on-surface">{endpoint.path}</span>
                  </div>
                  {endpoint.summary && (
                    <p className="text-label-sm text-on-surface-variant mt-1">{endpoint.summary}</p>
                  )}
                </div>
              ))}

              {/* Modified Endpoints */}
              {diffData.modified.map((endpoint, idx) => {
                const diffItemId = `modified-${endpoint.method}-${endpoint.path}-${idx}`;
                const isExpanded = expandedDiffItems.has(diffItemId);

                return (
                  <div key={diffItemId} className="bg-warning/10 border-l-4 border-warning rounded-sm">
                    <button
                      onClick={() => toggleDiffItem(diffItemId)}
                      className="w-full p-3 text-left"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-warning" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-warning" />
                        )}
                        <span className="text-label-sm font-bold text-warning">~ MODIFIED</span>
                        <span className={`px-2 py-0.5 text-label-sm font-bold rounded-sm border ${getMethodColor(endpoint.method)}`}>
                          {endpoint.method}
                        </span>
                        <span className="text-label-sm font-mono text-on-surface">{endpoint.path}</span>
                      </div>
                      {endpoint.summary && (
                        <p className="text-label-sm text-on-surface-variant mt-1 pl-6">{endpoint.summary}</p>
                      )}
                      <p className="text-label-sm text-warning mt-1 pl-6">{endpoint.changes}</p>
                    </button>

                    {isExpanded && endpoint.detailedChanges && (
                      <div className="px-3 pb-3 pl-9 space-y-3 border-t border-warning/20 pt-3">
                        {/* Summary Changes */}
                        {endpoint.detailedChanges.summary && (
                          <div className="p-2 bg-surface rounded-sm border border-warning/20">
                            <h6 className="text-label-sm font-semibold text-on-surface mb-1">Summary Changed</h6>
                            <div className="space-y-1">
                              <div className="flex items-start gap-2">
                                <span className="text-label-sm font-bold text-error">-</span>
                                <span className="text-label-sm text-error line-through">{endpoint.detailedChanges.summary.from || '(none)'}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-label-sm font-bold text-success">+</span>
                                <span className="text-label-sm text-success">{endpoint.detailedChanges.summary.to || '(none)'}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Description Changes */}
                        {endpoint.detailedChanges.description && (
                          <div className="p-2 bg-surface rounded-sm border border-warning/20">
                            <h6 className="text-label-sm font-semibold text-on-surface mb-1">Description Changed</h6>
                            <div className="space-y-1">
                              <div className="flex items-start gap-2">
                                <span className="text-label-sm font-bold text-error">-</span>
                                <span className="text-label-sm text-error line-through">{endpoint.detailedChanges.description.from || '(none)'}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-label-sm font-bold text-success">+</span>
                                <span className="text-label-sm text-success">{endpoint.detailedChanges.description.to || '(none)'}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Parameter Changes */}
                        {endpoint.detailedChanges.parameters && (
                          <div className="p-2 bg-surface rounded-sm border border-warning/20">
                            <h6 className="text-label-sm font-semibold text-on-surface mb-2">Parameter Changes</h6>
                            <div className="space-y-2">
                              {/* Added Parameters */}
                              {endpoint.detailedChanges.parameters.added.map((param, pidx) => (
                                <div key={`added-${pidx}`} className="flex items-start gap-2 p-2 bg-success/10 rounded-sm">
                                  <span className="text-label-sm font-bold text-success">+</span>
                                  <div className="flex-1">
                                    <div className="text-label-sm font-mono text-success">
                                      {param.name} <span className="text-success">({param.in})</span>
                                    </div>
                                    <div className="text-label-sm text-success">
                                      Type: {param.type}{param.required ? ' • Required' : ' • Optional'}
                                    </div>
                                    {param.description && (
                                      <div className="text-label-sm text-success mt-1">{param.description}</div>
                                    )}
                                  </div>
                                </div>
                              ))}

                              {/* Removed Parameters */}
                              {endpoint.detailedChanges.parameters.removed.map((param, pidx) => (
                                <div key={`removed-${pidx}`} className="flex items-start gap-2 p-2 bg-error/10 rounded-sm">
                                  <span className="text-label-sm font-bold text-error">-</span>
                                  <div className="flex-1">
                                    <div className="text-label-sm font-mono text-error line-through">
                                      {param.name} <span className="text-error">({param.in})</span>
                                    </div>
                                    <div className="text-label-sm text-error">
                                      Type: {param.type}{param.required ? ' • Required' : ' • Optional'}
                                    </div>
                                    {param.description && (
                                      <div className="text-label-sm text-error mt-1">{param.description}</div>
                                    )}
                                  </div>
                                </div>
                              ))}

                              {/* Modified Parameters */}
                              {endpoint.detailedChanges.parameters.modified.map((param, pidx) => (
                                <div key={`modified-${pidx}`} className="flex items-start gap-2 p-2 bg-warning/10 rounded-sm">
                                  <span className="text-label-sm font-bold text-warning">~</span>
                                  <div className="flex-1">
                                    <div className="text-label-sm font-mono text-warning">
                                      {param.name} <span className="text-warning">({param.in})</span>
                                    </div>
                                    {param.changes.required && (
                                      <div className="text-label-sm text-warning mt-1">
                                        Required: {param.changes.required.from ? 'true' : 'false'} → {param.changes.required.to ? 'true' : 'false'}
                                      </div>
                                    )}
                                    {param.changes.schema && (
                                      <div className="text-label-sm text-warning mt-1">
                                        Type changed
                                      </div>
                                    )}
                                    {param.changes.description && (
                                      <div className="text-label-sm text-warning mt-1">
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
                          <div className="p-2 bg-surface rounded-sm border border-warning/20">
                            <h6 className="text-label-sm font-semibold text-on-surface mb-1">Request Body Changed</h6>
                            {endpoint.detailedChanges.requestBody.type === 'added' && (
                              <div className="p-2 bg-success/10 rounded-sm">
                                <span className="text-label-sm font-bold text-success">+ Added request body</span>
                              </div>
                            )}
                            {endpoint.detailedChanges.requestBody.type === 'removed' && (
                              <div className="p-2 bg-error/10 rounded-sm">
                                <span className="text-label-sm font-bold text-error">- Removed request body</span>
                              </div>
                            )}
                            {endpoint.detailedChanges.requestBody.type === 'modified' && (
                              <div className="p-2 bg-warning/10 rounded-sm">
                                <span className="text-label-sm font-bold text-warning">~ Request body schema modified</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Response Changes */}
                        {endpoint.detailedChanges.responses && (
                          <div className="p-2 bg-surface rounded-sm border border-warning/20">
                            <h6 className="text-label-sm font-semibold text-on-surface mb-2">Response Changes</h6>
                            <div className="space-y-2">
                              {/* Added Responses */}
                              {endpoint.detailedChanges.responses.added.map((resp, ridx) => (
                                <div key={`added-${ridx}`} className="flex items-start gap-2 p-2 bg-success/10 rounded-sm">
                                  <span className="text-label-sm font-bold text-success">+</span>
                                  <div className="flex-1">
                                    <div className="text-label-sm font-mono text-success">
                                      {resp.statusCode} {resp.description}
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* Removed Responses */}
                              {endpoint.detailedChanges.responses.removed.map((resp, ridx) => (
                                <div key={`removed-${ridx}`} className="flex items-start gap-2 p-2 bg-error/10 rounded-sm">
                                  <span className="text-label-sm font-bold text-error">-</span>
                                  <div className="flex-1">
                                    <div className="text-label-sm font-mono text-error line-through">
                                      {resp.statusCode} {resp.description}
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* Modified Responses */}
                              {endpoint.detailedChanges.responses.modified.map((resp, ridx) => (
                                <div key={`modified-${ridx}`} className="flex items-start gap-2 p-2 bg-warning/10 rounded-sm">
                                  <span className="text-label-sm font-bold text-warning">~</span>
                                  <div className="flex-1">
                                    <div className="text-label-sm font-mono text-warning">
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
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search endpoints..."
                    className="w-full pl-10 pr-4 py-2 text-body-sm border border-outline-variant rounded-sm focus:outline-none focus:border-primary text-on-surface"
                  />
                </div>
              </div>

              {/* Method Filters */}
              <div className="flex gap-2">
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => (
                  <button
                    key={method}
                    onClick={() => toggleMethod(method)}
                    className={`px-3 py-1 text-label-sm font-bold rounded-sm border transition-all ${
                      selectedMethods.includes(method)
                        ? getMethodColor(method)
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant'
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
                <Loader className="w-6 h-6 text-on-surface-variant animate-spin" />
              </div>
            ) : !endpoints ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-on-surface-variant mx-auto mb-2" />
                  <p className="text-body-sm text-on-surface-variant">Select a schema version to view endpoints</p>
                </div>
              </div>
            ) : filteredEndpoints.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-on-surface-variant mx-auto mb-2" />
                  <p className="text-body-sm text-on-surface-variant">No endpoints match your filters</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEndpoints.map((endpoint, idx) => {
                  const endpointId = `${endpoint.method}-${endpoint.path}-${idx}`;
                  const isExpanded = expandedEndpoints.has(endpointId);

                  return (
                    <Card key={endpointId} className="p-3">
                      <button
                        onClick={() => toggleEndpoint(endpointId)}
                        className="w-full flex items-start justify-between group"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-on-surface-variant" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                          )}
                          <span className={`px-2 py-1 text-label-sm font-bold rounded-sm border ${getMethodColor(endpoint.method)}`}>
                            {endpoint.method}
                          </span>
                          <div className="flex-1 text-left">
                            <div className="text-body-sm font-mono text-on-surface">
                              {endpoint.path}
                            </div>
                            {endpoint.summary && (
                              <div className="text-label-sm text-on-surface-variant mt-0.5">
                                {endpoint.summary}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="mt-3 pl-7 space-y-3 border-t border-outline-variant pt-3">
                          {endpoint.description && (
                            <div>
                              <h5 className="text-label-sm font-semibold text-on-surface mb-1">Description</h5>
                              <p className="text-label-sm text-on-surface-variant">{endpoint.description}</p>
                            </div>
                          )}

                          {endpoint.parameters && endpoint.parameters.length > 0 && (
                            <div>
                              <h5 className="text-label-sm font-semibold text-on-surface mb-1">Parameters</h5>
                              <div className="space-y-1">
                                {endpoint.parameters.map((param, pidx) => (
                                  <div key={pidx} className="text-label-sm text-on-surface-variant font-mono">
                                    {param.name} ({param.in}): {param.schema?.type || 'any'}
                                    {param.required && <span className="text-error ml-1">*</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {endpoint.requestBody && (
                            <div>
                              <h5 className="text-label-sm font-semibold text-on-surface mb-1">Request Body</h5>
                              <div className="p-2 bg-surface-container-low rounded-sm border border-outline-variant">
                                <pre className="text-label-sm text-on-surface-variant whitespace-pre-wrap">
                                  {JSON.stringify(endpoint.requestBody, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}

                          {endpoint.responses && (
                            <div>
                              <h5 className="text-label-sm font-semibold text-on-surface mb-1">Responses</h5>
                              <div className="space-y-2">
                                {Object.keys(endpoint.responses).map((statusCode) => (
                                  <div key={statusCode} className="p-2 bg-surface-container-low rounded-sm border border-outline-variant">
                                    <div className="text-label-sm font-semibold text-on-surface mb-1">
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
