import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronRight, RotateCcw, Home } from 'lucide-react';

/**
 * Step 3: Results Display
 * Shows detailed analysis with expandable endpoint cards
 */
const SpecResults = ({ results, onReset, specData }) => {
  const navigate = useNavigate();
  const { googleLogin } = useAuth();
  const [expandedEndpoint, setExpandedEndpoint] = useState(null);
  const [filterRisk, setFilterRisk] = useState('all'); // 'all' | 'safe' | 'risky'
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [uploadMode, setUploadMode] = useState(null); // 'demo' | 'manual'
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const { endpoints, stats, apiInfo } = results;

  // Read upload mode from localStorage on mount
  useEffect(() => {
    const mode = localStorage.getItem('uploadMode');
    setUploadMode(mode);
  }, []);

  const handleGetEarlyAccess = () => {
    // Show login modal instead of navigating
    setShowLoginModal(true);
  };

  // Filter endpoints based on risk level
  const filteredEndpoints = endpoints.filter(endpoint => {
    if (filterRisk === 'all') return true;
    if (filterRisk === 'safe') return endpoint.aiRisks.length === 0;
    if (filterRisk === 'risky') return endpoint.aiRisks.length > 0;
    return true;
  });

  const toggleEndpoint = (index) => {
    // If demo mode, allow expanding details directly
    if (uploadMode === 'demo') {
      setExpandedEndpoint(expandedEndpoint === index ? null : index);
    } else {
      // If manual upload, show login modal
      setShowLoginModal(true);
    }
  };

  const handleTalkToUs = () => {
    // Navigate to contact page
    navigate('/contact');
  };

  const handleTrySample = () => {
    // Redirect to landing page to try demo samples
    navigate('/');
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoggingIn(true);
    try {
      const result = await googleLogin(credentialResponse.credential);
      if (result.success) {
        // Save spec data to localStorage for after login
        const filename = specData.filename || specData.url || 'openapi-spec';
        const filenameWithExt = filename.endsWith('.json') || filename.endsWith('.yaml') || filename.endsWith('.yml')
          ? filename
          : `${filename}.json`;

        localStorage.setItem('pendingTrialSpec', JSON.stringify({
          spec: specData.spec,
          filename: filenameWithExt
        }));

        // Close modal and navigate to agents page with create agent action
        setShowLoginModal(false);
        navigate('/agents?action=createAgent');
      } else {
        alert(result.error || 'Failed to sign in with Google');
      }
    } catch (error) {
      console.error('Google login error:', error);
      alert('Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleError = () => {
    console.error('Google Login Failed');
    alert('Failed to sign in with Google. Please try again.');
  };

  const getRiskBadgeClass = (riskCount) => {
    if (riskCount === 0) return 'bg-success/10 text-success';
    if (riskCount <= 2) return 'bg-repair/10 text-repair';
    return 'bg-red-500/10 text-red-600';
  };

  const getRiskLabel = (riskCount) => {
    if (riskCount === 0) return 'AI-safe';
    return `${riskCount} AI-prone`;
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'high') return <XCircle className="w-4 h-4 text-red-600" />;
    if (severity === 'medium') return <AlertTriangle className="w-4 h-4 text-repair" />;
    return <CheckCircle2 className="w-4 h-4 text-success" />;
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
                className="flex items-center gap-2 text-on-surface text-body-md font-medium hover:text-primary transition-colors underline-offset-4 hover:underline"
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

      {/* Filter Tabs */}
      <div className="bg-surface-container-lowest border-b border-outline-variant">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            <button
              onClick={() => setFilterRisk('risky')}
              className={`px-4 py-2 rounded-xs text-body-md font-medium transition-colors ${
                filterRisk === 'risky'
                  ? 'bg-repair text-white'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              AI-prone ({stats.lowRisk + stats.highRisk})
            </button>
            <button
              onClick={() => setFilterRisk('safe')}
              className={`px-4 py-2 rounded-xs text-body-md font-medium transition-colors ${
                filterRisk === 'safe'
                  ? 'bg-success text-white'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              AI-safe ({stats.safe})
            </button>
            <button
              onClick={() => setFilterRisk('all')}
              className={`px-4 py-2 rounded-xs text-body-md font-medium transition-colors ${
                filterRisk === 'all'
                  ? 'bg-primary text-white'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              All ({stats.total})
            </button>
          </div>
        </div>
      </div>

      {/* Endpoint List */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="space-y-2">
          {filteredEndpoints.map((endpoint, index) => (
            <div
              key={index}
              className="bg-surface-container-lowest rounded-sm border border-outline-variant overflow-hidden"
            >
              {/* Endpoint Header - Clickable */}
              <button
                onClick={() => toggleEndpoint(index)}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors text-left"
              >
                <div className="flex items-center gap-3 flex-1">
                  {/* Expand Icon */}
                  {expandedEndpoint === index ? (
                    <ChevronDown className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
                  )}

                  {/* Method Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-xs font-mono text-label-sm font-semibold ${
                      endpoint.method === 'POST'
                        ? 'bg-repair/20 text-repair'
                        : endpoint.method === 'GET'
                        ? 'bg-success/20 text-success'
                        : endpoint.method === 'PUT'
                        ? 'bg-primary/20 text-primary'
                        : endpoint.method === 'DELETE'
                        ? 'bg-red-500/20 text-red-600'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {endpoint.method}
                  </span>

                  {/* Path */}
                  <span className="font-mono text-label-md text-on-surface flex-1 truncate">
                    {endpoint.path}
                  </span>

                  {/* Summary */}
                  {endpoint.summary && (
                    <span className="text-body-sm text-on-surface-variant hidden lg:block">
                      {endpoint.summary}
                    </span>
                  )}
                </div>

                {/* Risk Badge */}
                <span
                  className={`px-3 py-1 rounded-xs font-mono text-label-sm font-semibold ${getRiskBadgeClass(
                    endpoint.aiRisks.length
                  )}`}
                >
                  {getRiskLabel(endpoint.aiRisks.length)}
                </span>
              </button>

              {/* Expanded Details */}
              {expandedEndpoint === index && (
                <div className="border-t border-outline-variant bg-surface-container-low">
                  {endpoint.description && (
                    <div className="px-4 py-3 border-b border-outline-variant">
                      <p className="text-body-sm text-on-surface-variant">
                        {endpoint.description}
                      </p>
                    </div>
                  )}

                  {/* AI Risks */}
                  {endpoint.aiRisks.length > 0 ? (
                    <div className="px-4 py-4">
                      <h4 className="text-label-md font-semibold text-on-surface mb-3">
                        AI-Prone Issues ({endpoint.aiRisks.length})
                      </h4>
                      <div className="space-y-2">
                        {endpoint.aiRisks.map((risk, riskIndex) => (
                          <div
                            key={riskIndex}
                            className="flex gap-3 p-3 bg-surface-container-lowest rounded-xs border border-outline-variant"
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              {getSeverityIcon(risk.severity)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-label-sm font-semibold text-on-surface">
                                  {risk.field}
                                </span>
                                <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant rounded-xs text-label-sm font-mono">
                                  {risk.type}
                                </span>
                              </div>
                              <p className="text-body-sm text-on-surface mb-1">
                                {risk.message}
                              </p>
                              <p className="text-body-sm text-repair">
                                {risk.suggestion}
                              </p>
                              {risk.validValues && (
                                <div className="mt-2 p-2 bg-surface-container-high rounded-xs">
                                  <span className="text-label-sm text-on-surface-variant font-mono">
                                    Valid: {risk.validValues.join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-success" />
                      <p className="text-body-md text-success font-medium">
                        No AI-prone issues detected
                      </p>
                      <p className="text-body-sm text-on-surface-variant mt-1">
                        This endpoint should work reliably with AI-generated requests
                      </p>
                    </div>
                  )}

                  {/* Fields Overview */}
                  {endpoint.fields && endpoint.fields.length > 0 && (
                    <div className="px-4 py-4 border-t border-outline-variant">
                      <h4 className="text-label-md font-semibold text-on-surface mb-3">
                        Fields ({endpoint.fields.length})
                      </h4>
                      <div className="space-y-1">
                        {endpoint.fields.map((field, fieldIndex) => (
                          <div
                            key={fieldIndex}
                            className="flex items-center justify-between py-2 px-3 bg-surface-container-lowest rounded-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-label-sm text-on-surface">
                                {field.name}
                              </span>
                              {field.required && (
                                <span className="px-1.5 py-0.5 bg-red-500/10 text-red-600 rounded-xs text-label-sm font-mono">
                                  required
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-label-sm text-on-surface-variant font-mono">
                                {field.type}
                              </span>
                              <span className="text-label-sm text-on-surface-variant">
                                in {field.location}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredEndpoints.length === 0 && (
          <div className="text-center py-12">
            <p className="text-body-lg text-on-surface-variant">
              No endpoints match the selected filter
            </p>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-12 p-8 bg-primary/5 border border-primary/20 rounded-sm text-center">
          <h3 className="text-heading-sm font-bold text-on-surface mb-3">
            Ready to make your API AI-ready?
          </h3>
          <p className="text-body-md text-on-surface-variant mb-6 max-w-2xl mx-auto">
            invari.ai auto-repairs AI-generated requests before they hit your API.
            No SDK, no code changes — just a proxy that makes everything work.
          </p>
          <button
            onClick={handleGetEarlyAccess}
            className="bg-primary text-white px-6 py-3 rounded-sm font-semibold text-body-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </button>
        </div>
      </div>

      {/* Login Modal - Reference Demo Design */}
      {showLoginModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowLoginModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-10 w-full shadow-2xl"
            style={{
              maxWidth: '440px',
              border: '1px solid #e2e0d8',
              boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
              fontFamily: "'DM Sans', sans-serif"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon + Label Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: '#d4f0e7',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px'
              }}>
                🔍
              </div>
              <p style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                color: '#6b6860',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                margin: 0
              }}>
                Full audit log
              </p>
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: '20px',
              fontWeight: 600,
              marginBottom: '6px',
              color: '#1a1916'
            }}>
              This is production-grade data.
            </h2>

            {/* Subtitle */}
            <p style={{
              fontSize: '13px',
              color: '#6b6860',
              marginBottom: '24px',
              lineHeight: 1.6
            }}>
              Every repair is logged — field by field, request by request. Create a free account to access the full trace.
            </p>

            {/* Google Sign In Button */}
            <div style={{ width: '100%' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
                theme="outline"
                size="large"
                text="continue_with"
                shape="rectangular"
                width="100%"
              />
            </div>

            {/* Conditional OR divider + Sample button for manual mode */}
            {uploadMode === 'manual' && (
              <>
                {/* OR Divider */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  margin: '20px 0'
                }}>
                  <div style={{ flex: 1, height: '1px', background: '#e2e0d8' }} />
                  <span style={{
                    fontSize: '11px',
                    color: '#6b6860',
                    fontFamily: "'JetBrains Mono', monospace",
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em'
                  }}>
                    or
                  </span>
                  <div style={{ flex: 1, height: '1px', background: '#e2e0d8' }} />
                </div>

                {/* Try Sample Button */}
                <button
                  onClick={handleTrySample}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '12px',
                    border: '1.5px solid #e2e0d8',
                    borderRadius: '10px',
                    background: 'white',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    color: '#1a1916',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#1a1916';
                    e.currentTarget.style.background = '#f0efe9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e0d8';
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  Try a Sample Instead
                </button>
              </>
            )}

            {/* Footer Note */}
            <p style={{
              fontSize: '11px',
              color: '#6b6860',
              textAlign: 'center',
              marginTop: '16px',
              fontFamily: "'JetBrains Mono', monospace"
            }}>
              Free account · No credit card · Works in 60 seconds
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecResults;
