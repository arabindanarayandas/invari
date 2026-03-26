import { useState } from 'react';
import {
  Activity, Shield, CheckCircle, Zap, BarChart3
} from 'lucide-react';
import {
  LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Card, Button } from '../components/design-system';
import Sidebar from '../components/Sidebar';
import { useGlobalDashboardStats, useGlobalDashboardTimeline } from '../hooks/useGlobalDashboard';

const AGENT_COLORS = [
  '#0052FF', // primary
  '#059669', // success
  '#D97706', // repair
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
];

const TOTAL_COLOR = '#1E293B';

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
      <div className="bg-surface-container-lowest border border-outline-variant rounded-sm p-3 text-label-sm">
        <p className="text-on-surface-variant font-semibold mb-2">{fullDate}</p>
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-on-surface-variant">{entry.name}:</span>
            <span className="font-semibold text-on-surface">{entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans flex">
      <Sidebar activeView="dashboard" onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex-1 ml-60 p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-display-sm font-bold text-on-surface mb-1">Dashboard</h1>
          <p className="text-on-surface-variant text-body-sm">Aggregated view across all your agents</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card variant="outlined" className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="text-label-md font-semibold text-on-surface-variant uppercase tracking-wide">Total Requests</div>
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div className="text-display-sm font-bold text-on-surface">
              {statsLoading ? '—' : s.totalRequests >= 1000000
                ? `${(Math.floor(s.totalRequests / 100000) / 10).toFixed(1)}M`
                : s.totalRequests >= 1000
                ? `${(Math.floor(s.totalRequests / 100) / 10).toFixed(1)}k`
                : s.totalRequests.toLocaleString()}
            </div>
          </Card>

          <Card variant="outlined" className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="text-label-md font-semibold text-on-surface-variant uppercase tracking-wide">Requests Blocked</div>
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-display-sm font-bold text-on-surface">
              {statsLoading ? '—' : s.blockedCount.toLocaleString()}
            </div>
          </Card>

          <Card variant="outlined" className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="text-label-md font-semibold text-on-surface-variant uppercase tracking-wide">Avg Overhead</div>
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div className="text-display-sm font-bold text-on-surface">
              {statsLoading ? '—' : `${s.avgOverhead}ms`}
            </div>
          </Card>

          <Card variant="outlined" className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="text-label-md font-semibold text-on-surface-variant uppercase tracking-wide">Auto-Repaired</div>
              <CheckCircle className="w-5 h-5 text-repair" />
            </div>
            <div className="text-display-sm font-bold text-on-surface">
              {statsLoading ? '—' : s.repairedCount.toLocaleString()}
            </div>
          </Card>
        </div>

        {/* Timeline Graph */}
        <Card variant="outlined" className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-heading-sm font-semibold text-on-surface mb-1">Request Timeline</h3>
              <p className="text-label-md text-on-surface-variant">
                {timelinePeriod === 'hourly' ? 'Last 24 hours — all agents' : 'Last 30 days — all agents'}
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
              <div className="text-on-surface-variant text-body-sm">Loading timeline...</div>
            </div>
          ) : !hasData ? (
            <div className="h-80 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" />
                <p className="text-on-surface-variant text-body-sm">No data yet</p>
                <p className="text-label-sm text-on-surface-variant mt-1">Data will appear once requests are logged</p>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="date"
                      stroke="#64748B"
                      style={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis stroke="#64748B" style={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }} />
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
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 pt-4 border-t border-outline-variant justify-center">
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
                    className="text-label-sm font-semibold font-mono"
                    style={{ color: lockedAgent === 'total' ? TOTAL_COLOR : '#64748B' }}
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
                        className="text-label-sm font-mono"
                        style={{ color: isLocked ? color : '#64748B', fontWeight: isLocked ? 600 : 400 }}
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
