import { useState, useEffect, useCallback } from 'react';
import { Incident } from '../types';
import { getIncidents, acknowledgeIncident as apiAcknowledge } from '../api/client';

const POLL_INTERVAL_MS = 30_000;

export function useIncidents(statusFilter: 'open' | 'resolved' | 'all' = 'open') {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = useCallback(async () => {
    try {
      const data = await getIncidents(statusFilter);
      setIncidents(data);
      setError(null);
    } catch {
      setError('Failed to load incidents');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    const load = async () => {
      try {
        const data = await getIncidents(statusFilter);
        if (mounted) {
          setIncidents(data);
          setError(null);
        }
      } catch {
        if (mounted) setError('Failed to load incidents');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    const timer = setInterval(fetchIncidents, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [statusFilter, fetchIncidents]);

  const acknowledgeIncident = useCallback(async (id: number) => {
    const updated = await apiAcknowledge(id);
    setIncidents((prev) => prev.map((inc) => (inc.id === id ? updated : inc)));
  }, []);

  return { incidents, isLoading, error, acknowledgeIncident, refetch: fetchIncidents };
}
