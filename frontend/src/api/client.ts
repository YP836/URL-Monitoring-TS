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
    const response = await client.post<URLItem>('/api/v1/urls', payload);
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

export const getUrlDetail = async (id: number): Promise<URLDetail> => {
  const response = await client.get<URLDetail>(`/api/v1/urls/${id}`);
  return response.data;
};

export const checkUrlNow = async (_id: number): Promise<void> => {
  throw new Error('Not implemented - coming in Phase 6');
};
