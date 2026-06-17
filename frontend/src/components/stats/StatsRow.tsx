import { motion } from 'framer-motion';
import { CheckType, PingHistoryRead } from '../../types';
import { MetricKey } from './MetricChooser';

interface StatsRowProps {
  pings: PingHistoryRead[];
  visibleMetrics?: MetricKey[];
  extraData?: Record<string, unknown> | null;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function getExtraDataForCheck(checkType: CheckType, extraData: Record<string, unknown> | null) {
  if (!extraData) return null;
  const nestedExtraData = extraData[checkType];
  return isRecord(nestedExtraData) ? nestedExtraData : extraData;
}

export function StatsRow({
  pings,
  visibleMetrics = ['avgLatency', 'p95Latency', 'uptime', 'lastChecked'],
  extraData = null,
}: StatsRowProps) {
  const avgLatency = computeAvgLatency(pings);
  const p95Latency = computeP95Latency(pings);
  const uptime30d = computeUptime30d(pings);
  const sortedPings = [...pings].sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime());
  const lastChecked = sortedPings.length > 0 ? timeAgo(sortedPings[0].checked_at) : 'Never';
  const sslData = getExtraDataForCheck('SSL_EXPIRY', extraData);
  const ttfbData = getExtraDataForCheck('TTFB', extraData);
  const keywordData = getExtraDataForCheck('KEYWORD', extraData);
  const downtimeData = getExtraDataForCheck('DOWNTIME_DURATION', extraData);
  const errorRateData = getExtraDataForCheck('ERROR_RATE', extraData);
  const sslDaysRemaining = sslData ? getNumber(sslData.days_remaining) : null;
  const ttfbMs = ttfbData ? getNumber(ttfbData.ttfb_ms) : null;
  const keywordFound = keywordData ? getBoolean(keywordData.keyword_found) : null;
  const keyword = keywordData ? getString(keywordData.keyword) : null;
  const downtimeMinutes30d = downtimeData ? getNumber(downtimeData.downtime_minutes_30d) : null;
  const errorRatePct = errorRateData ? getNumber(errorRateData.error_rate_pct) : null;

  const cardStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
  };

  const labelStyle = {
    fontSize: 12,
    color: '#6B7280',
  };

  const valueStyle = {
    fontSize: 20,
    fontWeight: 500,
    color: '#111827',
  };

  const cards: Array<{ key: MetricKey; label: string; value: string }> = [
    { key: 'avgLatency', label: 'Avg latency', value: avgLatency },
    { key: 'p95Latency', label: 'P95 latency', value: p95Latency },
    { key: 'uptime', label: 'Uptime (30d)', value: uptime30d },
    { key: 'lastChecked', label: 'Last checked', value: lastChecked },
    {
      key: 'sslExpiry',
      label: 'SSL expiry',
      value: sslDaysRemaining === null ? 'Waiting for check' : `${sslDaysRemaining} days`,
    },
    {
      key: 'ttfb',
      label: 'TTFB',
      value: ttfbMs === null ? 'Waiting for check' : `${ttfbMs}ms`,
    },
    {
      key: 'keyword',
      label: 'Keyword',
      value: keywordFound === null ? 'Waiting for check' : `${keyword ?? 'Keyword'} ${keywordFound ? 'found' : 'not found'}`,
    },
    {
      key: 'downtimeDuration',
      label: 'Downtime (30d)',
      value: downtimeMinutes30d === null ? 'Waiting for check' : `${downtimeMinutes30d} min`,
    },
    {
      key: 'errorRate',
      label: 'Error rate',
      value: errorRatePct === null ? 'Waiting for check' : `${errorRatePct.toFixed(1)}%`,
    },
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
    <motion.div
      className="stats-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.055,
          },
        },
      }}
    >
      {visibleCards.map((card) => (
        <motion.div
          style={cardStyle}
          key={card.key}
          variants={{
            hidden: { opacity: 0, y: 18, scale: 0.985 },
            visible: { opacity: 1, y: 0, scale: 1 },
          }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -3, boxShadow: '0 14px 36px rgba(245, 101, 101, 0.1)' }}
        >
          <div style={labelStyle}>{card.label}</div>
          <div style={valueStyle}>{card.value}</div>
        </motion.div>
      ))}
    </motion.div>
  );
}
