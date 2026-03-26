import { useMemo } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import SpecResults from '../components/trial/SpecResults';
import { analyzeOpenAPISpec } from '../utils/openAPIAnalyzer';

/**
 * Analysis Page - OpenAPI Spec Analysis Results
 * Shows results directly (scanning already done on landing page)
 * Following the "Observational Blueprint" design
 */
const AnalysisPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Try to get spec data from location state or localStorage
  let specData = location.state?.specData;

  if (!specData) {
    // Try to load from localStorage
    const savedSpecData = localStorage.getItem('lastSpecData');
    if (savedSpecData) {
      try {
        specData = JSON.parse(savedSpecData);
      } catch (error) {
        console.error('Failed to parse saved spec data:', error);
      }
    }
  }

  // If still no spec data, redirect to landing page
  if (!specData) {
    return <Navigate to="/" replace />;
  }

  // Analyze the spec immediately (no scanning animation)
  const analysisResults = useMemo(() => {
    try {
      return analyzeOpenAPISpec(specData.spec);
    } catch (error) {
      console.error('Analysis error:', error);
      // Return empty results if analysis fails
      return {
        endpoints: [],
        stats: { total: 0, safe: 0, lowRisk: 0, highRisk: 0 },
        apiInfo: { title: 'API', version: '1.0.0', description: '' }
      };
    }
  }, [specData.spec]);

  const handleReset = () => {
    // Reset sends user back to landing page to upload again
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-surface">
      <SpecResults
        results={analysisResults}
        specData={specData}
        onReset={handleReset}
      />
    </div>
  );
};

export default AnalysisPage;
