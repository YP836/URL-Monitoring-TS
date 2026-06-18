export type URLStatus = 'UP' | 'DOWN' | 'WARN' | 'PENDING';

export type CheckType = 'HTTP' | 'SSL_EXPIRY' | 'TTFB' | 'KEYWORD' | 'DOWNTIME_DURATION' | 'ERROR_RATE';

export interface URLItem {
  id: number;
  web_address: string;
  name: string;
  status: URLStatus;
  created_at: string;
  check_type?: string;
  keyword_to_find?: string | null;
  check_interval_seconds?: number;
  ping_interval_seconds?: number;
}

export interface PingResult {
  url_id: number;
  status: URLStatus;
  latency_ms: number | null;
  status_code?: number | null;
  checked_at: string;
  check_type?: string;
  extra_data?: Record<string, unknown>;
}

export interface AddURLPayload {
  web_address: string;
  name: string;
  check_type?: string;
  keyword_to_find?: string;
  check_interval_seconds?: number;
  ping_interval_seconds?: number;
}

export interface URLDetail extends URLItem {
  recent_pings: PingHistoryRead[];
}

export interface PingHistoryRead {
  id: number;
  url_id: number;
  checked_at: string;
  response_time_ms: number | null;
  status_code: number | null;
  is_up: boolean;
  check_type?: CheckType | null;
  extra_data?: Record<string, unknown> | null;
}

export interface UserRead {
  id: number;
  full_name: string;
  email: string;
  created_at: string;
}
