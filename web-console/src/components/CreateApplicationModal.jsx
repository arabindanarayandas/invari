import { useState, useRef, useEffect } from 'react';
import { X, Upload, File, CheckCircle, AlertCircle, FileText, Link } from 'lucide-react';
import yaml from 'js-yaml';
import { SYNC_INTERVALS } from '../constants/syncIntervals';
import apiClient from '../api/client';
import { Button, Input, Card } from './design-system';

const CreateApplicationModal = ({ onClose, onCreate, initialSpec = null }) => {
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

  // Create agent state
  const [isCreating, setIsCreating] = useState(false);

  const sampleSpecs = [
    { name: 'Vapi Booking API', file: 'yaml/vapi_booking_api.yaml' }
  ];

  // Load initialSpec if provided (from trial page)
  useEffect(() => {
    if (initialSpec && initialSpec.spec) {
      try {
        const parsed = parseOpenAPISpec(initialSpec.spec, initialSpec.filename || 'openapi-spec.json');
        setParsedSpec(parsed);
        setFile({ name: initialSpec.filename || 'openapi-spec.json', fromTrial: true });
        if (!name) {
          setName(parsed.title);
        }
        if (!description) {
          setDescription(parsed.description);
        }
      } catch (err) {
        setError(`Failed to load spec: ${err.message}`);
      }
    }
  }, [initialSpec]); // Only run when initialSpec changes

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

      setIsCreating(true);
      try {
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
      } catch (err) {
        setError(err.message || 'Failed to create agent');
      } finally {
        setIsCreating(false);
      }
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

      setIsCreating(true);
      try {
        await onCreate({
          mode: 'auto-sync',
          name: name.trim(),
          description: description.trim(),
          schemaSourceUrl: schemaSourceUrl.trim(),
          schemaSyncInterval,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        setError(err.message || 'Failed to create agent');
      } finally {
        setIsCreating(false);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-[14px] max-w-[500px] w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-7 pb-0">
          <h2 className="font-serif text-[21px] font-normal text-on-surface mb-[6px]">New Agent</h2>
          <p className="text-[13px] text-muted mb-[22px]">Connect a new API to invari. Takes about 60 seconds.</p>
        </div>

          {/* Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="p-7 pt-0">
            {/* Agent Name */}
            <div className="mb-4">
              <label className="block font-mono text-[10px] uppercase tracking-[0.1em] text-muted font-semibold mb-[6px]">
                Agent Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Payments API prod"
                className="w-full px-[13px] py-[10px] border border-outline-variant rounded-[8px] bg-surface-container-low text-[13px] text-on-surface transition-colors duration-150 focus:border-primary focus:outline-none"
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block font-mono text-[10px] uppercase tracking-[0.1em] text-muted font-semibold mb-[6px]">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your API"
                rows={3}
                className="w-full px-[13px] py-[10px] border border-outline-variant rounded-[8px] bg-surface-container-low text-[13px] text-on-surface transition-colors duration-150 focus:border-primary focus:outline-none resize-none"
              />
            </div>

            {/* Schema Source Mode Toggle */}
            <div className="mb-4">
              <label className="block font-mono text-[10px] uppercase tracking-[0.1em] text-muted font-semibold mb-[6px]">
                Schema Source
              </label>
              <div className="grid grid-cols-2 gap-[6px]">
                <button
                  type="button"
                  onClick={() => setSchemaMode('upload')}
                  className={`px-[9px] py-[9px] rounded-[7px] border-[1.5px] text-[13px] text-center transition-all duration-[120ms] ${
                    schemaMode === 'upload'
                      ? 'border-green bg-green-bg text-green font-semibold'
                      : 'border-outline bg-transparent text-muted hover:border-green/50'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setSchemaMode('auto-sync')}
                  className={`px-[9px] py-[9px] rounded-[7px] border-[1.5px] text-[13px] text-center transition-all duration-[120ms] ${
                    schemaMode === 'auto-sync'
                      ? 'border-green bg-green-bg text-green font-semibold'
                      : 'border-outline bg-transparent text-muted hover:border-green/50'
                  }`}
                >
                  Auto-Sync URL
                </button>
              </div>
            </div>

            {/* Sample Specs - Only show for upload mode */}
            {schemaMode === 'upload' && (
              <>
                <div className="mb-4">
                  <label className="block font-mono text-[10px] uppercase tracking-[0.1em] text-muted font-semibold mb-[6px]">
                    Load Sample Spec
                  </label>
                  <div className="flex gap-2">
                    {sampleSpecs.map((sample) => (
                      <button
                        key={sample.file}
                        type="button"
                        onClick={() => handleLoadSample(sample.file)}
                        className="px-4 py-2 border border-outline rounded-[8px] text-[13px] text-on-surface hover:bg-surface-container-high transition-colors"
                      >
                        {sample.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* File Upload */}
            <div className="mb-4">
              <label className="block font-mono text-[10px] uppercase tracking-[0.1em] text-muted font-semibold mb-[6px]">
                OpenAPI Specification *
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-[10px] p-6 text-center cursor-pointer transition-all duration-150 ${
                  file
                    ? 'border-green bg-green-bg border-solid'
                    : isDragging
                    ? 'border-green bg-green-bg'
                    : 'border-outline hover:border-green hover:bg-green-bg'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.yaml,.yml"
                  onChange={(e) => handleFileChange(e.target.files[0])}
                  className="hidden"
                />

                <div className="flex flex-col items-center" onClick={() => !file && fileInputRef.current.click()}>
                  <div className="text-[22px] mb-[6px]">
                    {file ? '✓' : '↑'}
                  </div>
                  <div className={`text-[13px] font-semibold mb-[3px] ${file ? 'text-green' : 'text-on-surface'}`}>
                    {file ? file.name : 'Click to upload or drag and drop'}
                  </div>
                  <div className="text-[12px] text-muted">
                    JSON or YAML files (.json, .yaml, .yml)
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-[8px] mb-4">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-red-600">{error}</p>
              </div>
            )}

            {/* Success Message with Endpoints Preview */}
            {parsedSpec && schemaMode === 'upload' && (
              <div className="p-4 bg-success/10 border border-success/20 rounded-[8px] mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <p className="text-body-sm font-medium text-success">
                    Valid OpenAPI spec • {parsedSpec.endpoints.length} endpoints found
                  </p>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {parsedSpec.endpoints.slice(0, 5).map((endpoint, idx) => (
                    <div key={idx} className="text-label-sm font-mono text-on-surface-variant flex gap-2">
                      <span className={`font-semibold ${
                        endpoint.method === 'GET' ? 'text-success' :
                        endpoint.method === 'POST' ? 'text-repair' :
                        endpoint.method === 'PUT' ? 'text-primary' :
                        endpoint.method === 'DELETE' ? 'text-red-600' :
                        'text-on-surface-variant'
                      }`}>
                        {endpoint.method}
                      </span>
                      <span>{endpoint.path}</span>
                    </div>
                  ))}
                  {parsedSpec.endpoints.length > 5 && (
                    <p className="text-label-sm text-on-surface-variant pt-1">
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
                <div className="mb-4">
                  <label className="block font-mono text-[10px] uppercase tracking-[0.1em] text-muted font-semibold mb-[6px]">
                    OpenAPI Spec URL *
                  </label>
                  <input
                    type="url"
                    value={schemaSourceUrl}
                    onChange={(e) => setSchemaSourceUrl(e.target.value)}
                    placeholder="https://api.example.com/openapi.json"
                    className="w-full px-[13px] py-[10px] border border-outline-variant rounded-[8px] bg-surface-container-low text-[13px] text-on-surface transition-colors duration-150 focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="mb-4">
                  <label className="block font-mono text-[10px] uppercase tracking-[0.1em] text-muted font-semibold mb-[6px]">
                    Sync Interval *
                  </label>
                  <select
                    value={schemaSyncInterval}
                    onChange={(e) => setSchemaSyncInterval(e.target.value)}
                    className="w-full px-[13px] py-[10px] border border-outline-variant rounded-[8px] bg-surface-container-low text-[13px] text-on-surface transition-colors duration-150 focus:border-primary focus:outline-none"
                  >
                    {SYNC_INTERVALS.map((interval) => (
                      <option key={interval.value} value={interval.value}>
                        {interval.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Validation Result for Auto-Sync Mode */}
                {validationResult && schemaMode === 'auto-sync' && (
                  <div className="p-4 bg-success/10 border border-success/20 rounded-[8px] mb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-success" />
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-success">Valid OpenAPI Specification</p>
                        <p className="text-[12px] text-success mt-1">
                          {validationResult.endpointCount} endpoints found • {validationResult.title} (v{validationResult.version})
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Validation Error for Auto-Sync Mode */}
                {validationError && schemaMode === 'auto-sync' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-[8px] mb-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-red-900">Validation Failed</p>
                        <p className="text-[12px] text-red-700 mt-1">{validationError}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div className="flex gap-[10px] justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                className="px-[18px] py-[9px] bg-transparent border border-outline rounded-[8px] text-[13px] text-on-surface hover:bg-surface-container-high transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || (schemaMode === 'upload' && !parsedSpec) || (schemaMode === 'auto-sync' && !schemaSourceUrl.trim()) || isCreating}
                className="px-[18px] py-[9px] bg-primary text-white border-0 rounded-[8px] text-[13px] font-medium hover:opacity-88 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Create Agent →'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
};

export default CreateApplicationModal;
