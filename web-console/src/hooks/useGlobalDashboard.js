import { useState, useEffect, useRef } from 'react';
import apiClient from '../api/client';

/**
 * Fetch aggregated stats across all agents for the current user.
 * Polls every `pollingInterval` ms when `isPolling` is true.
 */
export const useGlobalDashboardStats = (isPolling = false, pollingInterval = 5000) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchStats = async () => {
    try {
      const response = await apiClient.getGlobalDashboardStats();
      if (response.success) {
        setStats(response.data);
        setError(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    if (isPolling) {
      intervalRef.current = setInterval(fetchStats, pollingInterval);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPolling, pollingInterval]);

  return { stats, loading, error };
};

/**
 * Fetch aggregated timeline across all agents for the current user.
 * Returns transformed timeline data + agents list (id, name) for rendering per-agent lines.
 * Re-fetches when `period` changes.
 */
export const useGlobalDashboardTimeline = (period = 'hourly') => {
  const [data, setData] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        const days = period === 'hourly' ? 1 : 30;
        const response = await apiClient.getGlobalDashboardTimeline(period, days);

        if (response.success) {
          const { agents: agentList, timeline } = response.data;

          const transformed = timeline.map(item => {
            if (period === 'hourly') {
              const hour = item.hour;
              const ampm = hour >= 12 ? 'PM' : 'AM';
              const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
              return {
                ...item,
                date: `${displayHour} ${ampm}`,
                fullDate: `${displayHour}:00 ${ampm}`,
              };
            } else {
              const itemDate = new Date(item.date);
              return {
                ...item,
                date: itemDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                fullDate: itemDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
              };
            }
          });

          setData(transformed);
          setAgents(agentList || []);
          setError(null);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [period]);

  return { data, agents, loading, error };
};
