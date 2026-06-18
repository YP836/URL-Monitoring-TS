import { useState, useEffect } from 'react';
import { URLItem, AddURLPayload } from '../types';
import { getApiErrorMessage, getUrls as apiGetUrls, addUrl as apiAddUrl, deleteUrl as apiDeleteUrl } from '../api/client';

export function useUrls() {
  const [urls, setUrls] = useState<URLItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUrls = async (): Promise<void> => {
    setError(null);
    setIsLoading(true);
    try {
      const data = await apiGetUrls();
      setUrls(data);
    } catch (err) {
      const message = getApiErrorMessage(err, 'Failed to load monitors');
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadUrls = async () => {
      setError(null);
      setIsLoading(true);
      try {
        const data = await apiGetUrls();
        if (mounted) {
          setUrls(data);
        }
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err, 'Failed to load monitors'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadUrls();
    return () => {
      mounted = false;
    };
  }, []);

  const addUrl = async (payload: AddURLPayload): Promise<void> => {
    setIsLoading(true);
    try {
      const newUrl = await apiAddUrl(payload);
      setUrls((prev) => [...prev, newUrl]);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to add monitor'));
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUrl = async (id: number): Promise<void> => {
    try {
      await apiDeleteUrl(id);
      setUrls((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete monitor'));
    }
  };

  const editUrl = (updatedUrl: URLItem) => {
    setUrls((prev) => prev.map((u) => (u.id === updatedUrl.id ? updatedUrl : u)));
  };

  const retryFetch = () => {
    fetchUrls();
  };

  const clearError = () => setError(null);

  return { urls, isLoading, error, addUrl, deleteUrl, editUrl, retryFetch, clearError };
}
