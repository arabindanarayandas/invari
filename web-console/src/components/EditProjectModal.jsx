import { useState, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle, Link, CheckCircle, Clock } from 'lucide-react';
import jsyaml from 'js-yaml';
import toast from 'react-hot-toast';
import { SYNC_INTERVALS, getSyncIntervalLabel } from '../constants/syncIntervals';
import apiClient from '../api/client';

const EditProjectModal = ({ project, onClose, onUpdate }) => {
  const [name, setName] = useState(project.name);
  const [targetBaseUrl, setTargetBaseUrl] = useState(project.targetBaseUrl || '');
  const [schemaFile, setSchemaFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  // Auto-sync state
  const hasSubscription = project.subscription && project.subscription.isActive;
  const [schemaMode, setSchemaMode] = useState(hasSubscription ? 'auto-sync' : 'upload');
  const [schemaSourceUrl, setSchemaSourceUrl] = useState(project.subscription?.sourceUrl || '');
  const [schemaSyncInterval, setSchemaSyncInterval] = useState(project.subscription?.syncInterval || '1hour');
  const [syncLogs, setSyncLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [validationError, setValidationError] = useState(null);

  // Load sync logs if auto-sync is enabled
  useEffect(() => {
    if (hasSubscription) {
      loadSyncLogs();
    }
  }, [hasSubscription, project.id]);

  const loadSyncLogs = async () => {
    try {
      setLoadingLogs(true);
      const response = await apiClient.getSchemaSyncLogs(project.id, 5, 0);
      if (response.success) {
        setSyncLogs(response.data);
      }
    } catch (err) {
      console.error('Failed to load sync logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const isYaml = file.name.endsWith('.yaml') || file.name.endsWith('.yml');
    const isJson = file.name.endsWith('.json');

    if (!isYaml && !isJson) {
      setError('Please upload a JSON or YAML file (.json, .yaml, or .yml)');
      return;
    }

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        let parsedSpec;

        if (isJson) {
          parsedSpec = JSON.parse(content);
        } else {
          parsedSpec = jsyaml.load(content);
        }

        // Basic validation
        if (!parsedSpec.openapi && !parsedSpec.swagger) {
          throw new Error('Invalid OpenAPI/Swagger specification');
        }

        setSchemaFile(parsedSpec);
        toast.success('Schema file parsed successfully');
      } catch (err) {
        setError(`Failed to parse file: ${err.message}`);
        setSchemaFile(null);
        setFileName('');
      }
    };

    reader.readAsText(file);
  };

  const handleValidateUpload = async () => {
    if (!schemaFile) {
      setValidationError('Please upload a file first');
      return;
    }

    setIsValidating(true);
    setValidationError(null);
    setValidationResult(null);

    try {
      const content = JSON.stringify(schemaFile);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsUploading(true);

    try {
      // Validate required fields
      if (!name.trim()) {
        setError('Agent name is required');
        setIsUploading(false);
        return;
      }

      // Validate Target Base URL if changed
      if (targetBaseUrl !== project.targetBaseUrl) {
        if (targetBaseUrl.trim()) {
          try {
            new URL(targetBaseUrl);
          } catch {
            setError('Invalid URL format. Please enter a valid URL (e.g., https://api.example.com)');
            setIsUploading(false);
            return;
          }
        }
      }

      // Validate auto-sync URL if in auto-sync mode
      if (schemaMode === 'auto-sync') {
        if (!schemaSourceUrl.trim()) {
          setError('OpenAPI Spec URL is required for auto-sync mode');
          setIsUploading(false);
          return;
        }

        try {
          new URL(schemaSourceUrl);
        } catch {
          setError('Please enter a valid OpenAPI Spec URL');
          setIsUploading(false);
          return;
        }
      }

      // Prepare update data
      const updateData = {};

      if (name !== project.name) {
        updateData.name = name;
      }

      if (targetBaseUrl !== project.targetBaseUrl) {
        updateData.targetBaseUrl = targetBaseUrl;
      }

      // Handle schema mode changes
      if (schemaMode === 'auto-sync') {
        // Add or update auto-sync configuration
        updateData.schemaSourceUrl = schemaSourceUrl.trim();
        updateData.schemaSyncInterval = schemaSyncInterval;
      } else if (hasSubscription) {
        // Switching from auto-sync to upload - disable auto-sync
        updateData.schemaSourceUrl = null;
        updateData.schemaSyncInterval = null;
      }

      await onUpdate(project.id, updateData, schemaFile, schemaMode);
      toast.success('Agent updated successfully');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update agent');
    } finally {
      setIsUploading(false);
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
          <h2 className="font-serif text-[21px] font-normal text-on-surface mb-[6px]">Edit Agent</h2>
          <p className="text-[13px] text-muted mb-[22px]">Update agent details and OpenAPI specification</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-7 p-4 bg-red-50 border border-red-200 rounded-[8px] flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-red-900 mb-1">Error</div>
              <div className="text-[13px] text-red-700">{error}</div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-7 pt-0">
          {/* Agent Name */}
          <div className="mb-4">
            <label className="block font-mono text-[10px] uppercase tracking-[0.1em] text-muted font-semibold mb-[6px]">
              Agent Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My AI Agent"
              required
              className="w-full px-[13px] py-[10px] border border-outline-variant rounded-[8px] bg-surface-container-low text-[13px] text-on-surface transition-colors duration-150 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Target Base URL */}
          <div className="mb-4">
            <label className="block font-mono text-[10px] uppercase tracking-[0.1em] text-muted font-semibold mb-[6px]">
              Target Base URL
            </label>
            <input
              type="text"
              value={targetBaseUrl}
              onChange={(e) => setTargetBaseUrl(e.target.value)}
              placeholder="https://api.example.com"
              className="w-full px-[13px] py-[10px] border border-outline-variant rounded-[8px] bg-surface-container-low text-[13px] text-on-surface transition-colors duration-150 focus:border-primary focus:outline-none"
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

          {/* Show current auto-sync status if enabled */}
          {hasSubscription && schemaMode === 'auto-sync' && (
            <div className="bg-success/10 border border-success/20 rounded-[8px] p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-body-sm font-medium text-success mb-1">
                    Auto-Sync Active
                  </div>
                  <div className="text-label-sm text-success space-y-1">
                    <div>Interval: {getSyncIntervalLabel(project.subscription.syncInterval)}</div>
                    {project.subscription.lastSuccessAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last sync: {new Date(project.subscription.lastSuccessAt).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Recent Sync Logs */}
                  {syncLogs.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-success/20">
                      <div className="text-label-sm font-medium text-success mb-2">Recent Syncs:</div>
                      <div className="space-y-1">
                        {syncLogs.map((log) => (
                          <div key={log.id} className="flex items-center gap-2 text-label-sm text-success">
                            <span className={`w-2 h-2 rounded-full ${
                              log.status === 'success' ? 'bg-success' :
                              log.status === 'no_change' ? 'bg-primary' :
                              'bg-red-600'
                            }`} />
                            <span className="font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                            <span className="capitalize">{log.status.replace('_', ' ')}</span>
                            {log.errorMessage && <span className="text-red-600 truncate">({log.errorMessage})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Auto-Sync URL Fields - Only show for auto-sync mode */}
          {schemaMode === 'auto-sync' ? (
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

              {/* Validate Button for Auto-Sync Mode */}
              {schemaSourceUrl.trim() && (
                <button
                  type="button"
                  onClick={handleValidateUrl}
                  disabled={isValidating}
                  className="w-full px-4 py-2 bg-primary hover:bg-blue-700 disabled:bg-surface-container-high disabled:text-on-surface-variant text-white rounded-[8px] font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              {validationResult && schemaMode === 'auto-sync' && (
                <div className="p-4 bg-success/10 border border-success/20 rounded-[8px]">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <div className="flex-1">
                      <p className="text-body-sm font-medium text-success">Valid OpenAPI Specification</p>
                      <p className="text-label-sm text-success mt-1">
                        {validationResult.endpointCount} endpoints found • {validationResult.title} (v{validationResult.version})
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Error for Auto-Sync Mode */}
              {validationError && schemaMode === 'auto-sync' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-[8px]">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <div className="flex-1">
                      <p className="text-body-sm font-medium text-red-900">Validation Failed</p>
                      <p className="text-label-sm text-red-700 mt-1">{validationError}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* OpenAPI Spec Upload - Only show for upload mode */}
          <div className="mb-4">
            <label className="block font-mono text-[10px] uppercase tracking-[0.1em] text-muted font-semibold mb-[6px]">
              Upload New OpenAPI Specification (Optional)
            </label>

            <div className={`border-2 border-dashed rounded-[10px] p-6 text-center cursor-pointer transition-all duration-150 ${
              fileName
                ? 'border-green bg-green-bg border-solid'
                : 'border-outline hover:border-green hover:bg-green-bg'
            }`}>
              <input
                type="file"
                id="schema-upload"
                accept=".json,.yaml,.yml"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="schema-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <div className="text-[22px] mb-[6px]">
                  {fileName ? '✓' : '↑'}
                </div>
                <div className={`text-[13px] font-semibold mb-[3px] ${fileName ? 'text-green' : 'text-on-surface'}`}>
                  {fileName || 'Click to upload or drag and drop'}
                </div>
                <div className="text-[12px] text-muted">
                  JSON or YAML files (.json, .yaml, .yml)
                </div>
              </label>
            </div>
          </div>

          {/* Validate Button for Upload Mode */}
          {schemaFile && (
            <button
              type="button"
              onClick={handleValidateUpload}
              disabled={isValidating}
              className="w-full px-4 py-2 bg-primary hover:bg-blue-700 disabled:bg-surface-container-high disabled:text-on-surface-variant text-white rounded-[8px] font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          {validationResult && schemaMode === 'upload' && (
            <div className="p-4 bg-success/10 border border-success/20 rounded-[8px]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <div className="flex-1">
                  <p className="text-body-sm font-medium text-success">Valid OpenAPI Specification</p>
                  <p className="text-label-sm text-success mt-1">
                    {validationResult.endpointCount} endpoints found • {validationResult.title} (v{validationResult.version})
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Validation Error for Upload Mode */}
          {validationError && schemaMode === 'upload' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-[8px]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div className="flex-1">
                  <p className="text-body-sm font-medium text-red-900">Validation Failed</p>
                  <p className="text-label-sm text-red-700 mt-1">{validationError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Current Spec Info */}
          <div className="bg-surface-container-low border border-outline-variant rounded-[8px] p-3 mb-5 text-[12px] text-muted leading-[1.8]">
            Current Specification<br/>
            Endpoints: <span className="text-on-surface font-semibold">{project.endpoints?.length || 0}</span> · Version: <span className="text-on-surface font-semibold">{project.spec?.info?.version || 'N/A'}</span> · Title: <span className="text-on-surface font-semibold">{project.spec?.info?.title || 'N/A'}</span>
          </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-[10px] justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-[18px] py-[9px] bg-transparent border border-outline rounded-[8px] text-[13px] text-on-surface hover:bg-surface-container-high transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !name.trim()}
              className="px-[18px] py-[9px] bg-primary text-white border-0 rounded-[8px] text-[13px] font-medium hover:opacity-88 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isUploading ? 'Updating…' : 'Update Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProjectModal;
