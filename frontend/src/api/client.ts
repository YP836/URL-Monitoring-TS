import axios, { AxiosRequestConfig } from 'axios';
import { URLItem, AddURLPayload, URLDetail, UserRead, AdminUserOverview, UserUpdate, Incident } from '../types';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': import.meta.env.VITE_API_KEY,
  },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface LoginRequest {
  username: string;
  password: string;
}

interface SignupRequest {
  full_name: string;
  email: string;
  password: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

type ApiValidationItem = {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
};

type ApiErrorPayload = {
  detail?: string | ApiValidationItem[] | Record<string, unknown>;
  message?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeValidationMessage(item: ApiValidationItem): string {
  const field = item.loc?.filter((part) => part !== 'body').join(' ');
  const message = item.msg ?? 'Invalid value';
  return field ? `${field}: ${message}` : message;
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    if (error.code === 'ERR_NETWORK') {
      return 'Cannot reach the backend. Please make sure the API server is running.';
    }

    const status = error.response?.status;
    const detail = error.response?.data?.detail;

    if (typeof detail === 'string') {
      return detail;
    }

    if (Array.isArray(detail)) {
      const messages = detail.map(normalizeValidationMessage).filter(Boolean);
      return messages.length > 0 ? messages.join(' ') : fallback;
    }

    if (isRecord(detail)) {
      const message = detail.message;
      return typeof message === 'string' ? message : fallback;
    }

    const responseMessage = error.response?.data?.message;
    if (typeof responseMessage === 'string') {
      return responseMessage;
    }

    if (status === 401) {
      return 'Your session expired. Please sign in again.';
    }

    if (status === 404) {
      return 'This monitor was not found for the current account.';
    }

    if (status === 422) {
      return 'Please check the form fields and try again.';
    }

    return error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export const apiFetch = async <T = unknown>(path: string, options?: AxiosRequestConfig): Promise<T> => {
  const response = await client(path, options);
  return response.data as T;
};

export const loginUser = async (data: LoginRequest): Promise<TokenResponse> => {
  const params = new URLSearchParams();
  params.append('username', data.username);
  params.append('password', data.password);
  const response = await client.post<TokenResponse>('/api/v1/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return response.data;
};

export const signupUser = async (data: SignupRequest): Promise<UserRead> => {
  const response = await client.post<UserRead>('/api/v1/auth/signup', data);
  return response.data;
};

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

export async function deleteUrl(id: number): Promise<void> {
  await client.delete(`/api/v1/urls/${id}`);
}

export async function getUsers(): Promise<AdminUserOverview[]> {
  const { data } = await client.get<AdminUserOverview[]>('/api/v1/users');
  return data;
}

export async function updateUser(id: number, payload: UserUpdate): Promise<UserRead> {
  const { data } = await client.put<UserRead>(`/api/v1/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: number): Promise<void> {
  await client.delete(`/api/v1/users/${id}`);
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

export const checkUrlNow = async (id: number): Promise<void> => {
  await client.post(`/api/v1/urls/${id}/check`, undefined, { timeout: 60000 });
};

export const getIncidents = async (status: 'open' | 'resolved' | 'all' = 'open'): Promise<Incident[]> => {
  const response = await client.get<Incident[]>('/api/v1/incidents', { params: { status } });
  return response.data;
};

export const acknowledgeIncident = async (id: number): Promise<Incident> => {
  const response = await client.patch<Incident>(`/api/v1/incidents/${id}`, {
    acknowledged_at: new Date().toISOString(),
  });
  return response.data;
};

export const addIncidentNote = async (id: number, note: string): Promise<Incident> => {
  const response = await client.patch<Incident>(`/api/v1/incidents/${id}`, { note });
  return response.data;
};
