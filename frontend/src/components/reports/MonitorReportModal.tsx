import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { PingHistoryRead, URLDetail, URLStatus, CheckType } from '../../types';
import { Badge } from '../ui/Badge';
import { DownloadIcon } from '../ui/Icons';
import { UptimeBar } from '../charts/UptimeBar';
import { LatencyChart } from '../charts/LatencyChart';
import { parseApiDate, timeAgo } from '../../utils/dates';

type ReportSection = 'summary' | 'signals' | 'uptime' | 'latency' | 'checks';

interface MonitorReportModalProps {
  url: URLDetail;
  pings: PingHistoryRead[];
  currentStatus: URLStatus;
  extraData: Record<string, unknown> | null;
  showUptimeChart: boolean;
  showLatencyChart: boolean;
  onClose: () => void;
}

const sectionOptions: Array<{ key: ReportSection; label: string }> = [
  { key: 'summary', label: 'Summary metrics' },
  { key: 'signals', label: 'Signal-specific data' },
  { key: 'uptime', label: 'Uptime chart' },
  { key: 'latency', label: 'Latency chart' },
  { key: 'checks', label: 'Recent checks' },
];

function splitCheckTypes(checkType: string | undefined): CheckType[] {
  const knownChecks: CheckType[] = ['HTTP', 'SSL_EXPIRY', 'TTFB', 'KEYWORD', 'DOWNTIME_DURATION', 'ERROR_RATE'];
  const checks = (checkType ?? 'HTTP')
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is CheckType => knownChecks.includes(item as CheckType));
  return checks.length > 0 ? checks : ['HTTP'];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getExtraDataForCheck(checkType: CheckType, extraData: Record<string, unknown> | null) {
  if (!extraData) return null;
  const nested = extraData[checkType];
  return isRecord(nested) ? nested : extraData;
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

function computeAvgLatency(pings: PingHistoryRead[]): string {
  const upPings = pings.filter((ping) => ping.is_up && ping.response_time_ms !== null);
  if (upPings.length === 0) return '-';

  const sum = upPings.reduce((acc, ping) => acc + (ping.response_time_ms ?? 0), 0);
  return `${Math.round(sum / upPings.length)}ms`;
}

function computeP95Latency(pings: PingHistoryRead[]): string {
  const upPings = pings.filter((ping) => ping.is_up && ping.response_time_ms !== null);
  if (upPings.length === 0) return '-';

  const times = upPings.map((ping) => ping.response_time_ms ?? 0).sort((a, b) => a - b);
  const idx = Math.ceil(0.95 * times.length) - 1;
  return `${times[idx]}ms`;
}

function computeUptime(pings: PingHistoryRead[]): string {
  if (pings.length === 0) return '-';
  const upCount = pings.filter((ping) => ping.is_up).length;
  return `${((upCount / pings.length) * 100).toFixed(1)}%`;
}

function getBadgeVariant(status: URLStatus) {
  if (status === 'UP') return 'success';
  if (status === 'DOWN') return 'danger';
  if (status === 'WARN') return 'warning';
  return 'neutral';
}

function sanitizeFileName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'monitor-report';
}

function createWhiteCanvasSlice(sourceCanvas: HTMLCanvasElement, sourceY: number, sourceHeight: number) {
  const sliceCanvas = document.createElement('canvas');
  sliceCanvas.width = sourceCanvas.width;
  sliceCanvas.height = sourceHeight;

  const context = sliceCanvas.getContext('2d');
  if (!context) throw new Error('Could not prepare PDF page');

  context.fillStyle = '#FFFDFB';
  context.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
  context.drawImage(
    sourceCanvas,
    0,
    sourceY,
    sourceCanvas.width,
    sourceHeight,
    0,
    0,
    sourceCanvas.width,
    sourceHeight,
  );

  return sliceCanvas;
}

function getCanvasBreakpoints(reportElement: HTMLDivElement, canvas: HTMLCanvasElement) {
  const reportRect = reportElement.getBoundingClientRect();
  const scale = canvas.width / reportElement.scrollWidth;
  const elements = reportElement.querySelectorAll<HTMLElement>(
    '.monitor-report-header, .report-meta-row, .report-section, .report-check-table tr',
  );
  const breakpoints = Array.from(elements)
    .map((element) => Math.round((element.getBoundingClientRect().top - reportRect.top) * scale))
    .filter((top) => top > 0 && top < canvas.height);

  return Array.from(new Set(breakpoints)).sort((a, b) => a - b);
}

function getNextPdfSliceHeight(
  canvas: HTMLCanvasElement,
  breakpoints: number[],
  sourceY: number,
  idealPageHeight: number,
) {
  const remainingHeight = canvas.height - sourceY;
  if (remainingHeight <= idealPageHeight) return remainingHeight;

  const target = sourceY + idealPageHeight;
  const minimumUsefulBreak = sourceY + idealPageHeight * 0.45;
  const breakPadding = 28;
  const safeBreakCandidates = breakpoints.filter(
    (point) => point > minimumUsefulBreak && point < target - breakPadding,
  );
  const safeBreak = safeBreakCandidates[safeBreakCandidates.length - 1];

  return Math.max(120, (safeBreak ?? target) - sourceY);
}

function getSignalRows(checkType: string | undefined, extraData: Record<string, unknown> | null) {
  return splitCheckTypes(checkType)
    .filter((check) => check !== 'HTTP')
    .map((check) => {
      const data = getExtraDataForCheck(check, extraData);

      if (check === 'SSL_EXPIRY') {
        const days = data ? getNumber(data.days_remaining) : null;
        const issuer = data ? getString(data.issuer) : null;
        return {
          label: 'SSL expiry',
          value: days === null ? 'Waiting for check' : `${days} days remaining`,
          detail: issuer ? `Issuer: ${issuer}` : undefined,
        };
      }

      if (check === 'TTFB') {
        const ttfb = data ? getNumber(data.ttfb_ms) : null;
        const total = data ? getNumber(data.total_ms) : null;
        return {
          label: 'TTFB',
          value: ttfb === null ? 'Waiting for check' : `${ttfb}ms`,
          detail: total === null ? undefined : `Total: ${total}ms`,
        };
      }

      if (check === 'KEYWORD') {
        const found = data ? getBoolean(data.keyword_found) : null;
        const keyword = data ? getString(data.keyword) : null;
        return {
          label: 'Keyword',
          value: found === null ? 'Waiting for check' : found ? 'Found' : 'Not found',
          detail: keyword ? `"${keyword}"` : undefined,
        };
      }

      if (check === 'DOWNTIME_DURATION') {
        const minutes = data ? getNumber(data.downtime_minutes_30d) : null;
        const incidents = data ? getNumber(data.incident_count_30d) : null;
        return {
          label: 'Downtime',
          value: minutes === null ? 'Waiting for check' : `${minutes} min / 30d`,
          detail: incidents === null ? undefined : `${incidents} incidents / 30d`,
        };
      }

      const rate = data ? getNumber(data.error_rate_pct) : null;
      const total = data ? getNumber(data.total_pings) : null;
      return {
        label: 'Error rate',
        value: rate === null ? 'Waiting for check' : `${rate.toFixed(1)}%`,
        detail: total === null ? undefined : `${total} pings sampled`,
      };
    });
}

export function MonitorReportModal({
  url,
  pings,
  currentStatus,
  extraData,
  showUptimeChart,
  showLatencyChart,
  onClose,
}: MonitorReportModalProps) {
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [sections, setSections] = useState<Record<ReportSection, boolean>>({
    summary: true,
    signals: true,
    uptime: showUptimeChart,
    latency: showLatencyChart,
    checks: true,
  });
  const [exporting, setExporting] = useState<'pdf' | 'png' | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const sortedPings = useMemo(
    () => [...pings].sort((a, b) => parseApiDate(b.checked_at).getTime() - parseApiDate(a.checked_at).getTime()),
    [pings],
  );
  const latestPing = sortedPings[0];
  const signalRows = useMemo(() => getSignalRows(url.check_type, extraData), [url.check_type, extraData]);
  const generatedAt = new Date().toLocaleString();
  const fileName = `${sanitizeFileName(url.name)}-uptime-report`;

  const summaryCards = [
    { label: 'Status', value: currentStatus },
    { label: 'Uptime', value: computeUptime(pings) },
    { label: 'Avg latency', value: computeAvgLatency(pings) },
    { label: 'P95 latency', value: computeP95Latency(pings) },
    { label: 'Last checked', value: latestPing ? timeAgo(latestPing.checked_at) : 'Never' },
    { label: 'Checks', value: String(pings.length) },
  ];

  const setSection = (section: ReportSection) => {
    setSections((previous) => ({ ...previous, [section]: !previous[section] }));
  };

  const captureReport = async () => {
    if (!reportRef.current) throw new Error('Report preview is not ready');
    const { default: html2canvas } = await import('html2canvas');
    const exportScale = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3);

    document.body.classList.add('exporting-report');
    try {
      return await html2canvas(reportRef.current, {
        backgroundColor: '#FFFDFB',
        height: reportRef.current.scrollHeight,
        onclone: (documentClone) => {
          documentClone.body.classList.add('exporting-report');
        },
        removeContainer: true,
        scale: exportScale,
        scrollX: 0,
        scrollY: 0,
        useCORS: true,
        width: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight,
        windowWidth: reportRef.current.scrollWidth,
      });
    } finally {
      document.body.classList.remove('exporting-report');
    }
  };

  const downloadPng = async () => {
    setExporting('png');
    try {
      const canvas = await captureReport();
      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setExporting(null);
    }
  };

  const downloadPdf = async () => {
    setExporting('pdf');
    try {
      if (!reportRef.current) throw new Error('Report preview is not ready');
      const { jsPDF } = await import('jspdf');
      const canvas = await captureReport();
      const pdf = new jsPDF({
        compress: true,
        format: 'a4',
        orientation: 'portrait',
        unit: 'pt',
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 28;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;
      const idealPageHeight = Math.floor((contentHeight * canvas.width) / contentWidth);
      const breakpoints = getCanvasBreakpoints(reportRef.current, canvas);
      let sourceY = 0;
      let pageIndex = 0;

      while (sourceY < canvas.height) {
        const sliceHeight = getNextPdfSliceHeight(canvas, breakpoints, sourceY, idealPageHeight);
        const sliceCanvas = createWhiteCanvasSlice(canvas, sourceY, sliceHeight);
        const imageData = sliceCanvas.toDataURL('image/png');
        const imageHeight = (sliceHeight * contentWidth) / canvas.width;

        if (pageIndex > 0) pdf.addPage();
        pdf.setFillColor(255, 253, 251);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        pdf.addImage(imageData, 'PNG', margin, margin, contentWidth, imageHeight, undefined, 'FAST');

        sourceY += sliceHeight;
        pageIndex += 1;
      }

      pdf.save(`${fileName}.pdf`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <motion.div
      className="report-modal-backdrop"
      role="presentation"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        className="report-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, y: 18, scale: 0.97, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: 12, scale: 0.97, filter: 'blur(8px)' }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="report-modal-header">
          <div>
            <p className="landing-kicker">Save report</p>
            <h2 id="report-modal-title">Export monitor evidence</h2>
            <span>{url.name}</span>
          </div>
          <button type="button" className="add-url-modal-close" onClick={onClose} aria-label="Close report modal">
            x
          </button>
        </div>

        <div className="report-modal-body">
          <aside className="report-options-panel">
            <div>
              <h3>Include sections</h3>
              <p>Choose what should appear in the branded download.</p>
            </div>

            <div className="report-section-toggles">
              {sectionOptions.map((option) => (
                <label key={option.key} className="report-toggle-row">
                  <input
                    type="checkbox"
                    checked={sections[option.key]}
                    disabled={(option.key === 'uptime' && !showUptimeChart) || (option.key === 'latency' && !showLatencyChart)}
                    onChange={() => setSection(option.key)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>

            <div className="report-download-actions">
              <button type="button" className="primary" onClick={downloadPdf} disabled={exporting !== null}>
                <DownloadIcon size={14} />
                {exporting === 'pdf' ? 'Preparing PDF...' : 'Download PDF'}
              </button>
              <button type="button" className="outline-button" onClick={downloadPng} disabled={exporting !== null}>
                <DownloadIcon size={14} />
                {exporting === 'png' ? 'Preparing PNG...' : 'Download PNG'}
              </button>
            </div>
          </aside>

          <div className="report-preview-shell">
            <div className="monitor-report-page" ref={reportRef}>
              <header className="monitor-report-header">
                <div>
                  <span className="report-brand-mark">Uptime Monitor</span>
                  <h1>{url.name}</h1>
                  <p>{url.web_address}</p>
                </div>
                <div className="report-status-card">
                  <span>Status</span>
                  <Badge variant={getBadgeVariant(currentStatus)} label={currentStatus} />
                </div>
              </header>

              <div className="report-meta-row">
                <span>Generated {generatedAt}</span>
                <span>Report scope: Individual monitor</span>
              </div>

              {sections.summary && (
                <section className="report-section">
                  <div className="report-section-heading">
                    <span>01</span>
                    <h2>Summary metrics</h2>
                  </div>
                  <div className="report-summary-grid">
                    {summaryCards.map((card) => (
                      <article key={card.label}>
                        <span>{card.label}</span>
                        <strong>{card.value}</strong>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {sections.signals && (
                <section className="report-section">
                  <div className="report-section-heading">
                    <span>02</span>
                    <h2>Signal-specific data</h2>
                  </div>
                  {signalRows.length > 0 ? (
                    <div className="report-signal-grid">
                      {signalRows.map((row) => (
                        <article key={row.label}>
                          <span>{row.label}</span>
                          <strong>{row.value}</strong>
                          {row.detail && <small>{row.detail}</small>}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="report-empty-note">No extra signal data for this HTTP-only monitor.</p>
                  )}
                </section>
              )}

              {sections.uptime && showUptimeChart && (
                <section className="report-section">
                  <div className="report-section-heading">
                    <span>03</span>
                    <h2>Uptime chart</h2>
                  </div>
                  <div className="report-chart-card">
                    <UptimeBar pings={pings} />
                  </div>
                </section>
              )}

              {sections.latency && showLatencyChart && (
                <section className="report-section">
                  <div className="report-section-heading">
                    <span>04</span>
                    <h2>Latency chart</h2>
                  </div>
                  <div className="report-chart-card">
                    <LatencyChart pings={pings} height={220} />
                  </div>
                </section>
              )}

              {sections.checks && (
                <section className="report-section">
                  <div className="report-section-heading">
                    <span>05</span>
                    <h2>Recent checks</h2>
                  </div>
                  <table className="report-check-table">
                    <thead>
                      <tr>
                        <th>Checked</th>
                        <th>Status</th>
                        <th>Latency</th>
                        <th>Status code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPings.slice(0, 16).map((ping) => (
                        <tr key={ping.id}>
                          <td>{timeAgo(ping.checked_at)}</td>
                          <td className={ping.is_up ? 'is-up' : 'is-down'}>{ping.is_up ? 'UP' : 'DOWN'}</td>
                          <td>{ping.response_time_ms !== null ? `${ping.response_time_ms}ms` : '-'}</td>
                          <td>{ping.status_code ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
