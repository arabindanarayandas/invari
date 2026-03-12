import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Link, ArrowRight, Shield, Zap, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import yaml from 'js-yaml';
import { setDemoSpec, setDemoBaseUrl, setDemoEndpoints } from '../hooks/useDemoSession';

const DemoLandingPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [baseUrl, setBaseUrl] = useState('');
  const [inputMode, setInputMode] = useState('file'); // 'file' | 'paste'
  const [pasteText, setPasteText] = useState('');
  const [file, setFile] = useState(null);
  const [parsedSpec, setParsedSpec] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const parseOpenAPISpec = (content, filename) => {
    try {
      let spec;
      if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
        spec = yaml.load(content);
      } else if (filename.endsWith('.json')) {
        spec = JSON.parse(content);
      } else {
        // Try JSON first, then YAML for paste mode
        try {
          spec = JSON.parse(content);
        } catch {
          spec = yaml.load(content);
        }
      }

      if (!spec.openapi && !spec.swagger) {
        throw new Error('Invalid OpenAPI specification. Missing "openapi" or "swagger" field.');
      }

      if (!spec.paths) {
        throw new Error('Invalid OpenAPI specification. Missing "paths" field.');
      }

      const endpoints = [];
      Object.keys(spec.paths).forEach((path) => {
        Object.keys(spec.paths[path]).forEach((method) => {
          if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
            endpoints.push({
              path,
              method: method.toUpperCase(),
              summary: spec.paths[path][method].summary || '',
              operationId: spec.paths[path][method].operationId || '',
              requestBodySchema: spec.paths[path][method].requestBody?.content?.['application/json']?.schema || null,
            });
          }
        });
      });

      return { spec, endpoints };
    } catch (err) {
      throw new Error(`Failed to parse spec: ${err.message}`);
    }
  };

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;
    setError('');
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseOpenAPISpec(e.target.result, selectedFile.name);
        setParsedSpec(parsed);
      } catch (err) {
        setError(err.message);
        setParsedSpec(null);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileChange(droppedFile);
  };

  const handlePasteChange = (value) => {
    setPasteText(value);
    setError('');
    if (!value.trim()) {
      setParsedSpec(null);
      return;
    }
    try {
      const parsed = parseOpenAPISpec(value, 'spec.json');
      setParsedSpec(parsed);
    } catch {
      setParsedSpec(null);
    }
  };

  const handleLaunch = () => {
    setError('');

    if (!parsedSpec) {
      setError('Please upload or paste a valid OpenAPI spec.');
      return;
    }
    if (!baseUrl.trim()) {
      setError('Please enter your API base URL.');
      return;
    }

    setLoading(true);
    try {
      setDemoSpec(parsedSpec.spec);
      setDemoBaseUrl(baseUrl.trim().replace(/\/$/, ''));
      setDemoEndpoints(parsedSpec.endpoints);
      navigate('/playground');
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Nav */}
      <nav className="px-8 py-5 flex items-center justify-between border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <img src="/invari_white.png" alt="Invari" className="h-8 w-auto object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
        <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-medium">Free Playground</span>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-2xl w-full text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-full mb-6">
            <Zap className="w-3 h-3" />
            AI Agent Request Validation
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4 leading-tight">
            See your API defend itself<br />against AI drift
          </h1>
          <p className="text-slate-500 text-lg leading-relaxed">
            Upload your OpenAPI spec, point it at your API, and watch Invari validate,
            repair, or block malformed AI agent requests — in real time.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-3 justify-center mb-10">
          {[
            { icon: Shield, label: 'Blocks invalid requests' },
            { icon: CheckCircle, label: 'Auto-repairs drift' },
            { icon: Zap, label: '<50ms overhead' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-700 shadow-sm">
              <Icon className="w-4 h-4 text-slate-500" />
              {label}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-sm p-8">

          {/* Spec upload */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-700">OpenAPI Spec</label>
              <div className="flex gap-1">
                <button
                  onClick={() => { setInputMode('file'); setParsedSpec(null); setError(''); }}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${inputMode === 'file' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  Upload
                </button>
                <button
                  onClick={() => { setInputMode('paste'); setFile(null); setParsedSpec(null); setError(''); }}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${inputMode === 'paste' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  Paste
                </button>
              </div>
            </div>

            {inputMode === 'file' ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  isDragging
                    ? 'border-slate-400 bg-slate-100'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.yaml,.yml"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files[0])}
                />
                {file ? (
                  <div className="flex flex-col items-center">
                    <FileText className="w-12 h-12 text-slate-700 mb-3" />
                    <p className="text-sm font-medium text-slate-900 mb-1">{file.name}</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Change file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-12 h-12 text-slate-400 mb-3" />
                    <p className="text-sm text-slate-600 mb-2">Drag & drop your OpenAPI spec or</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-sm rounded-lg transition-all"
                    >
                      Browse Files
                    </button>
                    <p className="text-xs text-slate-400 mt-2">Supports .json, .yaml, .yml</p>
                  </div>
                )}
              </div>
            ) : (
              <textarea
                value={pasteText}
                onChange={(e) => handlePasteChange(e.target.value)}
                placeholder={'{\n  "openapi": "3.0.0",\n  ...\n}'}
                className="w-full h-40 px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-400 resize-none"
              />
            )}
          </div>

          {/* Endpoints preview */}
          {parsedSpec && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-600">
                  Valid OpenAPI spec · {parsedSpec.endpoints.length} endpoints found
                </p>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {parsedSpec.endpoints.slice(0, 5).map((endpoint, idx) => (
                  <div key={idx} className="text-xs font-mono text-slate-600 flex gap-2">
                    <span className={`font-semibold ${
                      endpoint.method === 'GET' ? 'text-blue-600' :
                      endpoint.method === 'POST' ? 'text-emerald-600' :
                      endpoint.method === 'PUT' ? 'text-amber-600' :
                      endpoint.method === 'DELETE' ? 'text-red-600' :
                      'text-slate-600'
                    }`}>
                      {endpoint.method}
                    </span>
                    <span>{endpoint.path}</span>
                  </div>
                ))}
                {parsedSpec.endpoints.length > 5 && (
                  <p className="text-xs text-slate-500 pt-1">
                    + {parsedSpec.endpoints.length - 5} more endpoints
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Base URL */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              API Base URL
            </label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => { setBaseUrl(e.target.value); setError(''); }}
                placeholder="https://api.yourservice.com"
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-400"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">The server Invari will forward validated requests to.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleLaunch}
            disabled={loading || !parsedSpec}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? (
              <span className="text-sm">Launching…</span>
            ) : (
              <>
                <span className="text-sm">Launch Playground</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-400 mt-4">
            No account needed · Nothing stored server-side
          </p>
        </div>
      </div>
    </div>
  );
};

export default DemoLandingPage;
