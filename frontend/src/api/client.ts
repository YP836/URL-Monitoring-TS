import axios from 'axios';
import { URLItem, AddURLPayload, URLDetail } from '../types';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': import.meta.env.VITE_API_KEY,
  },
});

export const getUrls = async (): Promise<URLItem[]> => {
  const response = await client.get<URLItem[]>('/api/v1/urls');
  return response.data;
};

export const addUrl = async (payload: AddURLPayload): Promise<URLItem> => {
  try {
    const response = await client.post<URLItem>('/api/v1/urls', {
      web_address: payload.web_address,
      name: payload.name,
      check_type: payload.check_type ?? 'HTTP',
      keyword_to_find: payload.keyword_to_find,
      check_interval_seconds: payload.check_interval_seconds ?? 30,
      ping_interval_seconds: payload.ping_interval_seconds ?? payload.check_interval_seconds ?? 30,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      throw new Error('This URL is already being monitored');
    }
    throw error;
  }
};

export const deleteUrl = async (id: number): Promise<void> => {
  await client.delete(`/api/v1/urls/${id}`);
};

export const updateUrl = async (id: number, payload: { name?: string; web_address?: string; ping_interval_seconds?: number }): Promise<URLItem> => {
  const response = await client.put<URLItem>(`/api/v1/urls/${id}`, payload);
  return response.data;
};

export const getUrlDetail = async (id: number): Promise<URLDetail> => {
  const response = await client.get<URLDetail>(`/api/v1/urls/${id}`);
  return response.data;
};

export const getUrlExtraData = async (
  id: number,
): Promise<{
  check_type: string;
  extra_data: Record<string, unknown>;
  checked_at: string;
}> => {
  const response = await client.get<{
    check_type: string;
    extra_data: Record<string, unknown>;
    checked_at: string;
  }>(`/api/v1/urls/${id}/extra`);
  return response.data;
};

export const checkUrlNow = async (_id: number): Promise<void> => {
  throw new Error('Not implemented - coming in Phase 6');
};
