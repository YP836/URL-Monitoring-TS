import axios from 'axios';
import { URLItem, AddURLPayload } from '../types';

class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': import.meta.env.VITE_API_KEY,
  },
});

export const getUrls = (): Promise<URLItem[]> => {
  throw new NotImplementedError('Will be wired in Phase 2');
};

export const addUrl = (payload: AddURLPayload): Promise<URLItem> => {
  throw new NotImplementedError('Will be wired in Phase 2');
};

export const deleteUrl = (id: number): Promise<void> => {
  throw new NotImplementedError('Will be wired in Phase 2');
};
