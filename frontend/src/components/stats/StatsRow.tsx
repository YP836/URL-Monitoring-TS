import { motion, useReducedMotion } from 'framer-motion';
import { CheckType, PingHistoryRead } from '../../types';
import { MetricKey } from './MetricChooser';
import { parseApiDate, timeAgo } from '../../utils/dates';

interface StatsRowProps {
  pings: PingHistoryRead[];
  visibleMetrics?: MetricKey[];
  extraData?: Record<string, unknown> | null;
  uptimeWindow?: string;
}

type MetricTone = 'neutral' | 'good' | 'warning' | 'danger';

interface MetricCard {
  key: MetricKey;
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone: MetricTone;
}

function computeAvgLatency(pings: PingHistoryRead[]): string {
  const upPings = pings.filter((ping) => ping.is_up && ping.response_time_ms !== null);
  if (upPings.length === 0) return '-';

  const sum = upPings.reduce((acc, ping) => acc + (ping.response_time_ms as number), 0);
  return `${Math.round(sum / upPings.length)}ms`;
}

function computeP95Latency(pings: PingHistoryRead[]): string {
  const upPings = pings.filter((ping) => ping.is_up && ping.response_time_ms !== null);
  if (upPings.length === 0) return '-';

  const times = upPings.map((ping) => ping.response_time_ms as number).sort((a, b) => a - b);
  const idx = Math.ceil(0.95 * times.length) - 1;
  return `${times[idx]}ms`;
}

function computeUptime(pings: PingHistoryRead[], window: string): string {
  if (pings.length === 0) return '-';

  let msAgo = 30 * 24 * 60 * 60 * 1000; // default 30d
  if (window === '24h') msAgo = 24 * 60 * 60 * 1000;
  if (window === '7d') msAgo = 7 * 24 * 60 * 60 * 1000;
  if (window === '90d') msAgo = 90 * 24 * 60 * 60 * 1000;

  const cutoff = new Date(Date.now() - msAgo);
  const recentPings = pings.filter((ping) => parseApiDate(ping.checked_at) >= cutoff);
  if (recentPings.length === 0) return '-';

  const upCount = recentPings.filter((ping) => ping.is_up).length;
  const pct = (upCount / recentPings.length) * 100;
  return `${pct.toFixed(1)}%`;
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

function metricToneFor(value: number | null, goodWhen: (number: number) => boolean, warningWhen: (number: number) => boolean): MetricTone {
  if (value === null) return 'neutral';
  if (goodWhen(value)) return 'good';
  if (warningWhen(value)) return 'warning';
  return 'danger';
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
  uptimeWindow = '30d',
}: StatsRowProps) {
  const shouldReduceMotion = useReducedMotion();
  const avgLatency = computeAvgLatency(pings);
  const p95Latency = computeP95Latency(pings);
  const uptimeVal = computeUptime(pings, uptimeWindow);
  const sortedPings = [...pings].sort((a, b) => parseApiDate(b.checked_at).getTime() - parseApiDate(a.checked_at).getTime());
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

  const uptimeNumber = uptimeVal === '-' ? null : Number.parseFloat(uptimeVal);
  const cards: MetricCard[] = [
    { key: 'avgLatency', label: 'Average latency', value: avgLatency, detail: 'Successful checks', icon: 'ti-bolt', tone: 'neutral' },
    { key: 'p95Latency', label: 'P95 latency', value: p95Latency, detail: 'Slowest 5% of checks', icon: 'ti-chart-line', tone: 'neutral' },
    {
      key: 'uptime',
      label: `Uptime (${uptimeWindow})`,
      value: uptimeVal,
      detail: 'Availability from HTTP checks',
      icon: 'ti-activity-heartbeat',
      tone: metricToneFor(uptimeNumber, (value) => value >= 99.9, (value) => value >= 99),
    },
    { key: 'lastChecked', label: 'Last checked', value: lastChecked, detail: 'Latest recorded result', icon: 'ti-clock-check', tone: 'neutral' },
    {
      key: 'sslExpiry',
      label: 'SSL certificate',
      value: sslDaysRemaining === null ? 'Waiting for check' : `${sslDaysRemaining} days`,
      detail: 'Remaining until expiry',
      icon: 'ti-shield-check',
      tone: metricToneFor(sslDaysRemaining, (value) => value > 30, (value) => value >= 7),
    },
    {
      key: 'ttfb',
      label: 'Time to first byte',
      value: ttfbMs === null ? 'Waiting for check' : `${ttfbMs}ms`,
      detail: 'Initial server response',
      icon: 'ti-timeline-event',
      tone: metricToneFor(ttfbMs, (value) => value < 200, (value) => value < 800),
    },
    {
      key: 'keyword',
      label: 'Keyword check',
      value: keywordFound === null ? 'Waiting for check' : `${keyword ?? 'Keyword'} ${keywordFound ? 'found' : 'not found'}`,
      detail: 'Latest page content scan',
      icon: 'ti-search',
      tone: keywordFound === null ? 'neutral' : keywordFound ? 'good' : 'danger',
    },
    {
      key: 'downtimeDuration',
      label: 'Downtime (30d)',
      value: downtimeMinutes30d === null ? 'Waiting for check' : `${downtimeMinutes30d} min`,
      detail: 'Derived from HTTP availability',
      icon: 'ti-hourglass-low',
      tone: metricToneFor(downtimeMinutes30d, (value) => value === 0, (value) => value < 60),
    },
    {
      key: 'errorRate',
      label: 'Error rate',
      value: errorRatePct === null ? 'Waiting for check' : `${errorRatePct.toFixed(1)}%`,
      detail: 'Last 100 HTTP checks',
      icon: 'ti-alert-triangle',
      tone: metricToneFor(errorRatePct, (value) => value < 1, (value) => value < 10),
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
      className="monitor-metrics-grid"
      initial={shouldReduceMotion ? false : 'hidden'}
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
          className={`monitor-metric-card tone-${card.tone}`}
          key={card.key}
          variants={{
            hidden: { opacity: 0, y: 18, scale: 0.985 },
            visible: { opacity: 1, y: 0, scale: 1 },
          }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          whileHover={shouldReduceMotion ? undefined : { y: -2 }}
        >
          <div className="monitor-metric-topline">
            <span>{card.label}</span>
            <i className={`ti ${card.icon}`} aria-hidden="true" />
          </div>
          <strong>{card.value}</strong>
          <small>{card.detail}</small>
        </motion.div>
      ))}
    </motion.div>
  );
}
