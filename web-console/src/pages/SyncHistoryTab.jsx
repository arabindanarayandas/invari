import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Circle, RefreshCw, Settings, AlertCircle } from 'lucide-react';
import apiClient from '../api/client';
import Card from '../components/Card';
import { getSyncIntervalLabel } from '../constants/syncIntervals';

const SyncHistoryTab = ({ application }) => {
  const [syncLogs, setSyncLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'success', 'no_change', 'failure'
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  const hasSubscription = application?.subscription;

  useEffect(() => {
    if (hasSubscription) {
      loadSyncLogs();
    }
  }, [application?.id, hasSubscription]);

  const loadSyncLogs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getSchemaSyncLogs(application.id, 50, 0);
      if (response.success) {
        setSyncLogs(response.data);
      }
    } catch (error) {
      console.error('Failed to load sync logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      setSyncError(null);
      const response = await apiClient.triggerManualSync(application.id);

      if (response.success) {
        // Reload sync logs after successful sync
        setTimeout(() => {
          loadSyncLogs();
        }, 1000);
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
      setSyncError(error.message || 'Failed to trigger sync');
    } finally {
      setSyncing(false);
    }
  };

  const filteredLogs = syncLogs.filter((log) => {
    if (filter === 'all') return true;
    return log.status === filter;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'no_change':
        return <Circle className="w-5 h-5 text-slate-400" />;
      case 'failure':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Circle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return <span className="px-2 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded">SUCCESS</span>;
      case 'no_change':
        return <span className="px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-600 rounded">NO CHANGES</span>;
      case 'failure':
        return <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded">FAILED</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-600 rounded">{status}</span>;
    }
  };

  if (!hasSubscription) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 mb-2">Auto-Sync Not Enabled</p>
          <p className="text-xs text-slate-500">This agent does not have auto-sync configured</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card className="p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-900 mb-2">Auto-Sync Configuration</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">Source URL:</span>
                <span className="text-xs text-slate-900 font-mono">{application.subscription.sourceUrl}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">Sync Interval:</span>
                <span className="text-xs text-slate-900 font-semibold">
                  {getSyncIntervalLabel(application.subscription.syncInterval)}
                </span>
              </div>
              {application.subscription.lastSuccessAt && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">Last Successful Sync:</span>
                  <span className="text-xs text-slate-900">
                    {new Date(application.subscription.lastSuccessAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleManualSync}
              disabled={syncing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-lg font-medium text-sm transition-all disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>

        {syncError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Sync Failed</p>
              <p className="text-xs text-red-700 mt-1">{syncError}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Filter Bar */}
      <Card className="p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">Filter:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                filter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('success')}
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                filter === 'success'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Success
            </button>
            <button
              onClick={() => setFilter('no_change')}
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                filter === 'no_change'
                  ? 'bg-slate-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              No Changes
            </button>
            <button
              onClick={() => setFilter('failure')}
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                filter === 'failure'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Failed
            </button>
          </div>
          <div className="text-xs text-slate-600">
            Showing {filteredLogs.length} of {syncLogs.length} logs
          </div>
        </div>
      </Card>

      {/* Sync Logs List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Loading sync history...</div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No sync logs found</p>
            <p className="text-xs text-slate-500 mt-1">
              {filter !== 'all' ? 'Try changing the filter' : 'Sync logs will appear here'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <Card key={log.id} className="p-4 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="mt-0.5">{getStatusIcon(log.status)}</div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-900">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                      {getStatusBadge(log.status)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {log.latencyMs}ms total
                    </div>
                  </div>

                  {log.status === 'no_change' && (
                    <p className="text-xs text-slate-600">
                      Hash matched • No version created
                    </p>
                  )}

                  {log.status === 'success' && (
                    <p className="text-xs text-slate-600">
                      New version synced successfully
                    </p>
                  )}

                  {log.status === 'failure' && log.errorMessage && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                      <p className="text-xs font-medium text-red-900">Error Details:</p>
                      <p className="text-xs text-red-700 mt-1">{log.errorMessage}</p>
                    </div>
                  )}

                  {/* Performance Metrics */}
                  {(log.fetchDurationMs || log.validationDurationMs) && (
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                      {log.fetchDurationMs && (
                        <span>Fetch: {log.fetchDurationMs}ms</span>
                      )}
                      {log.validationDurationMs && (
                        <span>Validation: {log.validationDurationMs}ms</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SyncHistoryTab;
