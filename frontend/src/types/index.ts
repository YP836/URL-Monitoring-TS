export type URLStatus = 'UP' | 'DOWN' | 'WARN' | 'PENDING';

export type CheckType = 'HTTP' | 'SSL_EXPIRY' | 'TTFB' | 'KEYWORD' | 'DOWNTIME_DURATION' | 'ERROR_RATE';

export interface URLItem {
  id: number;
  web_address: string;
  name: string;
  status: 'PENDING' | 'UP' | 'DOWN' | 'WARN';
  created_at: string;
  check_type?: CheckType | null;
  keyword_to_find?: string | null;
  check_interval_seconds: number;
  ping_interval_seconds: number;
  owner_email?: string | null;
  is_public: boolean;
}

export interface AdminUserOverview extends UserRead {
  url_count: number;
}

export interface UserUpdate {
  full_name?: string;
  email?: string;
  role?: string;
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

export interface Incident {
  id: number;
  url_id: number;
  url_name: string;
  url_address: string;
  started_at: string;
  resolved_at: string | null;
  check_type: string;
  severity: 'DOWN' | 'WARN';
  acknowledged_at: string | null;
  note: string | null;
  duration_minutes: number | null;
}

export interface UserRead {
  id: number;
  full_name: string;
  email: string;
  role: 'admin' | 'viewer';
  created_at: string;
}

export interface Incident {
  id: number;
  url_id: number;
  url_name: string;
  url_address: string;
  started_at: string;
  resolved_at: string | null;
  check_type: string;
  severity: 'DOWN' | 'WARN';
  acknowledged_at: string | null;
  note: string | null;
  duration_minutes: number | null;
}

export interface MaintenanceWindow {
  id: number;
  url_id: number;
  title: string;
  message?: string | null;
  starts_at: string;
  ends_at: string;
}

export interface PublicMonitor {
  id: number;
  name: string;
  status: URLStatus;
  uptime_90d: number;
  last_checked_at: string | null;
  open_incident: Incident | null;
}

export interface PublicStatus {
  monitors: PublicMonitor[];
  maintenance_windows: MaintenanceWindow[];
}
