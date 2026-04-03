import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { X, AlertTriangle, CheckCircle2, FileText, Lock, Mail } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';

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
          className="fixed px-3 py-1.5 bg-slate-900 text-white text-xs rounded-[8px] shadow-lg z-[9999] pointer-events-none max-w-[350px]"
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
const SpecResults = ({ results, onTryItOut, specData, disableLoginGating = false }) => {
  const navigate = useNavigate();
  const { isAuthenticated, login, googleLogin } = useAuth();
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [showSpecDetails, setShowSpecDetails] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const { endpoints, stats, apiInfo } = results;

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        setShowLoginModal(false);
        setEmail('');
        setPassword('');
      } else {
        setLoginError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setLoginError('An error occurred. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const result = await googleLogin(credentialResponse.credential);
      if (result.success) {
        setShowLoginModal(false);
      } else {
        setLoginError(result.error || 'Google login failed. Please try again.');
      }
    } catch (err) {
      setLoginError('An error occurred during Google login. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleError = () => {
    setLoginError('Google login failed. Please try again.');
  };

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

  // Calculate which endpoints are free to try (not locked)
  const postPatchEndpoints = endpoints.filter(e => e.method === 'POST' || e.method === 'PATCH');
  const freeLimit = postPatchEndpoints.length >= 3 ? 3 : 1;

  // Helper function to check if an endpoint is locked
  const isEndpointLocked = (endpoint) => {
    if (isAuthenticated) return false; // All endpoints unlocked for authenticated users
    if (!onTryItOut) return false; // Not using try it out feature
    if (endpoint.method !== 'POST' && endpoint.method !== 'PATCH') return false; // Only POST/PATCH can be tried

    const endpointIndex = postPatchEndpoints.findIndex(e =>
      e.path === endpoint.path && e.method === endpoint.method
    );

    return endpointIndex >= freeLimit;
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Top Banner */}
      <div style={{ background: '#1b1c1a', color: 'rgba(255,255,255,0.8)', textAlign: 'center', padding: '10px 20px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ background: '#1D9E75', color: 'white', padding: '2px 12px', borderRadius: '999px', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase' }}>⚡ Source-available</span>
        invari is source-available under the
        <a href="https://polyformproject.org/licenses/noncommercial/1.0.0/" target="_blank" rel="noopener noreferrer" style={{ color: '#1D9E75', textDecoration: 'none', fontWeight: 600 }}>PolyForm Noncommercial License 1.0.0</a>
        — free to self-host for non-commercial use.
        <a href="https://github.com/arabindanarayandas/invari" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.8)', borderBottom: '1px solid rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'all 0.2s' }}>View on GitHub →</a>
      </div>

      {/* Navigation */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(250, 249, 246, 0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(188, 202, 193, 0.4)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontFamily: "'Noto Serif', serif", fontSize: '18px', fontWeight: 'bold', color: '#1b1c1a', textDecoration: 'none' }}>
            invari<span style={{ color: '#1D9E75' }}>.ai</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }} className="nav-links-main">
            <Link to="/how-it-works" style={{ fontSize: '14px', color: '#3d4943', textDecoration: 'none', transition: 'color 0.2s' }}>How it works</Link>
            <Link to="/pricing" style={{ fontSize: '14px', color: '#3d4943', textDecoration: 'none', transition: 'color 0.2s' }}>Pricing</Link>
            <a href="https://github.com/arabindanarayandas/invari" target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', color: '#3d4943', textDecoration: 'none', transition: 'color 0.2s' }}>GitHub</a>
            <Link to="/contact" style={{ fontSize: '14px', color: '#3d4943', textDecoration: 'none', transition: 'color 0.2s' }}>Contact</Link>
          </div>
          {isAuthenticated ? (
            <Link to="/dashboard" style={{ background: '#1b1c1a', color: 'white', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 600, padding: '8px 16px', borderRadius: '6px', textDecoration: 'none', transition: 'opacity 0.2s' }}>
              Dashboard →
            </Link>
          ) : (
            <button onClick={() => setShowLoginModal(true)} style={{ background: '#1b1c1a', color: 'white', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 600, padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s' }}>
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Header Section */}
      <div className="bg-surface-container-lowest border-b border-outline-variant">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6">
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
          <div style={{ position: 'relative', minHeight: !isAuthenticated && endpoints.length > 3 ? '700px' : 'auto' }}>
            {endpoints.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-on-surface-variant">No endpoints found</div>
              </div>
            ) : (
              <>
                {endpoints.map((endpoint, index) => (
                  <div
                    key={index}
                    className={`px-4 py-4 border-b border-outline-variant transition-all cursor-pointer ${
                      selectedEndpoint === endpoint
                        ? 'bg-primary/5 border-l-4 border-l-primary'
                        : 'hover:bg-surface-container-high'
                    }`}
                    style={{
                      filter: !isAuthenticated && index >= 3 ? 'blur(4px)' : 'none',
                      pointerEvents: !isAuthenticated && index >= 3 ? 'none' : 'auto',
                      userSelect: !isAuthenticated && index >= 3 ? 'none' : 'auto'
                    }}
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

                      {/* Try it out button or Lock button - only for POST/PATCH */}
                      {onTryItOut && (endpoint.method === 'POST' || endpoint.method === 'PATCH') && (
                        <>
                          {isEndpointLocked(endpoint) ? (
                            <Tooltip text="Sign in to unlock and test this endpoint with sample requests" forceBottom={true}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowLoginModal(true);
                                }}
                                className="px-3 py-1 bg-slate-200 text-slate-600 text-label-sm font-semibold rounded-xs hover:bg-slate-300 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                Try it out
                              </button>
                            </Tooltip>
                          ) : (
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
                        </>
                      )}
                    </div>
                  </div>
                </div>
                ))}

                {/* Overlay for locked endpoints */}
                {!isAuthenticated && endpoints.length > 3 && (
                  <div style={{
                    position: 'absolute',
                    top: '240px', // Position after 3 endpoints (each ~80px height)
                    left: 0,
                    right: 0,
                    minHeight: '500px',
                    background: 'linear-gradient(to bottom, rgba(250, 249, 246, 0.6) 0%, rgba(250, 249, 246, 0.95) 20%, rgba(250, 249, 246, 1) 100%)',
                    backdropFilter: 'blur(2px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '32px',
                    paddingTop: '120px',
                    zIndex: 10
                  }}>
                    <div style={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      padding: '32px',
                      textAlign: 'center',
                      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
                      border: '1px solid rgba(188, 202, 193, 0.3)',
                      maxWidth: '400px'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'rgba(29, 158, 117, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px'
                      }}>
                        <Lock style={{ width: '24px', height: '24px', color: '#1D9E75' }} />
                      </div>
                      <h3 style={{
                        fontFamily: "'Noto Serif', serif",
                        fontSize: '20px',
                        fontWeight: 600,
                        color: '#1b1c1a',
                        marginBottom: '8px'
                      }}>
                        {endpoints.length - 3} More {endpoints.length - 3 === 1 ? 'Endpoint' : 'Endpoints'} Available
                      </h3>
                      <p style={{
                        fontSize: '14px',
                        color: '#3d4943',
                        lineHeight: 1.6,
                        marginBottom: '24px'
                      }}>
                        Sign in to view all {endpoints.length} API endpoints and their AI-risk analysis
                      </p>
                      <button
                        onClick={() => setShowLoginModal(true)}
                        style={{
                          width: '100%',
                          background: '#1b1c1a',
                          color: 'white',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '14px',
                          fontWeight: 600,
                          padding: '12px 24px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                      >
                        Sign In to View All
                      </button>
                    </div>
                  </div>
                )}
              </>
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-colors cursor-pointer ${
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
                  className="p-1 hover:bg-slate-100 rounded-[8px] transition-colors cursor-pointer"
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
                    <div className="bg-white rounded-[8px] border border-slate-300 p-3 max-h-96 overflow-auto">
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

      {/* Login Modal */}
      {showLoginModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowLoginModal(false)}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '460px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: '28px', fontWeight: 400, color: '#1a1916' }}>
                Sign In
              </h2>
              <button onClick={() => setShowLoginModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X style={{ width: '20px', height: '20px', color: '#6b6860' }} />
              </button>
            </div>
            <p style={{ fontSize: '14px', color: '#6b6860', marginBottom: '24px', lineHeight: 1.6 }}>
              Access your account to manage and protect your APIs
            </p>

            {/* Error Message */}
            {loginError && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#fde8e8', border: '1px solid #E24B4A', borderRadius: '8px' }}>
                <p style={{ color: '#E24B4A', fontSize: '14px' }}>{loginError}</p>
              </div>
            )}

            {/* Email/Password Form */}
            <form onSubmit={handleEmailLogin} style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1a1916', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em', marginBottom: '8px' }}>
                  EMAIL
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail style={{ position: 'absolute', left: '12px', width: '16px', height: '16px', color: '#6b6860' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={isLoggingIn}
                    style={{ width: '100%', padding: '12px 14px 12px 40px', border: '1px solid #e2e0d8', borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", background: '#ffffff', color: '#1a1916', outline: 'none', transition: 'border-color 0.15s' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1a1916', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em', marginBottom: '8px' }}>
                  PASSWORD
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock style={{ position: 'absolute', left: '12px', width: '16px', height: '16px', color: '#6b6860' }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={isLoggingIn}
                    style={{ width: '100%', padding: '12px 14px 12px 40px', border: '1px solid #e2e0d8', borderRadius: '10px', fontSize: '14px', fontFamily: "'DM Sans', sans-serif", background: '#ffffff', color: '#1a1916', outline: 'none', transition: 'border-color 0.15s' }}
                  />
                </div>
              </div>

              <button type="submit" disabled={isLoggingIn} style={{ width: '100%', padding: '12px 20px', background: isLoggingIn ? '#e2e0d8' : '#1D9E75', color: isLoggingIn ? '#6b6860' : 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: isLoggingIn ? 'not-allowed' : 'pointer', transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {isLoggingIn && (
                  <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                )}
                {isLoggingIn ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '100%', borderTop: '1px solid #e2e0d8' }}></div>
              </div>
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <span style={{ padding: '0 16px', background: '#ffffff', fontSize: '14px', color: '#6b6860' }}>OR</span>
              </div>
            </div>

            {/* Google Login */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                text="continue_with"
                shape="rectangular"
                width="100%"
              />
            </div>
          </div>
        </div>
      )}

      {/* Keyframes for animations */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SpecResults;
