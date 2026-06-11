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
  checked_at: string;
}

export interface AddURLPayload {
  web_address: string;
  name: string;
}
