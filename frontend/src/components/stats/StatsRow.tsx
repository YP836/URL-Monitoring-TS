import { PingHistoryRead } from '../../types';

interface StatsRowProps {
  pings: PingHistoryRead[];
}

function computeAvgLatency(pings: PingHistoryRead[]): string {
  const upPings = pings.filter(p => p.is_up && p.response_time_ms !== null);
  if (upPings.length === 0) return '—';
  
  const sum = upPings.reduce((acc, p) => acc + (p.response_time_ms as number), 0);
  return `${Math.round(sum / upPings.length)}ms`;
}

function computeP95Latency(pings: PingHistoryRead[]): string {
  const upPings = pings.filter(p => p.is_up && p.response_time_ms !== null);
  if (upPings.length < 5) return '—';

  const times = upPings.map(p => p.response_time_ms as number).sort((a, b) => a - b);
  const idx = Math.ceil(0.95 * times.length) - 1;
  return `${times[idx]}ms`;
}

function computeUptime30d(pings: PingHistoryRead[]): string {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentPings = pings.filter(p => new Date(p.checked_at) >= thirtyDaysAgo);
  if (recentPings.length === 0) return '—';

  const upCount = recentPings.filter(p => p.is_up).length;
  const pct = (upCount / recentPings.length) * 100;
  return `${pct.toFixed(1)}%`;
}

function timeAgo(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function StatsRow({ pings }: StatsRowProps) {
  const avgLatency = computeAvgLatency(pings);
  const p95Latency = computeP95Latency(pings);
  const uptime30d = computeUptime30d(pings);
  
  const sortedPings = [...pings].sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime());
  const lastChecked = sortedPings.length > 0 ? timeAgo(sortedPings[0].checked_at) : 'Never';

  const cardStyle = {
    backgroundColor: '#f8f8f6',
    borderRadius: 8,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4
  };

  const labelStyle = {
    fontSize: 12,
    color: '#666'
  };

  const valueStyle = {
    fontSize: 20,
    fontWeight: 500,
    color: '#111'
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: 16,
      marginBottom: 32
    }}>
      <div style={cardStyle}>
        <div style={labelStyle}>Avg latency</div>
        <div style={valueStyle}>{avgLatency}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>P95 latency</div>
        <div style={valueStyle}>{p95Latency}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Uptime (30d)</div>
        <div style={valueStyle}>{uptime30d}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Last checked</div>
        <div style={valueStyle}>{lastChecked}</div>
      </div>
    </div>
  );
}
