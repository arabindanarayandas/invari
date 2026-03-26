import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity, Shield, CheckCircle, Cpu, Terminal,
  GitCommit, Search, Zap, Clock, Code, AlertTriangle,
  X, Pause, ArrowLeft, Info, Settings, FileText, Copy, Network, FlaskConical,
  BarChart3, LineChart, History
} from 'lucide-react';
import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, Badge, Button } from '../components/design-system';
import ServiceMap from '../components/ServiceMap';
import Sidebar from '../components/Sidebar';
import AgentPlayground from '../components/AgentPlayground';
import LiveTrafficPage from './LiveTrafficPage';
import APIExplorerTab from './APIExplorerTab';
import SyncHistoryTab from './SyncHistoryTab';
import { useAgentStats } from '../hooks/useAgentStats';
import { useAnalyticsTimeline } from '../hooks/useAnalytics';

const DashboardPage = ({ application, onBack, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [flashEffect, setFlashEffect] = useState(null);
  const [timelinePeriod, setTimelinePeriod] = useState('hourly'); // 'hourly' or 'daily'

  // Fetch real stats from backend with polling enabled
  const { stats: backendStats, loading: statsLoading } = useAgentStats(
    application?.id,
    true, // Enable polling
    5000 // Poll every 5 seconds
  );

  // Fetch analytics timeline data based on selected period
  const timelineDays = timelinePeriod === 'hourly' ? 1 : 30;
  const { data: timelineData, loading: timelineLoading } = useAnalyticsTimeline(
    application?.id,
    timelineDays,
    timelinePeriod
  );

  // Use backend data or fallback to demo data
  const stats = backendStats || {
    totalRequests: 0,
    stableCount: 0,
    repairedCount: 0,
    blockedCount: 0,
    avgLatency: 0,
    avgOverhead: 0,
  };

  // Use application endpoints if available, otherwise fallback to defaults
  const endpoints = application?.endpoints?.map(e => e.path) ||
    ['/api/v1/stripe/charge', '/users/update', '/db/query', '/llm/generate', '/auth/verify', '/webhook/receive'];

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans flex">
      {/* Sidebar */}
      <Sidebar activeView="applications" onNavigate={onBack} onLogout={onLogout} />

      {/* Main Content */}
      <div className="flex-1 ml-60 p-6">
        {/* Header */}
        <nav className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-surface-container-high rounded-sm transition-colors"
              title="Back to agents"
            >
              <ArrowLeft className="w-5 h-5 text-on-surface-variant" />
            </button>
            <div className="w-7 h-7 bg-surface-container-low border border-outline-variant rounded-sm flex items-center justify-center">
              <Shield className="w-4 h-4 text-on-surface" />
            </div>
            <div>
              <span className="font-bold text-on-surface text-heading-md tracking-tight">{application?.name || 'Invari'}</span>
              <p className="text-label-sm text-on-surface-variant font-mono">{application?.endpoints?.length || 0} endpoints monitored</p>
            </div>
            <span className="text-label-sm text-on-surface-variant font-mono">v1.0.0</span>
          </div>
        </nav>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-outline-variant">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 px-1 text-body-sm font-medium transition-all relative ${
              activeTab === 'details'
                ? 'text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              Details
            </div>
            {activeTab === 'details' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('api-explorer')}
            className={`pb-3 px-1 text-body-sm font-medium transition-all relative ${
              activeTab === 'api-explorer'
                ? 'text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              API Explorer
            </div>
            {activeTab === 'api-explorer' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-3 px-1 text-body-sm font-medium transition-all relative ${
              activeTab === 'dashboard'
                ? 'text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </div>
            {activeTab === 'dashboard' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('traffic')}
            className={`pb-3 px-1 text-body-sm font-medium transition-all relative ${
              activeTab === 'traffic'
                ? 'text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Live Traffic
            </div>
            {activeTab === 'traffic' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
            )}
          </button>

          {/* <button
            onClick={() => setActiveTab('topology')}
            className={`pb-3 px-1 text-sm font-medium transition-all relative ${
              activeTab === 'topology'
                ? 'text-indigo-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4" />
              Service Map
            </div>
            {activeTab === 'topology' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
            )}
          </button> */}

          <button
            onClick={() => setActiveTab('playground')}
            className={`pb-3 px-1 text-body-sm font-medium transition-all relative ${
              activeTab === 'playground'
                ? 'text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              Playground
            </div>
            {activeTab === 'playground' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
            )}
          </button>

          {/* Sync History Tab - Only show for auto-sync agents */}
          {application?.subscription && (
            <button
              onClick={() => setActiveTab('sync-history')}
              className={`pb-3 px-1 text-body-sm font-medium transition-all relative ${
                activeTab === 'sync-history'
                  ? 'text-on-surface'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Sync History
              </div>
              {activeTab === 'sync-history' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-1 text-body-sm font-medium transition-all relative ${
              activeTab === 'settings'
                ? 'text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </div>
            {activeTab === 'settings' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          {/* Agent Info */}
          <Card variant="outlined" className="p-6">
            <h2 className="text-body-sm font-semibold text-on-surface mb-4 uppercase tracking-wide">Agent Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-label-sm text-on-surface-variant mb-1">Name</div>
                <div className="text-body-md text-on-surface font-medium">{application?.name}</div>
              </div>
              <div>
                <div className="text-label-sm text-on-surface-variant mb-1">Created</div>
                <div className="text-label-sm text-on-surface font-mono">{new Date(application?.createdAt).toLocaleString()}</div>
              </div>
            </div>
          </Card>

          {/* Endpoints List */}
          <Card variant="outlined" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-body-sm font-semibold text-on-surface uppercase tracking-wide">API Endpoints</h2>
              <div className="text-label-sm text-on-surface-variant font-mono">
                Total: <span className="font-semibold text-on-surface">{application?.endpoints?.length || 0}</span> endpoints
              </div>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {application?.endpoints?.map((endpoint, idx) => (
                <div key={idx} className="p-3 bg-surface-container-low border border-outline-variant rounded-sm hover:bg-surface-container-high transition-colors">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-xs font-mono ${
                      endpoint.method === 'GET' ? 'bg-primary/10 text-primary border border-primary/20' :
                      endpoint.method === 'POST' ? 'bg-success/10 text-success border border-success/20' :
                      endpoint.method === 'PUT' || endpoint.method === 'PATCH' ? 'bg-repair/10 text-repair border border-repair/20' :
                      endpoint.method === 'DELETE' ? 'bg-red-500/10 text-red-600 border border-red-500/20' :
                      'bg-surface-container-high text-on-surface-variant border border-outline-variant'
                    }`}>
                      {endpoint.method}
                    </span>
                    <span className="font-mono text-label-sm text-on-surface">{endpoint.path}</span>
                  </div>
                  {endpoint.summary && (
                    <div className="text-label-sm text-on-surface-variant ml-14">{endpoint.summary}</div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total Requests */}
        <Card variant="outlined" className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="text-label-md font-semibold text-on-surface-variant uppercase tracking-wide">Total Requests</div>
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div className="text-display-sm font-bold text-on-surface">
            {stats.totalRequests >= 1000000
              ? `${(stats.totalRequests / 1000000).toFixed(1)}M`
              : stats.totalRequests >= 1000
              ? `${(stats.totalRequests / 1000).toFixed(1)}k`
              : stats.totalRequests}
          </div>
        </Card>

        {/* Requests Blocked */}
        <Card variant="outlined" className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="text-label-md font-semibold text-on-surface-variant uppercase tracking-wide">Requests Blocked</div>
            <Shield className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-display-sm font-bold text-on-surface">
            {stats.blockedCount.toLocaleString()}
          </div>
        </Card>

        {/* Avg Overhead */}
        <Card variant="outlined" className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="text-label-md font-semibold text-on-surface-variant uppercase tracking-wide">Avg Overhead</div>
            <Cpu className="w-5 h-5 text-primary" />
          </div>
          <div className="text-display-sm font-bold text-on-surface">
            {stats.avgOverhead}ms
          </div>
          <div className="text-label-sm text-on-surface-variant mt-1">Invari processing time</div>
        </Card>

        {/* Requests Repaired */}
        <Card variant="outlined" className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="text-label-md font-semibold text-on-surface-variant uppercase tracking-wide">Auto-Repaired</div>
            <CheckCircle className="w-5 h-5 text-repair" />
          </div>
          <div className="text-display-sm font-bold text-on-surface">
            {stats.repairedCount.toLocaleString()}
          </div>
        </Card>
      </div>

      {/* Request Timeline Graph */}
      <Card variant="outlined" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-heading-sm font-semibold text-on-surface mb-1">Request Timeline</h3>
            <p className="text-label-md text-on-surface-variant">
              {timelinePeriod === 'hourly' ? 'Last 24 hours' : 'Last 30 days including today'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={timelinePeriod === 'hourly' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTimelinePeriod('hourly')}
            >
              Hourly
            </Button>
            <Button
              variant={timelinePeriod === 'daily' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTimelinePeriod('daily')}
            >
              Daily
            </Button>
          </div>
        </div>

        {timelineLoading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-on-surface-variant">Loading timeline data...</div>
          </div>
        ) : timelineData.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" />
              <p className="text-on-surface-variant text-body-md">No data available yet</p>
              <p className="text-label-sm text-on-surface-variant mt-1">Data will appear once requests are logged</p>
            </div>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLine data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  stroke="#64748B"
                  style={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke="#64748B"
                  style={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '4px',
                    color: '#1E293B',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#64748B', fontWeight: 'bold' }}
                  itemStyle={{ color: '#1E293B' }}
                  formatter={(value, name, props) => [
                    `${value.toLocaleString()} requests`,
                    props.payload.fullDate
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="#0052FF"
                  strokeWidth={2}
                  dot={{ fill: '#0052FF', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </RechartsLine>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
        </>
      )}

      {/* Live Traffic Tab */}
      {activeTab === 'traffic' && (
        <LiveTrafficPage application={application} />
      )}

      {/* API Explorer Tab */}
      {activeTab === 'api-explorer' && (
        <APIExplorerTab application={application} />
      )}

      {/* Sync History Tab */}
      {activeTab === 'sync-history' && (
        <SyncHistoryTab application={application} />
      )}

      {/* Service Map / Topology Tab */}
      {/* {activeTab === 'topology' && (
        <>
          <div className="h-[calc(100vh-250px)] min-h-[700px]">
            <ServiceMap flashEffect={flashEffect} setFlashEffect={setFlashEffect} />
          </div>

          <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                addCleanRequest();
                setFlashEffect('stable');
              }}
              className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 rounded-lg font-medium text-sm transition-all flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Simulate Clean Request
            </button>

            <button
              onClick={() => {
                addDriftRequest();
                setFlashEffect('repaired');
              }}
              className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-400 rounded-lg font-medium text-sm transition-all flex items-center gap-2"
            >
              <Code className="w-4 h-4" />
              Simulate Schema Drift
            </button>

            <button
              onClick={() => {
                addAttackRequest();
                setFlashEffect('blocked');
              }}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 rounded-lg font-medium text-sm transition-all flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Simulate Attack
            </button>
          </div>
        </>
      )} */}

      {/* Agent Simulation Playground Tab */}
      {activeTab === 'playground' && (
        <AgentPlayground application={application} />
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* API Gateway Configuration */}
          <Card variant="outlined" className="p-6">
            <h2 className="text-body-sm font-semibold text-on-surface mb-4 flex items-center gap-2 uppercase tracking-wide">
              <Shield className="w-5 h-5 text-on-surface" />
              API Gateway Configuration
            </h2>

            <div className="space-y-4">
              {/* Gateway Endpoint */}
              <div>
                <label className="text-label-sm text-on-surface-variant mb-2 block">Invari Proxy Endpoint</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/proxy/${application?.id}`}
                    readOnly
                    className="flex-1 px-3 py-2 bg-surface-container-low border border-outline-variant rounded-sm text-body-sm text-on-surface font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/proxy/${application?.id}`);
                    }}
                    className="p-2 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant text-on-surface rounded-sm transition-all"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-label-sm text-on-surface-variant mt-2">
                  Route all your AI agent requests through this unique endpoint. Invari will automatically validate against your OpenAPI spec.
                </p>
              </div>

              {/* Agent ID */}
              <div>
                <label className="text-label-sm text-on-surface-variant mb-2 block">Agent ID</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={application?.id || 'N/A'}
                    readOnly
                    className="flex-1 px-3 py-2 bg-surface-container-low border border-outline-variant rounded-sm text-body-sm text-on-surface font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      if (application?.id) {
                        navigator.clipboard.writeText(application.id);
                      }
                    }}
                    className="p-2 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant text-on-surface rounded-sm transition-all"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-label-sm text-on-surface-variant mt-2">
                  This unique identifier is embedded in your proxy endpoint URL.
                </p>
              </div>

              {/* Invari API Key */}
              <div>
                <label className="text-label-sm text-on-surface-variant mb-2 block">Invari API Key</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={application?.invariApiKey || 'N/A'}
                    readOnly
                    className="flex-1 px-3 py-2 bg-surface-container-low border border-outline-variant rounded-sm text-body-sm text-on-surface font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      if (application?.invariApiKey) {
                        navigator.clipboard.writeText(application.invariApiKey);
                      }
                    }}
                    className="p-2 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant text-on-surface rounded-sm transition-all"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-label-sm text-on-surface-variant mt-2">
                  Include this key in the <code className="px-1 py-0.5 bg-surface-container-high rounded-xs text-label-sm font-mono">X-Invari-Key</code> header for authentication.
                </p>
              </div>
            </div>
          </Card>

          {/* Security Settings
          <Card className="p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-900" />
              Security Settings
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-100 border border-slate-300 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-slate-900 mb-1">Schema Validation</div>
                  <div className="text-xs text-slate-600">Validate all requests against OpenAPI specification</div>
                </div>
                <div className="w-12 h-6 bg-emerald-500 rounded-full relative cursor-pointer">
                  <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full"></div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-100 border border-slate-300 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-slate-900 mb-1">Auto-Repair Schema Drift</div>
                  <div className="text-xs text-slate-600">Automatically fix field name and type mismatches</div>
                </div>
                <div className="w-12 h-6 bg-emerald-500 rounded-full relative cursor-pointer">
                  <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full"></div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-100 border border-slate-300 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-slate-900 mb-1">Block High-Risk Requests</div>
                  <div className="text-xs text-slate-600">Block requests with SQL injection or malicious patterns</div>
                </div>
                <div className="w-12 h-6 bg-emerald-500 rounded-full relative cursor-pointer">
                  <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full"></div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-100 border border-slate-300 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-slate-900 mb-1">Request Logging</div>
                  <div className="text-xs text-slate-600">Log all requests for audit and debugging</div>
                </div>
                <div className="w-12 h-6 bg-emerald-500 rounded-full relative cursor-pointer">
                  <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </Card>
          */}

          {/* Performance Settings
          <Card className="p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              Performance Settings
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-600 mb-2 block">Rate Limiting (requests/min)</label>
                <input
                  type="number"
                  defaultValue="1000"
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded text-sm text-slate-700 focus:outline-none focus:border-slate-900"
                />
                <p className="text-xs text-slate-500 mt-2">Maximum requests per minute per agent</p>
              </div>

              <div>
                <label className="text-xs text-slate-600 mb-2 block">Request Timeout (ms)</label>
                <input
                  type="number"
                  defaultValue="5000"
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded text-sm text-slate-700 focus:outline-none focus:border-slate-900"
                />
                <p className="text-xs text-slate-500 mt-2">Maximum time to wait for upstream API response</p>
              </div>
            </div>
          </Card>
          */}

          {/* Danger Zone
          <Card className="p-6 shadow-sm border-red-200">
            <h2 className="text-sm font-semibold text-red-600 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-900 mb-1">Regenerate API Key</div>
                  <div className="text-xs text-slate-600">Invalidate current key and generate a new one</div>
                </div>
                <button className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded text-sm transition-all">
                  Regenerate
                </button>
              </div>

              <div className="border-t border-slate-300 pt-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-900 mb-1">Delete Agent</div>
                  <div className="text-xs text-slate-600">Permanently delete this agent and all data</div>
                </div>
                <button className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded text-sm transition-all">
                  Delete
                </button>
              </div>
            </div>
          </Card>
          */}
        </div>
      )}
      </div>
    </div>
  );
};

export default DashboardPage;
