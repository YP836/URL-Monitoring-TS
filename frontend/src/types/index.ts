export interface URLItem {
  id: number;
  web_address: string;
  name: string;
  status: 'UP' | 'DOWN' | 'PENDING';
  created_at: string;
}

export interface PingResult {
  url_id: number;
  status: 'UP' | 'DOWN';
  latency_ms: number | null;
  status_code?: number | null;
  checked_at: string;
}

export interface AddURLPayload {
  web_address: string;
  name: string;
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
}
