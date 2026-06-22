import '../../styles/skeleton.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = '4px', className }: SkeletonProps) {
  return (
    <div
      className={`skeleton-block${className ? ` ${className}` : ''}`}
      style={{ width, height, borderRadius }}
      aria-hidden="true"
    />
  );
}

/* ─── Card-level skeletons ──────────────────────────────────────────────── */

export function UrlCardSkeleton() {
  return (
    <div className="sk-url-card">
      <div className="sk-row sk-row--spread" style={{ marginBottom: 18 }}>
        <Skeleton width="45%" height={20} />
        <Skeleton width={10} height={10} borderRadius="50%" />
      </div>
      <Skeleton width="78%" height={14} />
      <div style={{ marginTop: 14 }}>
        <Skeleton width={68} height={22} borderRadius="12px" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="sk-stat-card">
      <Skeleton width="48%" height={12} />
      <div style={{ marginTop: 12 }}>
        <Skeleton width="68%" height={24} />
      </div>
    </div>
  );
}

export function ChartSkeleton({ height = 180 }: { height?: number }) {
  return <Skeleton height={height} borderRadius="8px" />;
}

/* ─── Table row skeleton (for FleetTable / monitor list) ───────────────── */

export function TableRowSkeleton() {
  return (
    <tr className="sk-table-row" aria-hidden="true">
      <td><div className="sk-cell"><Skeleton width="70%" height={14} /><Skeleton width="50%" height={11} /></div></td>
      <td><Skeleton width={52} height={22} borderRadius="12px" /></td>
      <td><Skeleton width={56} height={14} /></td>
      <td><Skeleton width={52} height={14} /></td>
      <td><div className="sk-chip-row"><Skeleton width={44} height={20} borderRadius="10px" /><Skeleton width={54} height={20} borderRadius="10px" /></div></td>
      <td><Skeleton width="60%" height={13} /></td>
      <td><Skeleton width="55%" height={13} /></td>
      <td><div className="sk-chip-row"><Skeleton width={64} height={28} borderRadius="6px" /><Skeleton width={54} height={28} borderRadius="6px" /></div></td>
    </tr>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} />
      ))}
    </>
  );
}

/* ─── Metric grid skeleton (4-card row at top of monitors/home) ─────────── */

export function MetricGridSkeleton() {
  return (
    <section className="ops-metric-grid" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </section>
  );
}

/* ─── Panel / card grid skeleton (status pages, alerts, integrations) ────── */

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <section className="ops-card-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="sk-op-card" key={i}>
          <Skeleton width={32} height={32} borderRadius="8px" />
          <div style={{ marginTop: 14 }}>
            <Skeleton width="55%" height={14} />
            <div style={{ marginTop: 8 }}><Skeleton width="35%" height={20} /></div>
          </div>
          <div style={{ marginTop: 10 }}><Skeleton width="80%" height={12} /></div>
        </div>
      ))}
    </section>
  );
}

/* ─── List-row skeleton (incidents, maintenance, reports) ───────────────── */

export function ListRowSkeleton() {
  return (
    <div className="sk-list-row" aria-hidden="true">
      <Skeleton width={28} height={28} borderRadius="50%" />
      <div className="sk-list-row-body">
        <div className="sk-row sk-row--spread">
          <Skeleton width="40%" height={15} />
          <Skeleton width={52} height={20} borderRadius="12px" />
        </div>
        <div style={{ marginTop: 8 }}><Skeleton width="70%" height={12} /></div>
        <div style={{ marginTop: 6 }}><Skeleton width="50%" height={11} /></div>
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  );
}

/* ─── Split-panel skeleton (incidents view, settings) ──────────────────── */

export function SplitPanelSkeleton() {
  return (
    <section className="ops-split" aria-hidden="true">
      <div className="ops-panel">
        <div className="sk-panel-header">
          <Skeleton width="40%" height={16} />
          <Skeleton width={80} height={24} borderRadius="12px" />
        </div>
        <ListSkeleton rows={4} />
      </div>
      <div className="ops-panel">
        <div className="sk-panel-header">
          <Skeleton width="50%" height={16} />
        </div>
        <ListSkeleton rows={4} />
      </div>
    </section>
  );
}

/* ─── Single panel skeleton (maintenance, reports) ──────────────────────── */

export function SinglePanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="ops-panel" aria-hidden="true">
      <div className="sk-panel-header">
        <Skeleton width="38%" height={16} />
        <Skeleton width={90} height={24} borderRadius="12px" />
      </div>
      <ListSkeleton rows={rows} />
    </div>
  );
}

/* ─── Full monitors view skeleton ────────────────────────────────────────── */

export function MonitorsSkeleton() {
  return (
    <>
      <div className="ops-toolbar" aria-hidden="true">
        <Skeleton width={140} height={40} borderRadius="8px" />
        <Skeleton width={150} height={40} borderRadius="8px" />
      </div>
      <MetricGridSkeleton />
      <div className="ops-panel" aria-hidden="true">
        <div className="sk-panel-header">
          <Skeleton width="30%" height={16} />
          <Skeleton width={100} height={24} borderRadius="12px" />
        </div>
        <div className="ops-table-wrap">
          <table className="ops-fleet-table">
            <tbody>
              <TableSkeleton rows={7} />
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
