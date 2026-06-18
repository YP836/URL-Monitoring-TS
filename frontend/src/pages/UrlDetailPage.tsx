import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { checkUrlNow, getUrlDetail, getUrlExtraData } from '../api/client';
import modalStyles from '../components/urls/UrlCard.module.css';
import { CheckType, PingHistoryRead, URLDetail } from '../types';
import { PageLayout } from '../components/layout/PageLayout';
import { Toast } from '../components/ui/Toast';
import { StatusDot } from '../components/ui/StatusDot';
import { DownloadIcon, RefreshIcon } from '../components/ui/Icons';
import { ChartSkeleton, Skeleton, StatCardSkeleton } from '../components/ui/Skeleton';
import { MetricKey } from '../components/stats/MetricChooser';
import { StatsRow } from '../components/stats/StatsRow';
import { UptimeBar } from '../components/charts/UptimeBar';
import { LatencyChart } from '../components/charts/LatencyChart';
import { Favicon } from './Dashboard';
import { MonitorReportModal } from '../components/reports/MonitorReportModal';
import { buildWsUrl, useWebSocket } from '../hooks/useWebSocket';
function timeAgo(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to load URL details';
}

function splitCheckTypes(checkType: string | undefined): CheckType[] {
  const knownChecks: CheckType[] = ['HTTP', 'SSL_EXPIRY', 'TTFB', 'KEYWORD', 'DOWNTIME_DURATION', 'ERROR_RATE'];
  const checks = (checkType ?? 'HTTP')
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is CheckType => knownChecks.includes(item as CheckType));
  return checks.length > 0 ? checks : ['HTTP'];
}

function metricsForCheckType(checkType: string | undefined): MetricKey[] {
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

export function UrlDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [url, setUrl] = useState<URLDetail | null>(null);
  const [livePings, setLivePings] = useState<PingHistoryRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [extraData, setExtraData] = useState<Record<string, unknown> | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const { lastMessage, isConnected, connectionError } = useWebSocket(buildWsUrl(import.meta.env.VITE_API_BASE_URL));

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setIsLoading(true);
    getUrlDetail(Number(id))
      .then(data => {
        if (!mounted) return;
        setUrl(data);
        setLivePings(data.recent_pings);
        setExtraData(data.recent_pings[0]?.extra_data ?? null);
        setError(null);
        document.title = `${data.name} - Uptime Monitor`;
      })
      .catch(err => mounted && setError(getErrorMessage(err)))
      .finally(() => mounted && setIsLoading(false));
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    getUrlExtraData(Number(id))
      .then((data) => {
        if (mounted) setExtraData(data.extra_data);
      })
      .catch(() => {
        if (mounted) setExtraData(null);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!lastMessage || lastMessage.url_id !== Number(id)) return;
    const nextPing: PingHistoryRead = {
      id: Date.now(),
      url_id: lastMessage.url_id,
      checked_at: lastMessage.checked_at,
      response_time_ms: lastMessage.latency_ms,
      status_code: lastMessage.status_code ?? null,
      is_up: lastMessage.status === 'UP',
    };
    setLivePings(previous => [nextPing, ...previous].slice(0, 50));
    if (lastMessage.extra_data && lastMessage.check_type) {
      setExtraData((previous) => ({
        ...(previous ?? {}),
        [lastMessage.check_type as string]: lastMessage.extra_data as Record<string, unknown>,
      }));
    }
  }, [id, lastMessage]);
  const currentStatus =
    lastMessage?.url_id === Number(id)
      ? lastMessage.status
      : url?.status ?? (livePings[0]?.is_up === false ? 'DOWN' : 'PENDING');
  const showNotFound = !isLoading && error?.toLowerCase().includes('404');
  const visibleMetrics = metricsForCheckType(url?.check_type);
  const selectedChecks = splitCheckTypes(url?.check_type);
  const showLatencyChart = selectedChecks.includes('HTTP');
  const showUptimeChart = selectedChecks.includes('HTTP');
  const handleCheckNow = async () => {
    if (!id) return;
    setIsChecking(true);
    try {
      await checkUrlNow(Number(id));
    } catch (err) {
      setToast(getErrorMessage(err));
    } finally {
      setIsChecking(false);
    }
  };
  return (
    <PageLayout isConnected={isConnected} connectionError={connectionError}>
      <button className="link-button" type="button" onClick={() => navigate('/dashboard')}>
        &larr; Back to dashboard
      </button>
      {isLoading && <DetailSkeleton />}
      {showNotFound && <CenteredMessage title="URL not found" />}
      {!isLoading && error && !showNotFound && <CenteredMessage title="Failed to load URL details" detail={error} />}
      {!isLoading && url && (
        <>
          <header className="detail-page-header">
            <div className="detail-title-block">
              <div className="detail-title-row">
                <StatusDot status={currentStatus} />
                <h1>
                  <Favicon url={url.web_address} size={28} />
                  {url.name}
                </h1>
                <span>Checked {livePings.length} times</span>
              </div>
              <a href={url.web_address} target="_blank" rel="noopener noreferrer">
                {url.web_address}
              </a>
            </div>
            <div className="detail-actions">
              <button className="outline-button" type="button" onClick={handleCheckNow}>
                <RefreshIcon className={isChecking ? 'spin-icon' : undefined} size={14} />
                Check now
              </button>
              <button className="primary save-report-button" type="button" onClick={() => setIsReportOpen(true)}>
                <DownloadIcon size={14} />
                Save
              </button>
              <button 
                className="outline-button" 
                type="button" 
                style={{ color: '#E24B4A', borderColor: '#E24B4A' }}
                onClick={() => setIsConfirmingDelete(true)}
              >
                Delete
              </button>
            </div>
          </header>
          <StatsRow pings={livePings} visibleMetrics={visibleMetrics} extraData={extraData} />
          {showUptimeChart && <Section title="Uptime - last 90 days"><UptimeBar pings={livePings} /></Section>}
          {showLatencyChart && <Section title="Response time - last 50 pings"><LatencyChart pings={livePings} /></Section>}
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
                    await import('../api/client').then(m => m.deleteUrl(Number(id)));
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
    <div>
      <Skeleton width="60%" height={32} />
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, margin: '32px 0' }}>
        {Array.from({ length: 4 }, (_, index) => <StatCardSkeleton key={index} />)}
      </div>
      <ChartSkeleton height={28} />
      <div style={{ marginTop: 32 }}><ChartSkeleton height={180} /></div>
    </div>
  );
}
function CenteredMessage({ title, detail }: { title: string; detail?: string }) {
  return <div className="center-state"><div className="state-card"><div>{title}</div>{detail && <p>{detail}</p>}</div></div>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#111827' }}>{title}</h2>
      <div className="console-panel">{children}</div>
    </section>
  );
}
function RecentChecks({ pings }: { pings: PingHistoryRead[] }) {
  return (
    <section>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#111827' }}>Recent checks</h2>
      <table className="premium-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <tbody>
          {pings.slice(0, 20).map((ping, index) => (
            <tr key={ping.id} style={{ backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.025)' }}>
              <td style={{ padding: '12px 8px' }}>{timeAgo(ping.checked_at)}</td>
              <td style={{ padding: '12px 8px', color: ping.is_up ? '#1D9E75' : '#E24B4A', fontWeight: 500 }}>{ping.is_up ? 'UP' : 'DOWN'}</td>
              <td style={{ padding: '12px 8px' }}>{ping.response_time_ms !== null ? `${ping.response_time_ms}ms` : '-'}</td>
              <td style={{ padding: '12px 8px' }}>{ping.status_code ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
