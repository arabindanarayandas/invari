import { useState } from 'react';
import {
  Activity, Shield, CheckCircle, Zap, BarChart3
} from 'lucide-react';
import {
  LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import Card from '../components/Card';
import Sidebar from '../components/Sidebar';
import { useGlobalDashboardStats, useGlobalDashboardTimeline } from '../hooks/useGlobalDashboard';

const AGENT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
];

const TOTAL_COLOR = '#0f172a';

const GlobalDashboardPage = ({ onNavigate, onLogout }) => {
  const [timelinePeriod, setTimelinePeriod] = useState('hourly');
  const [hoveredAgent, setHoveredAgent] = useState(null);
  const [lockedAgent, setLockedAgent] = useState('total');
  const activeAgent = hoveredAgent ?? lockedAgent;

  const { stats, loading: statsLoading } = useGlobalDashboardStats(true, 5000);
  const { data: timelineData, agents, loading: timelineLoading } = useGlobalDashboardTimeline(timelinePeriod);

  const s = stats || {
    totalRequests: 0,
    stableCount: 0,
    repairedCount: 0,
    blockedCount: 0,
    avgOverhead: 0,
  };

  const hasData = timelineData.length > 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const fullDate = payload[0]?.payload?.fullDate || label;
    return (
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '12px',
        color: '#0f172a',
      }}>
        <p style={{ color: '#64748b', fontWeight: 'bold', marginBottom: '6px' }}>{fullDate}</p>
        {payload.map((entry) => (
          <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color }} />
            <span style={{ color: '#475569' }}>{entry.name}:</span>
            <span style={{ fontWeight: 600 }}>{entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 font-sans flex">
      <Sidebar activeView="dashboard" onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex-1 ml-64 p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Dashboard</h1>
          <p className="text-slate-500 text-sm">Aggregated view across all your agents</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="text-xs font-semibold text-slate-600">Total Requests</div>
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {statsLoading ? '—' : s.totalRequests >= 1000000
                ? `${(Math.floor(s.totalRequests / 100000) / 10).toFixed(1)}M`
                : s.totalRequests >= 1000
                ? `${(Math.floor(s.totalRequests / 100) / 10).toFixed(1)}k`
                : s.totalRequests.toLocaleString()}
            </div>
          </Card>

          <Card className="p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="text-xs font-semibold text-slate-600">Requests Blocked</div>
              <Shield className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {statsLoading ? '—' : s.blockedCount.toLocaleString()}
            </div>
          </Card>

          <Card className="p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="text-xs font-semibold text-slate-600">Avg Overhead</div>
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {statsLoading ? '—' : `${s.avgOverhead}ms`}
            </div>
          </Card>

          <Card className="p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="text-xs font-semibold text-slate-600">Auto-Repaired</div>
              <CheckCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {statsLoading ? '—' : s.repairedCount.toLocaleString()}
            </div>
          </Card>
        </div>

        {/* Timeline Graph */}
        <Card className="p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Request Timeline</h3>
              <p className="text-xs text-slate-500">
                {timelinePeriod === 'hourly' ? 'Last 24 hours — all agents' : 'Last 30 days — all agents'}
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
              <div className="text-slate-500 text-sm">Loading timeline...</div>
            </div>
          ) : !hasData ? (
            <div className="h-80 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No data yet</p>
                <p className="text-xs text-slate-400 mt-1">Data will appear once requests are logged</p>
              </div>
            </div>
          ) : (
            <>
              <div
                className="h-80"
                onMouseLeave={() => setHoveredAgent(null)}
              >
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
                    <YAxis stroke="#94a3b8" style={{ fontSize: '11px' }} />
                    <Tooltip content={<CustomTooltip />} />

                    {/* Overall line */}
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Overall"
                      stroke={TOTAL_COLOR}
                      strokeWidth={activeAgent === 'total' ? 3 : 1}
                      strokeOpacity={activeAgent !== 'total' ? 0.15 : 1}
                      dot={false}
                      activeDot={{ r: 4 }}
                      onMouseEnter={() => setHoveredAgent('total')}
                    />

                    {/* Per-agent lines */}
                    {agents.map((agent, idx) => {
                      const color = AGENT_COLORS[idx % AGENT_COLORS.length];
                      const isActive = activeAgent === agent.id;
                      return (
                        <Line
                          key={agent.id}
                          type="monotone"
                          dataKey={agent.id}
                          name={agent.name}
                          stroke={color}
                          strokeWidth={isActive ? 3 : 1}
                          strokeOpacity={isActive ? 1 : 0.15}
                          dot={false}
                          activeDot={{ r: 5, fill: color }}
                          onMouseEnter={() => setHoveredAgent(agent.id)}
                        />
                      );
                    })}
                  </RechartsLine>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 pt-4 border-t border-slate-100 justify-center">
                {/* Overall legend item */}
                <button
                  className="flex items-center gap-1.5 transition-opacity"
                  style={{ opacity: activeAgent !== 'total' ? 0.4 : 1 }}
                  onMouseEnter={() => setHoveredAgent('total')}
                  onMouseLeave={() => setHoveredAgent(null)}
                  onClick={() => setLockedAgent('total')}
                >
                  <div style={{ width: 20, height: 2, backgroundColor: TOTAL_COLOR }} />
                  <span
                    className="text-xs font-semibold"
                    style={{ color: lockedAgent === 'total' ? TOTAL_COLOR : '#475569' }}
                  >
                    Overall
                  </span>
                </button>

                {agents.map((agent, idx) => {
                  const color = AGENT_COLORS[idx % AGENT_COLORS.length];
                  const isLocked = lockedAgent === agent.id;
                  return (
                    <button
                      key={agent.id}
                      className="flex items-center gap-1.5 transition-opacity"
                      style={{ opacity: activeAgent !== agent.id ? 0.4 : 1 }}
                      onMouseEnter={() => setHoveredAgent(agent.id)}
                      onMouseLeave={() => setHoveredAgent(null)}
                      onClick={() => setLockedAgent(agent.id)}
                    >
                      <div
                        className="rounded-full flex-shrink-0"
                        style={{
                          width: 10, height: 10, backgroundColor: color,
                          outline: isLocked ? `2px solid ${color}` : 'none',
                          outlineOffset: '2px',
                        }}
                      />
                      <span
                        className="text-xs"
                        style={{ color: isLocked ? color : '#475569', fontWeight: isLocked ? 600 : 400 }}
                      >
                        {agent.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default GlobalDashboardPage;
