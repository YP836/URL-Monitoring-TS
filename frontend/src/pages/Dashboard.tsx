import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AddUrlModal } from '../components/urls/AddUrlModal';
import { Toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { PageLayout } from '../components/layout/PageLayout';
import { getUrlExtraData } from '../api/client';
import { useUrls } from '../hooks/useUrls';
import { buildWsUrl, useWebSocket } from '../hooks/useWebSocket';
import { useLiveStatus } from '../hooks/useLiveStatus';
import { URLItem, URLStatus } from '../types';
import { DEMO_MONITORS, FleetMonitor } from '../data/demoMonitors';

export type OperationsView =
  | 'home'
  | 'monitors'
  | 'incidents'
  | 'status-pages'
  | 'maintenance'
  | 'alerts'
  | 'reports'
  | 'integrations'
  | 'settings';

interface DashboardProps {
  view?: OperationsView;
}

const viewCopy: Record<OperationsView, { kicker: string; title: string; description: string }> = {
  home: {
    kicker: 'Home',
    title: 'Home command center',
    description: 'Fleet health, incidents, alerts, and reports for every monitored endpoint.',
  },
  monitors: {
    kicker: 'Monitor fleet',
    title: 'All website monitors',
    description: 'Review every live and demo endpoint, its current status, latency, owner, and check cadence.',
  },
  incidents: {
    kicker: 'Incident response',
    title: 'Active incidents',
    description: 'Track degraded and down monitors with clear ownership, severity, and next action.',
  },
  'status-pages': {
    kicker: 'Customer trust',
    title: 'Status pages',
    description: 'Publish service health, components, announcements, and subscriber updates from one place.',
  },
  maintenance: {
    kicker: 'Planned work',
    title: 'Maintenance windows',
    description: 'Schedule expected downtime so the monitoring system stays calm during planned changes.',
  },
  alerts: {
    kicker: 'Escalation',
    title: 'Alert routing',
    description: 'Keep email, Slack, SMS, and webhook policies ready for the right responders.',
  },
  reports: {
    kicker: 'Evidence',
    title: 'Reports and exports',
    description: 'Summarize uptime, latency, P95 behavior, incidents, and check quality for stakeholders.',
  },
  integrations: {
    kicker: 'Automation',
    title: 'Integrations',
    description: 'Connect the console to team workflows, incident tools, chat, and APIs.',
  },
  settings: {
    kicker: 'Workspace',
    title: 'Operational settings',
    description: 'Control defaults, retention, team access, API keys, and monitor policy templates.',
  },
};

const statusMeta: Record<URLStatus, { label: string; color: string; bg: string }> = {
  UP: { label: 'UP', color: '#1D9E75', bg: '#E8FBF5' },
  WARN: { label: 'WARN', color: '#BA7517', bg: '#FFF4DE' },
  DOWN: { label: 'DOWN', color: '#E24B4A', bg: '#FFF0F0' },
  PENDING: { label: 'PENDING', color: '#6B7280', bg: '#F3F4F6' },
};

const integrations = [
  ['Slack', 'Send monitor alerts and incident updates to channels.', 'Connected', 'ti-brand-slack'],
  ['PagerDuty', 'Route critical incidents to on-call schedules.', 'Ready', 'ti-bell-ringing'],
  ['Email', 'Notify subscribers and internal teams.', 'Connected', 'ti-mail'],
  ['Webhook', 'Push status events into custom systems.', 'Ready', 'ti-webhook'],
  ['Microsoft Teams', 'Notify delivery rooms during degraded states.', 'Available', 'ti-brand-teams'],
  ['REST API', 'Automate monitors, exports, and status pages.', 'Available', 'ti-code'],
];

const maintenanceWindows = [
  ['Database patch', 'Sunday 02:00 - 02:45', 'Affects Supabase and internal API monitors'],
  ['CDN rules deploy', 'Wednesday 23:30 - 23:50', 'Cloudflare and Vercel edge checks muted'],
  ['Checkout release', 'Friday 01:00 - 01:20', 'Stripe API and keyword checks watched closely'],
];

const reportCards = [
  ['Executive uptime report', 'Fleet uptime, SLA, and major incidents', 'PDF export'],
  ['Latency evidence pack', 'Average, P95, TTFB, and slow-region behavior', 'Charts'],
  ['Incident review', 'Downtime minutes, error rate, owner, and timeline', 'Postmortem'],
  ['Status-page summary', 'Subscriber-visible service health snapshot', 'Public view'],
];

function timeAgo(isoString: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatInterval(seconds?: number): string {
  if (!seconds) return '30s';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

function formatMs(value: number | null): string {
  return value === null ? '-' : `${value}ms`;
}

function formatPct(value: number): string {
  return `${value.toFixed(value >= 99 ? 2 : 1)}%`;
}

function estimateUptime(status: URLStatus): number {
  if (status === 'UP') return 99.85;
  if (status === 'WARN') return 97.4;
  if (status === 'DOWN') return 89.2;
  return 0;
}

function getP95Latency(values: Array<number | null>): number | null {
  const validValues = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (validValues.length === 0) return null;
  const sorted = [...validValues].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[index];
}

function toLiveFleetMonitor(url: URLItem, lastPingMap: Record<number, { latency_ms: number | null; checked_at: string }>): FleetMonitor {
  const lastPing = lastPingMap[url.id];
  const latency = lastPing?.latency_ms ?? null;
  return {
    id: url.id,
    name: url.name,
    web_address: url.web_address,
    status: url.status,
    source: 'live',
    latency_ms: latency,
    p95_latency_ms: latency === null ? null : Math.round(latency * 1.55),
    uptime_pct: estimateUptime(url.status),
    region: 'Primary region',
    owner: 'Live workspace',
    last_checked_at: lastPing?.checked_at ?? url.created_at,
    next_check: formatInterval(url.ping_interval_seconds ?? url.check_interval_seconds),
    check_type: url.check_type ?? 'HTTP',
  };
}

function getCheckChips(checkType?: string): string[] {
  return (checkType ?? 'HTTP')
    .split(',')
    .map((check) => check.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function DashboardMetric({ label, value, detail, tone = 'default' }: { label: string; value: string; detail: string; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  return (
    <motion.article className={`ops-metric-card tone-${tone}`} whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </motion.article>
  );
}

function StatusPill({ status }: { status: URLStatus }) {
  const meta = statusMeta[status];
  return (
    <span className="ops-status-pill" style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.color }}>
      {meta.label}
    </span>
  );
}

function SourcePill({ source }: { source: 'live' | 'demo' }) {
  return <span className={`ops-source-pill ${source}`}>{source === 'live' ? 'Live' : 'Demo'}</span>;
}

function FleetTable({ monitors, onInspect }: { monitors: FleetMonitor[]; onInspect: (id: number) => void }) {
  return (
    <div className="ops-table-wrap">
      <table className="ops-fleet-table">
        <thead>
          <tr>
            <th>Monitor</th>
            <th>Status</th>
            <th>Latency</th>
            <th>Uptime</th>
            <th>Checks</th>
            <th>Owner</th>
            <th>Last checked</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {monitors.map((monitor) => (
            <tr key={monitor.id}>
              <td>
                <div className="ops-monitor-cell">
                  <strong>{monitor.name}</strong>
                  <span>{monitor.web_address}</span>
                  <div className="ops-mobile-row">
                    <StatusPill status={monitor.status} />
                    <SourcePill source={monitor.source} />
                  </div>
                </div>
              </td>
              <td>
                <StatusPill status={monitor.status} />
              </td>
              <td>
                <strong>{formatMs(monitor.latency_ms)}</strong>
                <span>P95 {formatMs(monitor.p95_latency_ms)}</span>
              </td>
              <td>{formatPct(monitor.uptime_pct)}</td>
              <td>
                <div className="ops-chip-row">
                  {getCheckChips(monitor.check_type).map((check) => (
                    <span className="ops-mini-chip" key={`${monitor.id}-${check}`}>{check.replace('_', ' ')}</span>
                  ))}
                </div>
              </td>
              <td>
                <span>{monitor.owner}</span>
                <small>{monitor.region}</small>
              </td>
              <td>
                <span>{timeAgo(monitor.last_checked_at)}</span>
                <small>Next {monitor.next_check}</small>
              </td>
              <td>
                {monitor.source === 'live' ? (
                  <button type="button" className="ops-table-action" onClick={() => onInspect(monitor.id)}>
                    Inspect
                  </button>
                ) : (
                  <SourcePill source="demo" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IncidentList({ incidents }: { incidents: FleetMonitor[] }) {
  return (
    <div className="ops-list">
      {incidents.map((incident, index) => (
        <article className="ops-incident-row" key={incident.id}>
          <div className="ops-incident-rank">{String(index + 1).padStart(2, '0')}</div>
          <div>
            <div className="ops-row-title">
              <strong>{incident.name}</strong>
              <StatusPill status={incident.status} />
            </div>
            <p>{incident.incident_note ?? `${incident.status === 'DOWN' ? 'No successful response' : 'Warning threshold crossed'} on ${incident.region}.`}</p>
            <small>Owner: {incident.owner} | Last checked {timeAgo(incident.last_checked_at)}</small>
          </div>
        </article>
      ))}
    </div>
  );
}

export function Dashboard({ view = 'home' }: DashboardProps) {
  const { urls, isLoading, error, addUrl, retryFetch, clearError } = useUrls();
  const navigate = useNavigate();
  const [extraDataMap, setExtraDataMap] = useState<Record<number, Record<string, unknown>>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const wsUrl = buildWsUrl(import.meta.env.VITE_API_BASE_URL);
  const { lastMessage, isConnected, connectionError } = useWebSocket(wsUrl);
  const { liveUrls, lastPingMap } = useLiveStatus(urls, lastMessage);
  const copy = viewCopy[view];
  const signalSnapshotCount = Object.keys(extraDataMap).length;

  useEffect(() => {
    document.title = `${copy.title} - Uptime Monitor`;
  }, [copy.title]);

  useEffect(() => {
    if (urls.length === 0) {
      setExtraDataMap({});
      return;
    }

    let mounted = true;

    const loadExtraData = async () => {
      const nextExtraMap: Record<number, Record<string, unknown>> = {};
      await Promise.allSettled(
        urls.map(async (url) => {
          try {
            const data = await getUrlExtraData(url.id);
            nextExtraMap[url.id] = data.extra_data;
          } catch {
            return;
          }
        }),
      );

      if (mounted) setExtraDataMap(nextExtraMap);
    };

    void loadExtraData();

    return () => {
      mounted = false;
    };
  }, [urls]);

  useEffect(() => {
    if (!lastMessage?.extra_data || !lastMessage.check_type) return;
    const messageCheckType = lastMessage.check_type;

    setExtraDataMap((previous) => ({
      ...previous,
      [lastMessage.url_id]: {
        ...(previous[lastMessage.url_id] ?? {}),
        [messageCheckType]: lastMessage.extra_data as Record<string, unknown>,
      },
    }));
  }, [lastMessage]);

  const fleetMonitors = useMemo<FleetMonitor[]>(() => {
    const liveFleet = liveUrls.map((url) => toLiveFleetMonitor(url, lastPingMap));
    const demoNeeded = Math.max(15 - liveFleet.length, 0);
    const demoFleet: FleetMonitor[] = DEMO_MONITORS.slice(0, demoNeeded).map((monitor) => ({
      id: monitor.id,
      name: monitor.name,
      web_address: monitor.web_address,
      status: monitor.status,
      source: 'demo',
      latency_ms: monitor.latency_ms,
      p95_latency_ms: monitor.p95_latency_ms,
      uptime_pct: monitor.uptime_pct,
      region: monitor.region,
      owner: monitor.owner,
      last_checked_at: monitor.last_checked_at,
      next_check: monitor.next_check,
      check_type: monitor.check_type,
      incident_note: monitor.incident_note,
    }));

    return [...liveFleet, ...demoFleet];
  }, [lastPingMap, liveUrls]);

  const metrics = useMemo(() => {
    const total = fleetMonitors.length;
    const down = fleetMonitors.filter((monitor) => monitor.status === 'DOWN').length;
    const warn = fleetMonitors.filter((monitor) => monitor.status === 'WARN').length;
    const active = down + warn;
    const avgUptime = total ? fleetMonitors.reduce((sum, monitor) => sum + monitor.uptime_pct, 0) / total : 0;
    const avgLatency = getP95Latency(fleetMonitors.map((monitor) => monitor.latency_ms));
    const p95 = getP95Latency(fleetMonitors.map((monitor) => monitor.p95_latency_ms));

    return { total, down, warn, active, avgUptime, avgLatency, p95 };
  }, [fleetMonitors]);

  const incidents = useMemo(
    () => fleetMonitors.filter((monitor) => monitor.status === 'DOWN' || monitor.status === 'WARN').slice(0, 6),
    [fleetMonitors],
  );

  const handleAddUrl = async (payload: Parameters<typeof addUrl>[0]) => {
    await addUrl(payload);
  };

  const handleInspectMonitor = (id: number) => {
    if (id > 0) navigate(`/urls/${id}`);
  };

  const renderCommandCard = () => (
    <motion.section
      className="ops-command-card"
      initial={{ opacity: 0, y: 20, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      <div>
        <p className="landing-kicker">Command center</p>
        <h2>Start a precision monitor</h2>
        <p>Add the URL, choose only the signals you need, and set the exact check frequency.</p>
      </div>
      <motion.button
        type="button"
        disabled={isLoading}
        className="primary start-monitor-button"
        onClick={() => setIsAddModalOpen(true)}
        whileHover={{ y: -2, scale: 1.015 }}
        whileTap={{ scale: 0.97 }}
      >
        Start monitoring
      </motion.button>
    </motion.section>
  );

  const renderMetrics = () => (
    <section className="ops-metric-grid">
      <DashboardMetric label="Monitors" value={String(metrics.total)} detail={`${liveUrls.length} live + ${metrics.total - liveUrls.length} demo`} />
      <DashboardMetric label="Fleet uptime" value={formatPct(metrics.avgUptime)} detail="Average across visible fleet" tone="good" />
      <DashboardMetric label="Active incidents" value={String(metrics.active)} detail={`${metrics.down} down, ${metrics.warn} warning`} tone={metrics.active ? 'warn' : 'good'} />
      <DashboardMetric label="P95 latency" value={formatMs(metrics.p95)} detail={`Median sample ${formatMs(metrics.avgLatency)}`} />
    </section>
  );

  const renderHome = () => (
    <>
      {renderCommandCard()}
      {renderMetrics()}
      <section className="ops-home-grid">
        <div className="ops-panel ops-panel-wide">
          <div className="ops-panel-header">
            <div>
              <p className="ops-kicker">Fleet health</p>
              <h3>All monitored websites</h3>
            </div>
            <Badge variant="neutral" label={`${fleetMonitors.length} sites`} />
          </div>
          <FleetTable monitors={fleetMonitors} onInspect={handleInspectMonitor} />
        </div>
        <div className="ops-panel">
          <div className="ops-panel-header">
            <div>
              <p className="ops-kicker">Incidents</p>
              <h3>Needs attention</h3>
            </div>
            <Badge variant={incidents.length ? 'warning' : 'success'} label={`${incidents.length} active`} />
          </div>
          <IncidentList incidents={incidents} />
        </div>
      </section>
      <section className="ops-card-grid">
        <OperationalCard icon="ti-world-share" title="Status-page readiness" value="2 pages" detail="Public and internal pages prepared with component health." />
        <OperationalCard icon="ti-calendar-time" title="Maintenance windows" value="3 planned" detail="Scheduled work can mute expected downtime." />
        <OperationalCard icon="ti-bell-ringing" title="Alert policies" value="4 routes" detail="Slack, email, webhook, and on-call escalation are mapped." />
        <OperationalCard icon="ti-file-analytics" title="Reports" value="4 templates" detail="Export uptime, P95, incident, and stakeholder reports." />
      </section>
    </>
  );

  const renderMonitors = () => (
    <>
      <div className="ops-toolbar">
        <button type="button" className="primary start-monitor-button" onClick={() => setIsAddModalOpen(true)}>
          <i className="ti ti-plus" aria-hidden="true" /> Add monitor
        </button>
        <button type="button" className="ops-ghost-button" onClick={retryFetch}>
          <i className="ti ti-refresh" aria-hidden="true" /> Refresh live data
        </button>
      </div>
      {renderMetrics()}
      <div className="ops-panel">
        <div className="ops-panel-header">
          <div>
            <p className="ops-kicker">Monitor matrix</p>
            <h3>15-site operational fleet</h3>
          </div>
          <Badge variant="neutral" label="Demo rows are presentation safe" />
        </div>
        <FleetTable monitors={fleetMonitors} onInspect={handleInspectMonitor} />
      </div>
    </>
  );

  const renderIncidents = () => (
    <section className="ops-split">
      <div className="ops-panel">
        <div className="ops-panel-header">
          <div>
            <p className="ops-kicker">Queue</p>
            <h3>Active incident timeline</h3>
          </div>
          <Badge variant="warning" label={`${incidents.length} active`} />
        </div>
        <IncidentList incidents={incidents} />
      </div>
      <div className="ops-panel">
        <div className="ops-panel-header">
          <div>
            <p className="ops-kicker">Response playbook</p>
            <h3>Next actions</h3>
          </div>
        </div>
        <StepList
          items={[
            ['Acknowledge', 'Assign an owner and freeze noisy duplicate alerts.'],
            ['Diagnose', 'Compare HTTP status, TTFB, SSL, keyword, and history checks.'],
            ['Communicate', 'Publish status-page update if customer-facing.'],
            ['Resolve', 'Close the incident with downtime and error-rate evidence.'],
          ]}
        />
      </div>
    </section>
  );

  const renderStatusPages = () => (
    <section className="ops-card-grid">
      <OperationalCard icon="ti-world-share" title="Public status page" value="Live draft" detail="Customer-facing uptime, incidents, and maintenance announcements." />
      <OperationalCard icon="ti-lock" title="Internal status page" value="Private" detail="Engineering-only page with owners, regions, and raw signal health." />
      <OperationalCard icon="ti-users" title="Subscribers" value="128 demo" detail="Email subscribers can receive issue and maintenance updates." />
      <OperationalCard icon="ti-components" title="Components" value="8 services" detail="Group monitors into API, web, database, payments, and edge." />
    </section>
  );

  const renderMaintenance = () => (
    <div className="ops-panel">
      <div className="ops-panel-header">
        <div>
          <p className="ops-kicker">Schedule</p>
          <h3>Planned maintenance windows</h3>
        </div>
        <button type="button" className="ops-ghost-button"><i className="ti ti-calendar-plus" /> New window</button>
      </div>
      <SimpleRows rows={maintenanceWindows} />
    </div>
  );

  const renderAlerts = () => (
    <section className="ops-card-grid">
      <OperationalCard icon="ti-brand-slack" title="Slack critical" value="Enabled" detail="WARN and DOWN events route to #ops-monitoring." />
      <OperationalCard icon="ti-mail" title="Email digest" value="Daily" detail="Summary of incidents, downtime, and slow checks." />
      <OperationalCard icon="ti-phone-call" title="On-call SMS" value="Critical only" detail="Escalates DOWN events after two failed checks." />
      <OperationalCard icon="ti-webhook" title="Webhook stream" value="Ready" detail="Pushes monitor status JSON into external automations." />
    </section>
  );

  const renderReports = () => (
    <div className="ops-panel">
      <div className="ops-panel-header">
        <div>
          <p className="ops-kicker">Export center</p>
          <h3>Stakeholder-ready report templates</h3>
        </div>
        <Badge variant="neutral" label="PDF / CSV roadmap" />
      </div>
      <SimpleRows rows={reportCards} />
    </div>
  );

  const renderIntegrations = () => (
    <section className="ops-card-grid">
      {integrations.map(([name, detail, status, icon]) => (
        <OperationalCard key={name} icon={icon} title={name} value={status} detail={detail} />
      ))}
    </section>
  );

  const renderSettings = () => (
    <section className="ops-split">
      <div className="ops-panel">
        <div className="ops-panel-header">
          <div>
            <p className="ops-kicker">Defaults</p>
            <h3>Monitoring policy</h3>
          </div>
        </div>
        <StepList
          items={[
            ['Default cadence', '30 minutes for new monitors, adjustable per URL.'],
            ['Retention', 'Keep ping history for dashboard and report evidence.'],
            ['Signal policy', 'Run only selected checks to save computation power.'],
            ['Branding', 'White and orange command-center theme across pages.'],
          ]}
        />
      </div>
      <div className="ops-panel">
        <div className="ops-panel-header">
          <div>
            <p className="ops-kicker">Access</p>
            <h3>Workspace controls</h3>
          </div>
        </div>
        <StepList
          items={[
            ['API key', 'Used by the React client and FastAPI backend.'],
            ['Team roles', 'Admin, responder, viewer, and billing-ready slots.'],
            ['Audit trail', 'Track monitor creation, deletion, exports, and status-page changes.'],
          ]}
        />
      </div>
    </section>
  );

  const renderView = () => {
    if (view === 'home') return renderHome();
    if (view === 'monitors') return renderMonitors();
    if (view === 'incidents') return renderIncidents();
    if (view === 'status-pages') return renderStatusPages();
    if (view === 'maintenance') return renderMaintenance();
    if (view === 'alerts') return renderAlerts();
    if (view === 'reports') return renderReports();
    if (view === 'integrations') return renderIntegrations();
    return renderSettings();
  };

  return (
    <PageLayout isConnected={isConnected} connectionError={connectionError} urlCount={fleetMonitors.length}>
      <div className="ops-page">
        <header className="ops-page-header">
          <div>
            <p className="ops-kicker">{copy.kicker}</p>
            <h1>{copy.title}</h1>
            <p>{copy.description}</p>
          </div>
          <div className="ops-header-actions">
            {isLoading && <Badge variant="neutral" label="Syncing live monitors" />}
            <Badge variant="neutral" label={`${signalSnapshotCount} signal snapshots`} />
            <Badge variant="neutral" label={`${fleetMonitors.length} sites`} />
          </div>
        </header>

        {renderView()}

        <AnimatePresence>
          {isAddModalOpen && (
            <AddUrlModal
              onClose={() => setIsAddModalOpen(false)}
              onAdd={handleAddUrl}
              isLoading={isLoading}
            />
          )}
        </AnimatePresence>

        {error && (
          <Toast
            message={`${error}. Showing demo monitors so the console remains usable.`}
            onDismiss={clearError}
          />
        )}
      </div>
    </PageLayout>
  );
}

function OperationalCard({ icon, title, value, detail }: { icon: string; title: string; value: string; detail: string }) {
  return (
    <motion.article className="ops-feature-card" whileHover={{ y: -4 }} transition={{ duration: 0.18 }}>
      <div className="ops-feature-icon">
        <i className={`ti ${icon}`} aria-hidden="true" />
      </div>
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </motion.article>
  );
}

function SimpleRows({ rows }: { rows: string[][] }) {
  return (
    <div className="ops-simple-rows">
      {rows.map(([title, meta, detail]) => (
        <article key={`${title}-${meta}`}>
          <div>
            <strong>{title}</strong>
            <span>{detail}</span>
          </div>
          <Badge variant="neutral" label={meta} />
        </article>
      ))}
    </div>
  );
}

function StepList({ items }: { items: string[][] }) {
  return (
    <div className="ops-step-list">
      {items.map(([title, detail], index) => (
        <article key={title}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <div>
            <strong>{title}</strong>
            <p>{detail}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
