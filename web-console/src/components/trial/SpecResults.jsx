import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, X, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';

/**
 * Tooltip component that shows immediately on hover
 * Uses fixed positioning to avoid overflow clipping
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
 * Step 3: Results Display (Table View)
 * Shows analysis results in a table format like LiveTrafficPage
 */
const SpecResults = ({ results, onTryItOut, specData }) => {
  const navigate = useNavigate();
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [showSpecDetails, setShowSpecDetails] = useState(false);

  const { endpoints, stats, apiInfo } = results;

  // Recursively resolve $ref in OpenAPI spec
  const resolveRef = (obj, spec) => {
    if (!obj || typeof obj !== 'object') return obj;

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => resolveRef(item, spec));
    }

    // Handle $ref
    if (obj.$ref && typeof obj.$ref === 'string') {
      const refPath = obj.$ref;

      // Only handle internal references starting with #/
      if (refPath.startsWith('#/')) {
        const parts = refPath.substring(2).split('/'); // Remove #/ and split by /
        let resolved = spec;

        // Navigate through the path
        for (const part of parts) {
          if (resolved && typeof resolved === 'object') {
            resolved = resolved[part];
          } else {
            return obj; // Can't resolve, return original
          }
        }

        // Recursively resolve the resolved object in case it has more refs
        if (resolved) {
          return resolveRef(resolved, spec);
        }
      }

      return obj; // Can't resolve, return original
    }

    // Recursively resolve all properties
    const resolved = {};
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = resolveRef(value, spec);
    }
    return resolved;
  };

  // Get endpoint spec details from OpenAPI spec with all $refs resolved
  const getEndpointSpecDetails = (endpoint) => {
    if (!specData?.spec || !endpoint) return null;

    let spec = specData.spec;
    if (typeof spec === 'string') {
      try {
        spec = JSON.parse(spec);
      } catch (e) {
        return null;
      }
    }

    const paths = spec?.paths || {};
    const pathItem = paths[endpoint.path];
    if (!pathItem) return null;

    const operation = pathItem[endpoint.method.toLowerCase()];
    if (!operation) return null;

    // Resolve all $refs in the operation
    return resolveRef(operation, spec);
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header Section */}
      <div className="bg-surface-container-lowest border-b border-outline-variant">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-xs text-label-sm font-mono mb-3">
                ANALYSIS COMPLETE
              </div>
              <h1 className="text-heading-lg font-bold text-on-surface mb-2">
                {apiInfo.title}
              </h1>
              <p className="text-body-md text-on-surface-variant">
                {apiInfo.description || `Version ${apiInfo.version}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-on-surface text-body-md font-medium hover:text-primary transition-colors underline-offset-4 hover:underline cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface-container-low rounded-sm p-4">
              <div className="text-display-sm font-bold text-on-surface mb-1">
                {stats.total}
              </div>
              <div className="text-body-sm text-on-surface-variant">
                Total Endpoints
              </div>
            </div>
            <div className="bg-success/10 rounded-sm p-4">
              <div className="text-display-sm font-bold text-success mb-1">
                {stats.safe}
              </div>
              <div className="text-body-sm text-success">
                AI-safe endpoints
              </div>
            </div>
            <div className="bg-repair/10 rounded-sm p-4">
              <div className="text-display-sm font-bold text-repair mb-1">
                {stats.lowRisk + stats.highRisk}
              </div>
              <div className="text-body-sm text-repair">
                AI-prone endpoints
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-surface-container-lowest rounded-sm border border-outline-variant overflow-hidden">
          {/* Table Header */}
          <div className="px-4 py-3 bg-surface-container-low border-b border-outline-variant">
            <div className="grid grid-cols-[auto_1fr_auto] gap-4 text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider font-mono">
              <div className="w-20">Method</div>
              <div>Endpoint</div>
              <div className="w-48">Status</div>
            </div>
          </div>

          {/* Table Body */}
          <div>
            {endpoints.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-on-surface-variant">No endpoints found</div>
              </div>
            ) : (
              endpoints.map((endpoint, index) => (
                <div
                  key={index}
                  className={`px-4 py-4 border-b border-outline-variant transition-all cursor-pointer ${
                    selectedEndpoint === endpoint
                      ? 'bg-primary/5 border-l-4 border-l-primary'
                      : 'hover:bg-surface-container-high'
                  }`}
                  onClick={() => setSelectedEndpoint(endpoint)}
                >
                  <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-center">
                    {/* Method Badge */}
                    <div className="w-20">
                      <span
                        className={`px-2.5 py-1 rounded-xs font-mono text-label-sm font-semibold ${
                          endpoint.method === 'POST'
                            ? 'bg-success/20 text-success border border-success/20'
                            : endpoint.method === 'GET'
                            ? 'bg-primary/20 text-primary border border-primary/20'
                            : endpoint.method === 'PUT' || endpoint.method === 'PATCH'
                            ? 'bg-repair/20 text-repair border border-repair/20'
                            : endpoint.method === 'DELETE'
                            ? 'bg-red-500/20 text-red-600 border border-red-500/20'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {endpoint.method}
                      </span>
                    </div>

                    {/* Endpoint Path */}
                    <div className="font-mono text-label-md text-on-surface truncate">
                      {endpoint.path}
                    </div>

                    {/* Status + Try it out button */}
                    <div className="w-48 flex items-center gap-2 justify-end">
                      {/* Status Badge */}
                      <span
                        className={`px-3 py-1 rounded-xs font-mono text-label-sm font-semibold ${
                          endpoint.aiRisks.length === 0
                            ? 'bg-success/10 text-success'
                            : 'bg-repair/10 text-repair'
                        }`}
                      >
                        {endpoint.aiRisks.length === 0
                          ? 'AI-safe'
                          : `${endpoint.aiRisks.length} AI-prone`}
                      </span>

                      {/* Try it out button - only for POST/PATCH */}
                      {onTryItOut && (endpoint.method === 'POST' || endpoint.method === 'PATCH') && (
                        <Tooltip text="Test this endpoint with sample request body and see Invari repair in action" forceBottom={true}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTryItOut(endpoint);
                            }}
                            className="px-3 py-1 bg-primary text-white text-label-sm font-semibold rounded-xs hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
                          >
                            Try it out →
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Slide-out Panel: Endpoint Details */}
      <div
        className={`fixed top-0 right-0 h-full w-[500px] bg-white border-l border-slate-200 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          selectedEndpoint ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Request Overview</h2>
              {selectedEndpoint && (
                <span className="text-xs text-slate-500 font-mono">{selectedEndpoint.method}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedEndpoint && (
                <Tooltip text={showSpecDetails ? 'Hide OpenAPI specification details' : 'Show OpenAPI specification details for this endpoint'}>
                  <button
                    onClick={() => {
                      setShowSpecDetails(!showSpecDetails);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                      showSpecDetails
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {showSpecDetails ? 'Hide' : 'Show'} Spec
                  </button>
                </Tooltip>
              )}
              {selectedEndpoint && (
                <button
                  onClick={() => {
                    setSelectedEndpoint(null);
                    setShowSpecDetails(false);
                  }}
                  className="p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-slate-600" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedEndpoint ? (
              <div className="space-y-6">
                {/* No Data Message */}
                {!showSpecDetails && (
                  <div className="bg-slate-100 rounded-lg p-6 border border-slate-300 text-center">
                    <div className="text-slate-400 mb-2">
                      <AlertTriangle className="w-12 h-12 mx-auto opacity-30" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-1">No Request Data</h3>
                    <p className="text-xs text-slate-500">
                      This is a static analysis view. Use "Try it out" to test with real requests.
                    </p>
                  </div>
                )}

                {/* OpenAPI Spec Details */}
                {showSpecDetails && (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      OpenAPI Specification
                    </h3>
                    <div className="bg-white rounded border border-slate-300 p-3 max-h-96 overflow-auto">
                      <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap">
                        {JSON.stringify(getEndpointSpecDetails(selectedEndpoint), null, 2) || 'No spec details available'}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Endpoint Info */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Endpoint Information</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Method:</span>
                      <span className={`font-mono font-semibold ${
                        selectedEndpoint.method === 'GET' ? 'text-blue-600' :
                        selectedEndpoint.method === 'POST' ? 'text-emerald-600' :
                        selectedEndpoint.method === 'PUT' || selectedEndpoint.method === 'PATCH' ? 'text-amber-600' :
                        selectedEndpoint.method === 'DELETE' ? 'text-red-600' :
                        'text-slate-700'
                      }`}>{selectedEndpoint.method}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-slate-600">Path:</span>
                      <span className="text-slate-700 font-mono text-right break-all max-w-[70%]">
                        {selectedEndpoint.path}
                      </span>
                    </div>
                    {selectedEndpoint.summary && (
                      <div className="flex justify-between items-start">
                        <span className="text-slate-600">Summary:</span>
                        <span className="text-slate-700 text-right max-w-[70%]">
                          {selectedEndpoint.summary}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI-Prone Issues */}
                {selectedEndpoint.aiRisks && selectedEndpoint.aiRisks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">
                      AI-Prone Issues ({selectedEndpoint.aiRisks.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedEndpoint.aiRisks.map((risk, riskIndex) => (
                        <div
                          key={riskIndex}
                          className="bg-amber-50 border border-amber-200 rounded-lg p-3"
                        >
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs font-semibold text-slate-900">
                                  {risk.field}
                                </span>
                                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-xs text-[10px] font-mono">
                                  {risk.type}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 mb-1">{risk.message}</p>
                              <p className="text-xs text-amber-700">{risk.suggestion}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI-Safe Message */}
                {selectedEndpoint.aiRisks && selectedEndpoint.aiRisks.length === 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-700 mb-1">
                      No AI-prone issues detected
                    </p>
                    <p className="text-xs text-emerald-600">
                      This endpoint should work reliably with AI-generated requests
                    </p>
                  </div>
                )}

                {/* Fields Overview */}
                {selectedEndpoint.fields && selectedEndpoint.fields.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">
                      Fields ({selectedEndpoint.fields.length})
                    </h3>
                    <div className="space-y-1">
                      {selectedEndpoint.fields.map((field, fieldIndex) => (
                        <div
                          key={fieldIndex}
                          className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-900">
                              {field.name}
                            </span>
                            {field.required && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded-xs text-[10px] font-mono">
                                required
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-mono">
                              {field.type}
                            </span>
                            <span className="text-xs text-slate-400">
                              in {field.location}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <AlertTriangle className="w-12 h-12 opacity-20 mb-3" />
                <p className="text-sm">Select an endpoint to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop Overlay */}
      {selectedEndpoint && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
          onClick={() => setSelectedEndpoint(null)}
        />
      )}
    </div>
  );
};

export default SpecResults;
