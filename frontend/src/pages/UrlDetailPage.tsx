import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { checkUrlNow, getUrlDetail } from '../api/client';
import { PingHistoryRead, URLDetail } from '../types';
import { PageLayout } from '../components/layout/PageLayout';
import { Toast } from '../components/ui/Toast';
import { StatusDot } from '../components/ui/StatusDot';
import { RefreshIcon } from '../components/ui/Icons';
import { ChartSkeleton, Skeleton, StatCardSkeleton } from '../components/ui/Skeleton';
import { MetricChooser, MetricKey } from '../components/stats/MetricChooser';
import { StatsRow } from '../components/stats/StatsRow';
import { UptimeBar } from '../components/charts/UptimeBar';
import { LatencyChart } from '../components/charts/LatencyChart';
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
export function UrlDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [url, setUrl] = useState<URLDetail | null>(null);
  const [livePings, setLivePings] = useState<PingHistoryRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(['avgLatency', 'p95Latency', 'uptime']);
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
        setError(null);
        document.title = `${data.name} - Uptime Monitor`;
      })
      .catch(err => mounted && setError(getErrorMessage(err)))
      .finally(() => mounted && setIsLoading(false));
    return () => { mounted = false; };
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
  }, [id, lastMessage]);
  const currentStatus = livePings[0]?.is_up === true ? 'UP' : livePings[0]?.is_up === false ? 'DOWN' : url?.status ?? 'PENDING';
  const showNotFound = !isLoading && error?.toLowerCase().includes('404');
  const showLatencyChart = selectedMetrics.includes('avgLatency') || selectedMetrics.includes('p95Latency');
  const showUptimeChart = selectedMetrics.includes('uptime');
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
          <header style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <StatusDot status={currentStatus} />
              <h1 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 28, fontWeight: 400 }}>
                {url.name}
              </h1>
              <span style={{ fontSize: 13, color: '#6B7280' }}>Checked {livePings.length} times</span>
              <button className="outline-button" type="button" onClick={handleCheckNow}>
                <RefreshIcon className={isChecking ? 'spin-icon' : undefined} size={14} />
                Check now
              </button>
            </div>
            <a href={url.web_address} target="_blank" rel="noopener noreferrer" style={{ color: '#D9C99F', fontSize: 14 }}>
              {url.web_address}
            </a>
          </header>
          <MetricChooser selectedMetrics={selectedMetrics} onChange={setSelectedMetrics} />
          <StatsRow pings={livePings} visibleMetrics={selectedMetrics} />
          {showUptimeChart && <Section title="Uptime - last 90 days"><UptimeBar pings={livePings} /></Section>}
          {showLatencyChart && <Section title="Response time - last 50 pings"><LatencyChart pings={livePings} /></Section>}
          <RecentChecks pings={livePings} />
        </>
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
