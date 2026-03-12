import { useState, useRef } from 'react';
import { X, Upload, File, CheckCircle, AlertCircle, FileText, Link } from 'lucide-react';
import yaml from 'js-yaml';
import { SYNC_INTERVALS } from '../constants/syncIntervals';
import apiClient from '../api/client';

const CreateApplicationModal = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [parsedSpec, setParsedSpec] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Auto-sync state
  const [schemaMode, setSchemaMode] = useState('upload'); // 'upload' or 'auto-sync'
  const [schemaSourceUrl, setSchemaSourceUrl] = useState('');
  const [schemaSyncInterval, setSchemaSyncInterval] = useState('1hour');

  // Validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [validationError, setValidationError] = useState(null);

  const sampleSpecs = [
    { name: 'Vapi Booking API', file: 'yaml/vapi_booking_api.yaml' }
  ];

  const parseOpenAPISpec = (content, filename) => {
    try {
      let spec;
      if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
        spec = yaml.load(content);
      } else if (filename.endsWith('.json')) {
        spec = JSON.parse(content);
      } else {
        throw new Error('Unsupported file format. Please upload a .json or .yaml file.');
      }

      // Validate basic OpenAPI structure
      if (!spec.openapi && !spec.swagger) {
        throw new Error('Invalid OpenAPI specification. Missing "openapi" or "swagger" field.');
      }

      if (!spec.paths) {
        throw new Error('Invalid OpenAPI specification. Missing "paths" field.');
      }

      // Extract endpoints
      const endpoints = [];
      Object.keys(spec.paths).forEach((path) => {
        Object.keys(spec.paths[path]).forEach((method) => {
          if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
            endpoints.push({
              path,
              method: method.toUpperCase(),
              summary: spec.paths[path][method].summary || '',
              operationId: spec.paths[path][method].operationId || ''
            });
          }
        });
      });

      return {
        spec,
        endpoints,
        title: spec.info?.title || 'Untitled API',
        description: spec.info?.description || '',
        version: spec.info?.version || '1.0.0'
      };
    } catch (err) {
      throw new Error(`Failed to parse spec: ${err.message}`);
    }
  };

  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;

    setError(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseOpenAPISpec(e.target.result, selectedFile.name);
        setParsedSpec(parsed);
        if (!name) {
          setName(parsed.title);
        }
        if (!description) {
          setDescription(parsed.description);
        }
      } catch (err) {
        setError(err.message);
        setParsedSpec(null);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleLoadSample = async (sampleFile) => {
    try {
      setError(null);
      const response = await fetch(`/sample-specs/${sampleFile}`);
      const content = await response.text();
      const parsed = parseOpenAPISpec(content, sampleFile);
      setParsedSpec(parsed);
      setFile({ name: sampleFile, isSample: true });
      if (!name) {
        setName(parsed.title);
      }
      if (!description) {
        setDescription(parsed.description);
      }
    } catch (err) {
      setError(err.message);
    }
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
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleValidateUpload = async () => {
    if (!parsedSpec) {
      setValidationError('Please upload a file first');
      return;
    }

    setIsValidating(true);
    setValidationError(null);
    setValidationResult(null);

    try {
      // Use the already-parsed spec (works for both uploaded files and samples)
      const content = JSON.stringify(parsedSpec.spec);
      const response = await apiClient.validateOpenApiSpec(content);

      if (response.success) {
        setValidationResult(response.data);
        setValidationError(null);
      } else {
        setValidationError(response.error || 'Validation failed');
        setValidationResult(null);
      }
    } catch (err) {
      setValidationError(err.message || 'Validation failed');
      setValidationResult(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleValidateUrl = async () => {
    if (!schemaSourceUrl.trim()) {
      setValidationError('Please enter a URL first');
      return;
    }

    // Validate URL format
    try {
      new URL(schemaSourceUrl);
    } catch {
      setValidationError('Please enter a valid URL');
      return;
    }

    setIsValidating(true);
    setValidationError(null);
    setValidationResult(null);

    try {
      const response = await apiClient.validateOpenApiUrl(schemaSourceUrl.trim());

      if (response.success) {
        setValidationResult(response.data);
        setValidationError(null);
      } else {
        setValidationError(response.error || 'Validation failed');
        setValidationResult(null);
      }
    } catch (err) {
      setValidationError(err.message || 'Validation failed');
      setValidationResult(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Agent name is required');
      return;
    }

    if (schemaMode === 'upload') {
      if (!parsedSpec) {
        setError('Please upload a valid OpenAPI specification');
        return;
      }

      await onCreate({
        mode: 'upload',
        name: name.trim(),
        description: description.trim(),
        spec: parsedSpec.spec,
        endpoints: parsedSpec.endpoints,
        endpointsCount: parsedSpec.endpoints.length,
        version: parsedSpec.version,
        createdAt: new Date().toISOString()
      });
    } else {
      // Auto-sync mode
      if (!schemaSourceUrl.trim()) {
        setError('OpenAPI Spec URL is required');
        return;
      }

      // Validate URL format
      try {
        new URL(schemaSourceUrl);
      } catch {
        setError('Please enter a valid URL');
        return;
      }

      await onCreate({
        mode: 'auto-sync',
        name: name.trim(),
        description: description.trim(),
        schemaSourceUrl: schemaSourceUrl.trim(),
        schemaSyncInterval,
        createdAt: new Date().toISOString()
      });
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white border-l border-slate-200 shadow-2xl z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Create New Agent</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Agent Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Agent Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My AI Agent"
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-300"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your API"
                rows={3}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-300 resize-none"
              />
            </div>

            {/* Schema Source Mode Toggle */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Schema Source *
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSchemaMode('upload')}
                  className={`flex-1 px-4 py-3 border-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    schemaMode === 'upload'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setSchemaMode('auto-sync')}
                  className={`flex-1 px-4 py-3 border-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    schemaMode === 'auto-sync'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                  }`}
                >
                  <Link className="w-4 h-4" />
                  Auto-Sync URL
                </button>
              </div>
            </div>

            {/* Sample Specs - Only show for upload mode */}
            {schemaMode === 'upload' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Load Sample Spec
                  </label>
                  <div className="flex gap-2">
                    {sampleSpecs.map((sample) => (
                      <button
                        key={sample.file}
                        onClick={() => handleLoadSample(sample.file)}
                        className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 hover:border-indigo-300 text-slate-700 text-sm rounded-lg transition-all"
                      >
                        {sample.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Upload OpenAPI Specification *
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                  isDragging
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.yaml,.yml"
                  onChange={(e) => handleFileChange(e.target.files[0])}
                  className="hidden"
                />

                {file ? (
                  <div className="flex flex-col items-center">
                    <FileText className="w-12 h-12 text-indigo-600 mb-3" />
                    <p className="text-sm font-medium text-slate-900 mb-1">{file.name}</p>
                    <button
                      onClick={() => fileInputRef.current.click()}
                      className="text-xs text-indigo-600 hover:text-indigo-700"
                    >
                      Change file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-12 h-12 text-slate-400 mb-3" />
                    <p className="text-sm text-slate-600 mb-2">
                      Drag & drop your OpenAPI spec or
                    </p>
                    <button
                      onClick={() => fileInputRef.current.click()}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-sm rounded-lg transition-all"
                    >
                      Browse Files
                    </button>
                    <p className="text-xs text-slate-400 mt-2">
                      Supports .json, .yaml, .yml
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Validate Button for Upload Mode */}
            {parsedSpec && (
              <button
                onClick={handleValidateUpload}
                disabled={isValidating}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isValidating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Validate Spec
                  </>
                )}
              </button>
            )}

            {/* Validation Result for Upload Mode */}
            {validationResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald-900">Valid OpenAPI Specification</p>
                    <p className="text-xs text-emerald-700 mt-1">
                      {validationResult.endpointCount} endpoints found • {validationResult.title} (v{validationResult.version})
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Validation Error for Upload Mode */}
            {validationError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">Validation Failed</p>
                    <p className="text-xs text-red-700 mt-1">{validationError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Success Message with Endpoints Preview */}
            {parsedSpec && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-600">
                    Valid OpenAPI spec • {parsedSpec.endpoints.length} endpoints found
                  </p>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
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
              </>
            )}

            {/* Auto-Sync URL Fields - Only show for auto-sync mode */}
            {schemaMode === 'auto-sync' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    OpenAPI Spec URL *
                  </label>
                  <input
                    type="url"
                    value={schemaSourceUrl}
                    onChange={(e) => setSchemaSourceUrl(e.target.value)}
                    placeholder="https://api.example.com/openapi.json"
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-300"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    URL to your OpenAPI specification (JSON or YAML)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Sync Interval *
                  </label>
                  <select
                    value={schemaSyncInterval}
                    onChange={(e) => setSchemaSyncInterval(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-300"
                  >
                    {SYNC_INTERVALS.map((interval) => (
                      <option key={interval.value} value={interval.value}>
                        {interval.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    How often to check for updates to your OpenAPI spec
                  </p>
                </div>

                {/* Validate Button for Auto-Sync Mode */}
                {schemaSourceUrl.trim() && (
                  <button
                    onClick={handleValidateUrl}
                    disabled={isValidating}
                    className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isValidating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Validate URL
                      </>
                    )}
                  </button>
                )}

                {/* Validation Result for Auto-Sync Mode */}
                {validationResult && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-emerald-900">Valid OpenAPI Specification</p>
                        <p className="text-xs text-emerald-700 mt-1">
                          {validationResult.endpointCount} endpoints found • {validationResult.title} (v{validationResult.version})
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Validation Error for Auto-Sync Mode */}
                {validationError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-900">Validation Failed</p>
                        <p className="text-xs text-red-700 mt-1">{validationError}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Auto-Sync Mode:</strong> Invari will automatically fetch and validate your OpenAPI spec at the selected interval. You'll be notified if the spec changes or if there are any sync errors.
                  </p>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!name.trim() || (schemaMode === 'upload' && !parsedSpec) || (schemaMode === 'auto-sync' && !schemaSourceUrl.trim())}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed"
              >
                Create Agent
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateApplicationModal;
