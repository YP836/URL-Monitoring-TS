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

function bucketByDay(pings: PingHistoryRead[]): DayBucket[] {
  const buckets: DayBucket[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Pre-group pings by date string
  const pingsByDate: Record<string, PingHistoryRead[]> = {};
  for (const ping of pings) {
    const dateStr = ping.checked_at.split('T')[0];
    if (!pingsByDate[dateStr]) pingsByDate[dateStr] = [];
    pingsByDate[dateStr].push(ping);
  }

  // Iterate from 89 days ago to today (90 days total)
  for (let i = 89; i >= 0; i--) {
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

export function UptimeBar({ pings }: UptimeBarProps) {
  const [hoveredBucket, setHoveredBucket] = useState<DayBucket | null>(null);
  
  const buckets = bucketByDay(pings);
  
  const totalPings = pings.length;
  const upPings = pings.filter(p => p.is_up).length;
  const overallUptime = totalPings === 0 ? null : ((upPings / totalPings) * 100).toFixed(1);

  const getBucketColor = (bucket: DayBucket) => {
    if (!bucket.hasData) return 'rgba(255, 255, 255, 0.14)';
    if (bucket.hasAnyDown) return '#E24B4A';
    return '#1D9E75';
  };

  const formatDateLabel = (dateStr: string) => {
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
            backgroundColor: '#121316',
            color: '#F7F0E4',
            border: '1px solid rgba(198, 161, 91, 0.28)',
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
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: '#A9A195' }}>
        <span>90 days ago</span>
        <span style={{ fontWeight: 500, color: '#F7F0E4' }}>
          {overallUptime !== null ? `${overallUptime}% uptime` : 'No data yet'}
        </span>
        <span>Today</span>
      </div>
    </div>
  );
}
