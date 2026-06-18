import { useState } from 'react';
import { PingHistoryRead } from '../../types';

interface UptimeBarProps {
  pings: PingHistoryRead[];
}

interface DayBucket {
  date: string;
  hasData: boolean;
  uptimePct: number;
  isAllUp: boolean;
  hasAnyDown: boolean;
}

function bucketPings(pings: PingHistoryRead[], window: string): DayBucket[] {
  const buckets: DayBucket[] = [];
  
  if (window === '24h') {
    const now = new Date();
    const endHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
    
    const pingsByHour: Record<string, PingHistoryRead[]> = {};
    for (const ping of pings) {
      const d = new Date(ping.checked_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}T${d.getHours()}`;
      if (!pingsByHour[key]) pingsByHour[key] = [];
      pingsByHour[key].push(ping);
    }
    
    for (let i = 23; i >= 0; i--) {
      const d = new Date(endHour.getTime() - i * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}T${d.getHours()}`;
      const hourPings = pingsByHour[key] || [];
      const label = d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
      
      if (hourPings.length === 0) {
        buckets.push({ date: label, hasData: false, uptimePct: 100, isAllUp: true, hasAnyDown: false });
        continue;
      }
      const upCount = hourPings.filter(p => p.is_up).length;
      const hasAnyDown = hourPings.some(p => !p.is_up);
      buckets.push({ date: label, hasData: true, uptimePct: (upCount / hourPings.length) * 100, isAllUp: !hasAnyDown, hasAnyDown });
    }
    return buckets;
  }

  const days = window === '7d' ? 7 : window === '30d' ? 30 : 90;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pingsByDate: Record<string, PingHistoryRead[]> = {};
  for (const ping of pings) {
    const dateStr = ping.checked_at.split('T')[0];
    if (!pingsByDate[dateStr]) pingsByDate[dateStr] = [];
    pingsByDate[dateStr].push(ping);
  }

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime());
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    const dayPings = pingsByDate[dateStr] || [];
    
    if (dayPings.length === 0) {
      buckets.push({
        date: dateStr,
        hasData: false,
        uptimePct: 100,
        isAllUp: true,
        hasAnyDown: false,
      });
      continue;
    }

    const upCount = dayPings.filter(p => p.is_up).length;
    const hasAnyDown = dayPings.some(p => !p.is_up);
    const uptimePct = (upCount / dayPings.length) * 100;

    buckets.push({
      date: dateStr,
      hasData: true,
      uptimePct,
      isAllUp: !hasAnyDown,
      hasAnyDown,
    });
  }

  return buckets;
}

export function UptimeBar({ pings, uptimeWindow = '90d' }: UptimeBarProps & { uptimeWindow?: string }) {
  const [hoveredBucket, setHoveredBucket] = useState<DayBucket | null>(null);
  
  const buckets = bucketPings(pings, uptimeWindow);
  
  const totalPings = pings.length;
  const upPings = pings.filter(p => p.is_up).length;
  const overallUptime = totalPings === 0 ? null : ((upPings / totalPings) * 100).toFixed(1);

  const getBucketColor = (bucket: DayBucket) => {
    if (!bucket.hasData) return 'rgba(0, 0, 0, 0.05)';
    if (bucket.hasAnyDown) return '#F56565';
    return '#1D9E75';
  };

  const formatDateLabel = (dateStr: string) => {
    if (uptimeWindow === '24h') return dateStr;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ width: '100%', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 1, height: 28, position: 'relative' }} onMouseLeave={() => setHoveredBucket(null)}>
        {buckets.map((bucket) => (
          <div
            key={bucket.date}
            onMouseEnter={() => setHoveredBucket(bucket)}
            style={{
              flex: 1,
              height: '100%',
              minWidth: 3,
              backgroundColor: getBucketColor(bucket),
              borderRadius: 1,
              cursor: 'crosshair',
              transition: 'opacity 0.2s',
              opacity: hoveredBucket && hoveredBucket.date !== bucket.date ? 0.5 : 1
            }}
          />
        ))}
        
        {hoveredBucket && (
          <div style={{
            position: 'absolute',
            bottom: 36,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#FCFAFA',
            color: '#111827',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 12,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 10
          }}>
            {formatDateLabel(hoveredBucket.date)} &middot; {hoveredBucket.hasData ? `${hoveredBucket.uptimePct.toFixed(1)}% uptime` : 'No data'}
          </div>
        )}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: '#6B7280' }}>
        <span>{uptimeWindow === '24h' ? '24 hours ago' : uptimeWindow === '7d' ? '7 days ago' : uptimeWindow === '30d' ? '30 days ago' : '90 days ago'}</span>
        <span style={{ fontWeight: 500, color: '#111827' }}>
          {overallUptime !== null ? `${overallUptime}% uptime` : 'No data yet'}
        </span>
        <span>{uptimeWindow === '24h' ? 'Now' : 'Today'}</span>
      </div>
    </div>
  );
}
