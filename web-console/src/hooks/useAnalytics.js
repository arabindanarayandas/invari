import { useState, useEffect } from 'react';
import apiClient from '../api/client';

export const useAnalyticsTimeline = (agentId, days = 30, period = 'daily') => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!agentId) return;

    const fetchTimeline = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getAnalyticsTimeline(agentId, days, period);
        if (response.success) {
          // Transform data for recharts
          const transformed = response.data.map(item => {
            // Format based on period
            if (period === 'hourly') {
              // For hourly data, item has { hour, count }
              const hour = item.hour;
              const period = hour >= 12 ? 'PM' : 'AM';
              const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
              return {
                date: `${displayHour} ${period}`,
                fullDate: `${displayHour}:00 ${period}`,
                requests: item.count,
              };
            } else {
              // For daily data, item has { date, count }
              const itemDate = new Date(item.date);
              return {
                date: itemDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                fullDate: itemDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                requests: item.count,
              };
            }
          });
          setData(transformed);
          setError(null);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [agentId, days, period]);

  return { data, loading, error };
};

export const useAnalyticsStatus = (agentId, days = 30) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!agentId) return;

    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getAnalyticsStatus(agentId, days);
        if (response.success) {
          setData(response.data);
          setError(null);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [agentId, days]);

  return { data, loading, error };
};

export const useAnalyticsHourly = (agentId) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!agentId) return;

    const fetchHourly = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getAnalyticsHourly(agentId);
        if (response.success) {
          setData(response.data);
          setError(null);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHourly();
  }, [agentId]);

  return { data, loading, error };
};
