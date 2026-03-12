import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity, Shield, CheckCircle, Cpu, Terminal,
  GitCommit, Search, Zap, Clock, Code, AlertTriangle,
  X, Pause, ArrowLeft, Info, Settings, FileText, Copy, Network, FlaskConical,
  BarChart3, LineChart, History
} from 'lucide-react';
import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../components/Card';
import Badge from '../components/Badge';
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
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans flex">
      {/* Sidebar */}
      <Sidebar activeView="applications" onNavigate={onBack} onLogout={onLogout} />

      {/* Main Content */}
      <div className="flex-1 ml-64 p-6">
        {/* Header */}
        <nav className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded transition-colors"
              title="Back to agents"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="w-7 h-7 bg-slate-100 border border-slate-200 rounded flex items-center justify-center">
              <Shield className="w-4 h-4 text-slate-900" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-lg tracking-tight">{application?.name || 'Invari'}</span>
              <p className="text-xs text-slate-500">{application?.endpoints?.length || 0} endpoints monitored</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">v1.0.0</span>
          </div>
        </nav>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-slate-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 px-1 text-sm font-medium transition-all relative ${
              activeTab === 'details'
                ? 'text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              Details
            </div>
            {activeTab === 'details' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('api-explorer')}
            className={`pb-3 px-1 text-sm font-medium transition-all relative ${
              activeTab === 'api-explorer'
                ? 'text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              API Explorer
            </div>
            {activeTab === 'api-explorer' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-3 px-1 text-sm font-medium transition-all relative ${
              activeTab === 'dashboard'
                ? 'text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </div>
            {activeTab === 'dashboard' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('traffic')}
            className={`pb-3 px-1 text-sm font-medium transition-all relative ${
              activeTab === 'traffic'
                ? 'text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Live Traffic
            </div>
            {activeTab === 'traffic' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
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
            className={`pb-3 px-1 text-sm font-medium transition-all relative ${
              activeTab === 'playground'
                ? 'text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              Playground
            </div>
            {activeTab === 'playground' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
            )}
          </button>

          {/* Sync History Tab - Only show for auto-sync agents */}
          {application?.subscription && (
            <button
              onClick={() => setActiveTab('sync-history')}
              className={`pb-3 px-1 text-sm font-medium transition-all relative ${
                activeTab === 'sync-history'
                  ? 'text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Sync History
              </div>
              {activeTab === 'sync-history' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-1 text-sm font-medium transition-all relative ${
              activeTab === 'settings'
                ? 'text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </div>
            {activeTab === 'settings' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          {/* Agent Info */}
          <Card className="p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Agent Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">Name</div>
                <div className="text-sm text-slate-900 font-medium">{application?.name}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Created</div>
                <div className="text-xs text-slate-900 font-mono">{new Date(application?.createdAt).toLocaleString()}</div>
              </div>
            </div>
          </Card>

          {/* Endpoints List */}
          <Card className="p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">API Endpoints</h2>
              <div className="text-xs text-slate-600">
                Total: <span className="font-semibold text-slate-900">{application?.endpoints?.length || 0}</span> endpoints
              </div>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {application?.endpoints?.map((endpoint, idx) => (
                <div key={idx} className="p-3 bg-slate-100 border border-slate-300 rounded-lg hover:border-slate-400 transition-colors">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      endpoint.method === 'GET' ? 'bg-blue-500/20 text-blue-400' :
                      endpoint.method === 'POST' ? 'bg-emerald-500/20 text-emerald-400' :
                      endpoint.method === 'PUT' || endpoint.method === 'PATCH' ? 'bg-amber-500/20 text-amber-400' :
                      endpoint.method === 'DELETE' ? 'bg-red-500/20 text-red-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {endpoint.method}
                    </span>
                    <span className="font-mono text-xs text-slate-900">{endpoint.path}</span>
                  </div>
                  {endpoint.summary && (
                    <div className="text-xs text-slate-600 ml-14">{endpoint.summary}</div>
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
        <Card className="p-5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="text-xs font-semibold text-slate-600">Total Requests</div>
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats.totalRequests >= 1000000
              ? `${(stats.totalRequests / 1000000).toFixed(1)}M`
              : stats.totalRequests >= 1000
              ? `${(stats.totalRequests / 1000).toFixed(1)}k`
              : stats.totalRequests}
          </div>
        </Card>

        {/* Requests Blocked */}
        <Card className="p-5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="text-xs font-semibold text-slate-600">Requests Blocked</div>
            <Shield className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats.blockedCount.toLocaleString()}
          </div>
        </Card>

        {/* Avg Overhead */}
        <Card className="p-5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="text-xs font-semibold text-slate-600">Avg Overhead</div>
            <Cpu className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats.avgOverhead}ms
          </div>
          <div className="text-xs text-slate-500 mt-1">Invari processing time</div>
        </Card>

        {/* Requests Repaired */}
        <Card className="p-5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="text-xs font-semibold text-slate-600">Auto-Repaired</div>
            <CheckCircle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats.repairedCount.toLocaleString()}
          </div>
        </Card>
      </div>

      {/* Request Timeline Graph */}
      <Card className="p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Request Timeline</h3>
            <p className="text-xs text-slate-600">
              {timelinePeriod === 'hourly' ? 'Last 24 hours' : 'Last 30 days including today'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTimelinePeriod('hourly')}
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                timelinePeriod === 'hourly'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hourly
            </button>
            <button
              onClick={() => setTimelinePeriod('daily')}
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                timelinePeriod === 'daily'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Daily
            </button>
          </div>
        </div>

        {timelineLoading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-slate-600">Loading timeline data...</div>
          </div>
        ) : timelineData.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">No data available yet</p>
              <p className="text-xs text-slate-500 mt-1">Data will appear once requests are logged</p>
            </div>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLine data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  style={{ fontSize: '11px' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke="#94a3b8"
                  style={{ fontSize: '11px' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#64748b', fontWeight: 'bold' }}
                  itemStyle={{ color: '#0f172a' }}
                  formatter={(value, name, props) => [
                    `${value.toLocaleString()} requests`,
                    props.payload.fullDate
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="#0f172a"
                  strokeWidth={2}
                  dot={{ fill: '#0f172a', r: 3 }}
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
          <Card className="p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-900" />
              API Gateway Configuration
            </h2>

            <div className="space-y-4">
              {/* Gateway Endpoint */}
              <div>
                <label className="text-xs text-slate-600 mb-2 block">Invari Proxy Endpoint</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/proxy/${application?.id}`}
                    readOnly
                    className="flex-1 px-3 py-2 bg-slate-100 border border-slate-300 rounded text-sm text-slate-700 font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/proxy/${application?.id}`);
                    }}
                    className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 rounded transition-all"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Route all your AI agent requests through this unique endpoint. Invari will automatically validate against your OpenAPI spec.
                </p>
              </div>

              {/* Agent ID */}
              <div>
                <label className="text-xs text-slate-600 mb-2 block">Agent ID</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={application?.id || 'N/A'}
                    readOnly
                    className="flex-1 px-3 py-2 bg-slate-100 border border-slate-300 rounded text-sm text-slate-700 font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      if (application?.id) {
                        navigator.clipboard.writeText(application.id);
                      }
                    }}
                    className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 rounded transition-all"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  This unique identifier is embedded in your proxy endpoint URL.
                </p>
              </div>

              {/* Invari API Key */}
              <div>
                <label className="text-xs text-slate-600 mb-2 block">Invari API Key</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={application?.invariApiKey || 'N/A'}
                    readOnly
                    className="flex-1 px-3 py-2 bg-slate-100 border border-slate-300 rounded text-sm text-slate-700 font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      if (application?.invariApiKey) {
                        navigator.clipboard.writeText(application.invariApiKey);
                      }
                    }}
                    className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 rounded transition-all"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Include this key in the <code className="px-1 py-0.5 bg-slate-200 rounded text-xs">X-Invari-Key</code> header for authentication.
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
