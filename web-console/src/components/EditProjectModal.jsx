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
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-outline-variant">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-outline-variant">
          <div>
            <h2 className="text-heading-lg font-bold text-on-surface">Edit Agent</h2>
            <p className="text-body-sm text-on-surface-variant mt-1">Update agent details and OpenAPI specification</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-container-high rounded-sm transition-colors"
          >
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-body-sm font-medium text-red-900 mb-1">Error</div>
              <div className="text-body-sm text-red-700">{error}</div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Agent Name */}
          <div>
            <label className="block text-label-md font-medium text-on-surface-variant mb-2">
              Agent Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My AI Agent"
              required
              className="w-full px-4 py-2 border border-outline-variant rounded-sm focus:outline-none focus:border-primary focus:border-transparent text-on-surface"
            />
          </div>

          {/* Target Base URL */}
          <div>
            <label className="block text-label-md font-medium text-on-surface-variant mb-2">
              Target Base URL
            </label>
            <input
              type="text"
              value={targetBaseUrl}
              onChange={(e) => setTargetBaseUrl(e.target.value)}
              placeholder="https://api.example.com"
              className="w-full px-4 py-2 border border-outline-variant rounded-sm focus:outline-none focus:border-primary focus:border-transparent text-on-surface"
            />
            <p className="text-label-sm text-on-surface-variant mt-1">
              The base URL where your API is hosted
            </p>
          </div>

          {/* Schema Source Mode Toggle */}
          <div>
            <label className="block text-label-md font-medium text-on-surface-variant mb-3">
              Schema Source
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSchemaMode('upload')}
                className={`flex-1 px-4 py-3 border-2 rounded-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  schemaMode === 'upload'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setSchemaMode('auto-sync')}
                className={`flex-1 px-4 py-3 border-2 rounded-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  schemaMode === 'auto-sync'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline'
                }`}
              >
                <Link className="w-4 h-4" />
                Auto-Sync URL
              </button>
            </div>
          </div>

          {/* Show current auto-sync status if enabled */}
          {hasSubscription && schemaMode === 'auto-sync' && (
            <div className="bg-success/10 border border-success/20 rounded-sm p-4">
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
              <div>
                <label className="block text-label-md font-medium text-on-surface-variant mb-2">
                  OpenAPI Spec URL *
                </label>
                <input
                  type="url"
                  value={schemaSourceUrl}
                  onChange={(e) => setSchemaSourceUrl(e.target.value)}
                  placeholder="https://api.example.com/openapi.json"
                  className="w-full px-4 py-2 border border-outline-variant rounded-sm focus:outline-none focus:border-primary focus:border-transparent text-on-surface"
                />
                <p className="text-label-sm text-on-surface-variant mt-1">
                  URL to your OpenAPI specification (JSON or YAML)
                </p>
              </div>

              <div>
                <label className="block text-label-md font-medium text-on-surface-variant mb-2">
                  Sync Interval *
                </label>
                <select
                  value={schemaSyncInterval}
                  onChange={(e) => setSchemaSyncInterval(e.target.value)}
                  className="w-full px-4 py-2 border border-outline-variant rounded-sm focus:outline-none focus:border-primary focus:border-transparent text-on-surface"
                >
                  {SYNC_INTERVALS.map((interval) => (
                    <option key={interval.value} value={interval.value}>
                      {interval.label}
                    </option>
                  ))}
                </select>
                <p className="text-label-sm text-on-surface-variant mt-1">
                  How often to check for updates to your OpenAPI spec
                </p>
              </div>

              {/* Validate Button for Auto-Sync Mode */}
              {schemaSourceUrl.trim() && (
                <button
                  type="button"
                  onClick={handleValidateUrl}
                  disabled={isValidating}
                  className="w-full px-4 py-2 bg-primary hover:bg-blue-700 disabled:bg-surface-container-high disabled:text-on-surface-variant text-white rounded-sm font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                <div className="p-4 bg-success/10 border border-success/20 rounded-sm">
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
                <div className="p-4 bg-red-50 border border-red-200 rounded-sm">
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
          <div>
            <label className="block text-label-md font-medium text-on-surface-variant mb-2">
              Upload New OpenAPI Specification (Optional)
            </label>

            <div className="border-2 border-dashed border-outline-variant rounded-sm p-6 hover:border-primary transition-colors">
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
                <div className="w-12 h-12 bg-primary/10 rounded-sm flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <div className="text-body-sm font-medium text-on-surface mb-1">
                  {fileName || 'Click to upload or drag and drop'}
                </div>
                <div className="text-label-sm text-on-surface-variant">
                  JSON or YAML files (.json, .yaml, .yml)
                </div>
              </label>
            </div>

            {fileName && (
              <div className="mt-3 flex items-center gap-2 text-body-sm text-success bg-success/10 border border-success/20 rounded-sm p-3">
                <FileText className="w-4 h-4" />
                <span className="font-medium">{fileName}</span>
              </div>
            )}

            <p className="text-label-sm text-on-surface-variant mt-2">
              Leave empty to keep current specification. Upload a new JSON or YAML file to update.
            </p>
          </div>

          {/* Validate Button for Upload Mode */}
          {schemaFile && (
            <button
              type="button"
              onClick={handleValidateUpload}
              disabled={isValidating}
              className="w-full px-4 py-2 bg-primary hover:bg-blue-700 disabled:bg-surface-container-high disabled:text-on-surface-variant text-white rounded-sm font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            <div className="p-4 bg-success/10 border border-success/20 rounded-sm">
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
            <div className="p-4 bg-red-50 border border-red-200 rounded-sm">
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
          <div className="bg-surface-container-low border border-outline-variant rounded-sm p-4">
            <div className="text-label-sm font-semibold text-on-surface-variant mb-2">Current Specification</div>
            <div className="space-y-1 text-label-sm text-on-surface-variant">
              <div>Endpoints: {project.endpoints?.length || 0}</div>
              <div>Version: {project.spec?.info?.version || 'N/A'}</div>
              <div>Title: {project.spec?.info?.title || 'N/A'}</div>
            </div>
          </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-outline-variant text-on-surface-variant rounded-sm hover:bg-surface-container-low font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !name.trim()}
              className="flex-1 px-4 py-2 bg-primary hover:bg-blue-700 disabled:bg-surface-container-high disabled:text-on-surface-variant text-white rounded-sm font-medium transition-colors disabled:cursor-not-allowed"
            >
              {isUploading ? 'Updating...' : 'Update Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProjectModal;
