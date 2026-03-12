import { useState, useEffect } from 'react';
import apiClient from '../api/client';

export const useAgentStats = (agentId, isPolling = true, pollingInterval = 5000) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!agentId) return;

    let isInitialLoad = true;

    const fetchStats = async () => {
      try {
        // Only show loading on initial load, not on polling updates
        if (isInitialLoad) {
          setLoading(true);
          isInitialLoad = false;
        }

        const response = await apiClient.getAgentStats(agentId);
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

    fetchStats();

    // Set up auto-refresh if polling is enabled
    if (isPolling) {
      const interval = setInterval(fetchStats, pollingInterval);
      return () => clearInterval(interval);
    }
  }, [agentId, isPolling, pollingInterval]);

  return { stats, loading, error };
};

export const useAgentLogs = (agentId, page = 1, limit = 50, filters = {}, sorting = {}, isPolling = false, pollingInterval = 1000) => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!agentId) return;

    let isInitialLoad = true;

    const fetchLogs = async () => {
      try {
        // Only show loading on initial load, not on polling updates
        if (isInitialLoad) {
          setLoading(true);
          isInitialLoad = false;
        }

        const response = await apiClient.getAgentLogs(agentId, page, limit, filters, sorting);
        if (response.success) {
          setLogs(response.data);
          setPagination(response.pagination);
          setError(null);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();

    // Set up polling if enabled
    if (isPolling) {
      const interval = setInterval(fetchLogs, pollingInterval);
      return () => clearInterval(interval);
    }
  }, [agentId, page, limit, JSON.stringify(filters), JSON.stringify(sorting), isPolling, pollingInterval]);

  return { logs, pagination, loading, error };
};
