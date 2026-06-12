import { PingHistoryRead } from '../../types';
import { MetricKey } from './MetricChooser';

interface StatsRowProps {
  pings: PingHistoryRead[];
  visibleMetrics?: MetricKey[];
}

function computeAvgLatency(pings: PingHistoryRead[]): string {
  const upPings = pings.filter((ping) => ping.is_up && ping.response_time_ms !== null);
  if (upPings.length === 0) return '-';

  const sum = upPings.reduce((acc, ping) => acc + (ping.response_time_ms as number), 0);
  return `${Math.round(sum / upPings.length)}ms`;
}

function computeP95Latency(pings: PingHistoryRead[]): string {
  const upPings = pings.filter((ping) => ping.is_up && ping.response_time_ms !== null);
  if (upPings.length < 5) return '-';

  const times = upPings.map((ping) => ping.response_time_ms as number).sort((a, b) => a - b);
  const idx = Math.ceil(0.95 * times.length) - 1;
  return `${times[idx]}ms`;
}

function computeUptime30d(pings: PingHistoryRead[]): string {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentPings = pings.filter((ping) => new Date(ping.checked_at) >= thirtyDaysAgo);
  if (recentPings.length === 0) return '-';

  const upCount = recentPings.filter((ping) => ping.is_up).length;
  const pct = (upCount / recentPings.length) * 100;
  return `${pct.toFixed(1)}%`;
}

function timeAgo(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function StatsRow({
  pings,
  visibleMetrics = ['avgLatency', 'p95Latency', 'uptime', 'lastChecked'],
}: StatsRowProps) {
  const avgLatency = computeAvgLatency(pings);
  const p95Latency = computeP95Latency(pings);
  const uptime30d = computeUptime30d(pings);
  const sortedPings = [...pings].sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime());
  const lastChecked = sortedPings.length > 0 ? timeAgo(sortedPings[0].checked_at) : 'Never';

  const cardStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.055)',
    border: '1px solid rgba(198, 161, 91, 0.2)',
    borderRadius: 8,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    boxShadow: '0 18px 50px rgba(0, 0, 0, 0.2)',
  };

  const labelStyle = {
    fontSize: 12,
    color: '#A9A195',
  };

  const valueStyle = {
    fontSize: 20,
    fontWeight: 500,
    color: '#F7F0E4',
  };

  const cards: Array<{ key: MetricKey; label: string; value: string }> = [
    { key: 'avgLatency', label: 'Avg latency', value: avgLatency },
    { key: 'p95Latency', label: 'P95 latency', value: p95Latency },
    { key: 'uptime', label: 'Uptime (30d)', value: uptime30d },
    { key: 'lastChecked', label: 'Last checked', value: lastChecked },
  ];

  const visibleCards = cards.filter((card) => visibleMetrics.includes(card.key));

  if (visibleCards.length === 0) {
    return (
      <div className="state-card" style={{ marginBottom: 32 }}>
        Select at least one signal to show the output.
      </div>
    );
  }

  return (
    <div
      className="stats-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}
    >
      {visibleCards.map((card) => (
        <div style={cardStyle} key={card.key}>
          <div style={labelStyle}>{card.label}</div>
          <div style={valueStyle}>{card.value}</div>
        </div>
      ))}
    </div>
  );
}
