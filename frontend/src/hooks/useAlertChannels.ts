import { useState, useEffect, useCallback } from 'react';
import { AlertChannel, AlertChannelPayload, AlertChannelUpdate, AlertDelivery } from '../types';
import {
  getAlertChannels,
  createAlertChannel,
  updateAlertChannel,
  deleteAlertChannel,
  testAlertChannel,
  getAlertDeliveries,
  getApiErrorMessage,
} from '../api/client';

export function useAlertChannels() {
  const [channels, setChannels] = useState<AlertChannel[]>([]);
  const [deliveries, setDeliveries] = useState<AlertDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const [channelData, deliveryData] = await Promise.all([
        getAlertChannels(),
        getAlertDeliveries(),
      ]);
      setChannels(channelData);
      setDeliveries(deliveryData);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load alert channels'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    (async () => {
      try {
        const [channelData, deliveryData] = await Promise.all([
          getAlertChannels(),
          getAlertDeliveries(),
        ]);
        if (mounted) {
          setChannels(channelData);
          setDeliveries(deliveryData);
          setError(null);
        }
      } catch (err) {
        if (mounted) setError(getApiErrorMessage(err, 'Failed to load alert channels'));
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const create = useCallback(async (payload: AlertChannelPayload) => {
    const created = await createAlertChannel(payload);
    setChannels((prev) => [created, ...prev]);
    return created;
  }, []);

  const update = useCallback(async (id: number, payload: AlertChannelUpdate) => {
    const updated = await updateAlertChannel(id, payload);
    setChannels((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const remove = useCallback(async (id: number) => {
    await deleteAlertChannel(id);
    setChannels((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const test = useCallback(async (id: number) => {
    const delivery = await testAlertChannel(id);
    setChannels((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, last_delivery_status: delivery.status, last_delivery_at: delivery.created_at }
          : c,
      ),
    );
    setDeliveries((prev) => [delivery, ...prev]);
    return delivery;
  }, []);

  return { channels, deliveries, isLoading, error, create, update, remove, test, refetch };
}
