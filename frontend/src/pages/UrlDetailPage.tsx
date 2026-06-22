import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Download, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import { checkUrlNow, getApiErrorMessage, getUrlDetail, getUrlExtraData } from '../api/client';
import modalStyles from '../components/urls/UrlCard.module.css';
import { CheckType, PingHistoryRead, URLDetail } from '../types';
import { PageLayout } from '../components/layout/PageLayout';
import { Toast } from '../components/ui/Toast';
import { StatusDot } from '../components/ui/StatusDot';
import { ChartSkeleton, Skeleton, StatCardSkeleton } from '../components/ui/Skeleton';
import { MetricKey } from '../components/stats/MetricChooser';
import { StatsRow } from '../components/stats/StatsRow';
import { UptimeBar } from '../components/charts/UptimeBar';
import { LatencyChart } from '../components/charts/LatencyChart';
import { Favicon } from './Dashboard';
import { MonitorReportModal } from '../components/reports/MonitorReportModal';
import { buildWsUrl, useWebSocket } from '../hooks/useWebSocket';
import { parseApiDate, timeAgo } from '../utils/dates';

function splitCheckTypes(checkType: string | null | undefined): CheckType[] {
  const knownChecks: CheckType[] = ['HTTP', 'SSL_EXPIRY', 'TTFB', 'KEYWORD', 'DOWNTIME_DURATION', 'ERROR_RATE'];
  const checks = (checkType ?? 'HTTP')
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is CheckType => knownChecks.includes(item as CheckType));
  return checks.length > 0 ? checks : ['HTTP'];
}

function metricsForCheckType(checkType: string | null | undefined): MetricKey[] {
  const selectedChecks = splitCheckTypes(checkType);
  const metrics: MetricKey[] = [];

  if (selectedChecks.includes('HTTP')) metrics.push('avgLatency', 'p95Latency', 'uptime');
  if (selectedChecks.includes('SSL_EXPIRY')) metrics.push('sslExpiry');
  if (selectedChecks.includes('TTFB')) metrics.push('ttfb');
  if (selectedChecks.includes('KEYWORD')) metrics.push('keyword');
  if (selectedChecks.includes('DOWNTIME_DURATION')) metrics.push('downtimeDuration');
  if (selectedChecks.includes('ERROR_RATE')) metrics.push('errorRate');

  return [...metrics, 'lastChecked'];
}

const statusMeta: Record<string, { label: string; className: string; summary: string }> = {
  UP: { label: 'Operational', className: 'is-up', summary: 'All primary checks are reporting normally.' },
  WARN: { label: 'Degraded', className: 'is-warn', summary: 'A signal needs attention, but the monitor is still responding.' },
  DOWN: { label: 'Incident', className: 'is-down', summary: 'The latest HTTP availability check did not succeed.' },
  PENDING: { label: 'Waiting for data', className: 'is-pending', summary: 'The monitor is awaiting its first completed check.' },
};

const checkLabels: Record<CheckType, string> = {
  HTTP: 'HTTP availability',
  SSL_EXPIRY: 'SSL certificate',
  TTFB: 'Time to first byte',
  KEYWORD: 'Keyword scan',
  DOWNTIME_DURATION: 'Downtime analysis',
  ERROR_RATE: 'Error rate',
};

function formatInterval(seconds?: number): string {
  if (!seconds || seconds < 60) return `${seconds ?? 30}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

function formatCheckType(checkType?: CheckType | null): string {
  return checkType ? checkLabels[checkType] : 'HTTP availability';
}

const latencyWindowOptions = [
  { value: '1h', label: '1 hour', hours: 1 },
  { value: '3h', label: '3 hours', hours: 3 },
  { value: '6h', label: '6 hours', hours: 6 },
  { value: '12h', label: '12 hours', hours: 12 },
  { value: '24h', label: '24 hours', hours: 24 },
] as const;

type LatencyWindow = (typeof latencyWindowOptions)[number]['value'];

function filterPingsByLatencyWindow(pings: PingHistoryRead[], latencyWindow: LatencyWindow): PingHistoryRead[] {
  const option = latencyWindowOptions.find((item) => item.value === latencyWindow) ?? latencyWindowOptions[0];
  const cutoff = Date.now() - option.hours * 60 * 60 * 1000;
  return pings.filter((ping) => parseApiDate(ping.checked_at).getTime() >= cutoff);
}

export function UrlDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const urlId = Number(id);
  const hasValidUrlId = Number.isInteger(urlId) && urlId > 0;
  const [url, setUrl] = useState<URLDetail | null>(null);
  const [livePings, setLivePings] = useState<PingHistoryRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [extraData, setExtraData] = useState<Record<string, unknown> | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [uptimeWindow, setUptimeWindow] = useState('30d');
  const [latencyWindow, setLatencyWindow] = useState<LatencyWindow>('1h');
  const shouldReduceMotion = useReducedMotion();
  const { lastMessage, isConnected, connectionError } = useWebSocket(buildWsUrl(import.meta.env.VITE_API_BASE_URL));

  useEffect(() => {
    if (!hasValidUrlId) {
      setUrl(null);
      setLivePings([]);
      setExtraData(null);
      setError('This monitor link is invalid.');
      setIsLoading(false);
      return;
    }

    let mounted = true;
    setIsLoading(true);
    getUrlDetail(urlId)
      .then(data => {
        if (!mounted) return;
        setUrl(data);
        setLivePings(data.recent_pings);
        setError(null);
        document.title = `${data.name} - Uptime Monitor`;
      })
      .catch(err => mounted && setError(getApiErrorMessage(err, 'Failed to load URL details')))
      .finally(() => mounted && setIsLoading(false));
    return () => { mounted = false; };
  }, [hasValidUrlId, urlId]);

  useEffect(() => {
    if (!hasValidUrlId) return;
    let mounted = true;

    getUrlExtraData(urlId)
      .then((data) => {
        if (mounted) setExtraData(data.extra_data);
      })
      .catch(() => {
        if (mounted) setExtraData(null);
      });

    return () => {
      mounted = false;
    };
  }, [hasValidUrlId, urlId]);

  useEffect(() => {
    if (!lastMessage || lastMessage.url_id !== urlId) return;
    const nextPing: PingHistoryRead = {
      id: Date.now(),
      url_id: lastMessage.url_id,
      checked_at: lastMessage.checked_at,
      response_time_ms: lastMessage.latency_ms,
      status_code: lastMessage.status_code ?? null,
      is_up: lastMessage.status === 'UP',
    };
    setLivePings(previous => [nextPing, ...previous].slice(0, 3000));
    if (lastMessage.extra_data && lastMessage.check_type) {
      setExtraData((previous) => ({
        ...(previous ?? {}),
        [lastMessage.check_type as string]: lastMessage.extra_data as Record<string, unknown>,
      }));
    }
  }, [urlId, lastMessage]);
  const currentStatus =
    lastMessage?.url_id === urlId
      ? lastMessage.status
      : url?.status ?? (livePings[0]?.is_up === false ? 'DOWN' : 'PENDING');
  const showNotFound = !isLoading && !!error && error.toLowerCase().includes('not found');
  const visibleMetrics = metricsForCheckType(url?.check_type);
  const selectedChecks = splitCheckTypes(url?.check_type);
  const showLatencyChart = selectedChecks.includes('HTTP');
  const showUptimeChart = selectedChecks.includes('HTTP');
  const latencyChartPings = filterPingsByLatencyWindow(livePings, latencyWindow);
  const selectedLatencyWindowLabel =
    latencyWindowOptions.find((option) => option.value === latencyWindow)?.label ?? '1 hour';
  const status = statusMeta[currentStatus] ?? statusMeta.PENDING;
  const latestCheckedAt = lastMessage?.url_id === urlId
    ? lastMessage.checked_at
    : livePings[0]?.checked_at ?? url?.created_at;
  const handleCheckNow = async () => {
    if (!hasValidUrlId) return;
    setIsChecking(true);
    try {
      await checkUrlNow(urlId);
      const data = await getUrlDetail(urlId);
      setUrl(data);
      setLivePings(data.recent_pings);
      try {
        const latestExtra = await getUrlExtraData(urlId);
        setExtraData(latestExtra.extra_data);
      } catch {
        // A plain HTTP-only monitor may not have signal-specific extra data yet.
        setExtraData(data.recent_pings[0]?.extra_data ?? null);
      }
      setToast('Check complete');
    } catch (err) {
      setToast(getApiErrorMessage(err, 'Failed to run check'));
    } finally {
      setIsChecking(false);
    }
  };
  return (
    <PageLayout isConnected={isConnected} connectionError={connectionError}>
      <div className="monitor-detail-page">
      <button className="link-button detail-back-button" type="button" onClick={() => navigate('/monitors')}>
        <i className="ti ti-arrow-left" aria-hidden="true" />
        All monitors
      </button>
      {isLoading && <DetailSkeleton />}
      {showNotFound && (
        <CenteredMessage
          title="Monitor not available"
          detail="This monitor is not in your current workspace. Choose an existing monitor or create a new one."
          actions={
            <>
              <Link className="primary-link-button" to="/monitors">View monitors</Link>
              <Link className="secondary-link-button" to="/dashboard">Go home</Link>
            </>
          }
        />
      )}
      {!isLoading && error && !showNotFound && <CenteredMessage title="Failed to load URL details" detail={error} />}
      {!isLoading && url && (
        <>
          <motion.header
            className="monitor-command-header"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="monitor-command-main">
              <div className={`monitor-status-emblem ${status.className}`}>
                <StatusDot status={currentStatus} />
              </div>
              <div className="monitor-title-stack">
                <div className="monitor-status-line">
                  <span className={`monitor-status-badge ${status.className}`}>{status.label}</span>
                  <span>Check cadence {formatInterval(url.ping_interval_seconds ?? url.check_interval_seconds)}</span>
                </div>
                <h1>
                  <Favicon url={url.web_address} size={26} />
                  {url.name}
                </h1>
                <a href={url.web_address} target="_blank" rel="noopener noreferrer">
                  <span>{url.web_address}</span>
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              </div>
            </div>
            <div className="detail-actions">
              <button className="outline-button action-button" type="button" onClick={handleCheckNow} disabled={isChecking} aria-busy={isChecking}>
                <RefreshCw className={isChecking ? 'spin-icon' : undefined} size={15} aria-hidden="true" />
                {isChecking ? 'Checking' : 'Run check'}
              </button>
              <button className="primary save-report-button" type="button" onClick={() => setIsReportOpen(true)}>
                <Download size={15} aria-hidden="true" />
                Export report
              </button>
              <button
                className="icon-only-button danger-action"
                type="button" 
                onClick={() => setIsConfirmingDelete(true)}
                title="Delete monitor"
                aria-label="Delete monitor"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          </motion.header>

          <section className={`monitor-live-summary ${status.className}`} aria-label="Current monitor status">
            <div>
              <span className="monitor-summary-label">Current signal</span>
              <strong>{status.summary}</strong>
            </div>
            <div className="monitor-summary-meta">
              <span><i className="ti ti-clock" aria-hidden="true" /> {latestCheckedAt ? `Checked ${timeAgo(latestCheckedAt)}` : 'No completed check'}</span>
              <span><i className="ti ti-list-check" aria-hidden="true" /> {livePings.length} recorded checks</span>
            </div>
          </section>

          <section className="monitor-signals-section" aria-labelledby="monitor-signals-title">
            <div className="detail-section-heading compact">
              <div>
                <p>Signal coverage</p>
                <h2 id="monitor-signals-title">Live monitor metrics</h2>
              </div>
              <div className="monitor-check-chips" aria-label="Enabled monitor checks">
                {selectedChecks.map((check) => <span key={check}>{checkLabels[check]}</span>)}
              </div>
            </div>
            <StatsRow pings={livePings} visibleMetrics={visibleMetrics} extraData={extraData} uptimeWindow={uptimeWindow} />
          </section>

          <div className="monitor-chart-grid">
          {showUptimeChart && (
            <Section 
              eyebrow="Availability history"
              title={`Uptime over the last ${uptimeWindow === '24h' ? '24 hours' : uptimeWindow === '7d' ? '7 days' : uptimeWindow === '30d' ? '30 days' : '90 days'}`}
              description="Availability is calculated from recorded HTTP checks in the selected time window."
              action={
                <select 
                  aria-label="Uptime history window"
                  value={uptimeWindow}
                  onChange={(e) => setUptimeWindow(e.target.value)}
                  className="monitor-window-select"
                >
                  <option value="24h">24 hours</option>
                  <option value="7d">7 days</option>
                  <option value="30d">30 days</option>
                  <option value="90d">90 days</option>
                </select>
              }
            >
              <UptimeBar pings={livePings} uptimeWindow={uptimeWindow} />
            </Section>
          )}
          {showLatencyChart && (
            <Section
              eyebrow="Performance trend"
              title={`Response time - last ${selectedLatencyWindowLabel}`}
              description="Failed checks are marked on the time series. Times are shown in your local clock."
              action={
                <select
                  aria-label="Latency chart window"
                  value={latencyWindow}
                  onChange={(e) => setLatencyWindow(e.target.value as LatencyWindow)}
                  className="monitor-window-select"
                >
                  {latencyWindowOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              }
            >
              <LatencyChart pings={latencyChartPings} />
            </Section>
          )}
          </div>
          <RecentChecks pings={livePings} />
          <AnimatePresence>
            {isReportOpen && (
              <MonitorReportModal
                url={url}
                pings={livePings}
                currentStatus={currentStatus}
                extraData={extraData}
                showUptimeChart={showUptimeChart}
                showLatencyChart={showLatencyChart}
                onClose={() => setIsReportOpen(false)}
              />
            )}
          </AnimatePresence>
        </>
      )}
      </div>
      {createPortal(
        <AnimatePresence>
          {isConfirmingDelete && url && (
            <motion.div
              className={modalStyles.modalOverlay}
              onClick={() => setIsConfirmingDelete(false)}
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
            <motion.div
              className={modalStyles.confirmDialog}
              role="dialog"
              aria-modal="true"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div className={modalStyles.confirmIcon} initial={{ scale: 0.6, rotate: -18 }} animate={{ scale: 1, rotate: 0 }}>!</motion.div>
              <h2 style={{ margin: 0, color: '#111827', fontSize: '1.35rem' }}>Delete monitor?</h2>
              <p style={{ margin: '10px 0 0', color: '#4B5563', lineHeight: 1.55 }}>This will remove <strong>{url.name}</strong> and its saved monitoring history.</p>
              <div className={modalStyles.dialogActions}>
                <motion.button className={modalStyles.cancelBtn} type="button" onClick={() => setIsConfirmingDelete(false)}>Cancel</motion.button>
                <motion.button className={modalStyles.confirmDeleteBtn} type="button" onClick={async () => {
                  try {
                    await import('../api/client').then(m => m.deleteUrl(urlId));
                    navigate('/monitors');
                  } catch (e) {
                    setToast('Failed to delete monitor');
                    setIsConfirmingDelete(false);
                  }
                }}>Delete</motion.button>
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </PageLayout>
  );
}
function DetailSkeleton() {
  return (
    <div className="monitor-detail-skeleton">
      <Skeleton width="48%" height={34} />
      <div className="monitor-metrics-grid">
        {Array.from({ length: 4 }, (_, index) => <StatCardSkeleton key={index} />)}
      </div>
      <ChartSkeleton height={28} />
      <div style={{ marginTop: 32 }}><ChartSkeleton height={180} /></div>
    </div>
  );
}
function CenteredMessage({ title, detail, actions }: { title: string; detail?: string; actions?: ReactNode }) {
  return (
    <div className="center-state detail-empty-state">
      <div className="state-card detail-empty-card">
        <div className="detail-empty-icon"><i className="ti ti-radar-off" aria-hidden="true" /></div>
        <h2>{title}</h2>
        {detail && <p>{detail}</p>}
        {actions && <div className="detail-empty-actions">{actions}</div>}
      </div>
    </div>
  );
}
function Section({ eyebrow, title, description, action, children }: { eyebrow: string; title: string | ReactNode; description: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="monitor-chart-panel">
      <div className="detail-section-heading">
        <div>
          <p>{eyebrow}</p>
          <h2>{title}</h2>
          <span>{description}</span>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="monitor-chart-surface">{children}</div>
    </section>
  );
}
function RecentChecks({ pings }: { pings: PingHistoryRead[] }) {
  return (
    <section className="recent-checks-panel" aria-labelledby="recent-checks-title">
      <div className="detail-section-heading">
        <div>
          <p>Audit trail</p>
          <h2 id="recent-checks-title">Recent checks</h2>
          <span>Latest check output recorded for this monitor.</span>
        </div>
        <span className="recent-checks-count">{Math.min(pings.length, 20)} shown</span>
      </div>
      <div className="recent-checks-table-wrap">
      <table className="recent-checks-table">
        <thead>
          <tr>
            <th scope="col">Checked</th>
            <th scope="col">Signal</th>
            <th scope="col">Result</th>
            <th scope="col">Response</th>
            <th scope="col">HTTP</th>
          </tr>
        </thead>
        <tbody>
          {pings.slice(0, 20).map((ping) => (
            <tr key={ping.id}>
              <td data-label="Checked">{timeAgo(ping.checked_at)}</td>
              <td data-label="Signal"><span className="signal-name">{formatCheckType(ping.check_type)}</span></td>
              <td data-label="Result"><span className={`check-result ${ping.is_up ? 'is-up' : 'is-down'}`}>{ping.is_up ? 'Passed' : 'Failed'}</span></td>
              <td data-label="Response">{ping.response_time_ms !== null ? `${ping.response_time_ms}ms` : 'No response'}</td>
              <td data-label="HTTP">{ping.status_code ?? '—'}</td>
            </tr>
          ))}
          {pings.length === 0 && (
            <tr><td className="recent-checks-empty" colSpan={5}>No completed checks have been recorded yet.</td></tr>
          )}
        </tbody>
      </table>
      </div>
    </section>
  );
}
