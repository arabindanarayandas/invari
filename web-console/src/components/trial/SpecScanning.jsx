import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { analyzeOpenAPISpec } from '../../utils/openAPIAnalyzer';

/**
 * Step 2: Scanning Animation
 * Shows real-time endpoint discovery with AI risk analysis
 */
const SpecScanning = ({ specData, onComplete }) => {
  const [discoveredEndpoints, setDiscoveredEndpoints] = useState([]);
  const [progress, setProgress] = useState(0);
  const [totalEndpoints, setTotalEndpoints] = useState(0);

  useEffect(() => {
    // Analyze the spec and animate the discovery
    const runAnalysis = async () => {
      try {
        const results = analyzeOpenAPISpec(specData.spec);
        setTotalEndpoints(results.endpoints.length);

        // Animate endpoint discovery
        for (let i = 0; i < results.endpoints.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay between each
          setDiscoveredEndpoints(prev => [...prev, results.endpoints[i]]);
          setProgress(((i + 1) / results.endpoints.length) * 100);
        }

        // Wait a moment before transitioning
        await new Promise(resolve => setTimeout(resolve, 800));
        onComplete(results);
      } catch (error) {
        console.error('Analysis error:', error);
        alert('Failed to analyze spec. Please check the format.');
      }
    };

    runAnalysis();
  }, [specData, onComplete]);

  const getApiName = () => {
    if (specData.source === 'url') {
      try {
        const url = new URL(specData.url);
        return url.hostname;
      } catch {
        return 'API';
      }
    }
    return specData.filename || 'API';
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-surface">
      <div className="max-w-3xl w-full">
        {/* Spinner */}
        <div className="text-center mb-8">
          <Loader2 className="w-16 h-16 animate-spin mx-auto text-primary mb-6" />
          <h2 className="text-heading-lg font-bold text-on-surface mb-2">
            Scanning {getApiName()}
          </h2>
          <p className="text-body-lg text-on-surface-variant">
            Analyzing {totalEndpoints} endpoints for AI risk...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-1.5 bg-surface-container-low rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Endpoint Discovery List */}
        <div className="bg-surface-container-lowest rounded-md border border-outline-variant p-6">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {discoveredEndpoints.map((endpoint, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 px-4 bg-surface-container-low rounded-sm animate-fadeIn"
                style={{
                  animation: 'fadeIn 0.3s ease-in'
                }}
              >
                {/* Method & Path */}
                <div className="flex items-center gap-3 flex-1">
                  <span
                    className={`px-2.5 py-1 rounded-xs font-mono text-label-sm font-semibold ${
                      endpoint.method === 'POST'
                        ? 'bg-repair/20 text-repair'
                        : endpoint.method === 'GET'
                        ? 'bg-success/20 text-success'
                        : endpoint.method === 'PUT'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {endpoint.method}
                  </span>
                  <span className="font-mono text-label-md text-on-surface flex-1 truncate">
                    {endpoint.path}
                  </span>
                </div>

                {/* Risk Badge */}
                <span
                  className={`px-3 py-1 rounded-xs font-mono text-label-sm font-semibold ${getRiskBadgeClass(
                    endpoint.aiRisks.length
                  )}`}
                >
                  {getRiskLabel(endpoint.aiRisks.length)}
                </span>
              </div>
            ))}

            {/* Loading Placeholder */}
            {discoveredEndpoints.length < totalEndpoints && (
              <div className="flex items-center gap-3 py-3 px-4 opacity-50">
                <div className="w-12 h-8 bg-surface-container-high rounded-xs animate-pulse" />
                <div className="flex-1 h-4 bg-surface-container-high rounded-xs animate-pulse" />
                <div className="w-20 h-6 bg-surface-container-high rounded-xs animate-pulse" />
              </div>
            )}
          </div>
        </div>

        {/* Info Message */}
        <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-sm">
          <p className="text-body-md text-primary text-center">
            User watches AI risk being assessed, not just endpoints listed.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default SpecScanning;