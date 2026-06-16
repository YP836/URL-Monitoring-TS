import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { PingHistoryRead } from '../../types';

interface MiniLatencyChartProps {
  pings?: PingHistoryRead[];
}

export function MiniLatencyChart({ pings = [] }: MiniLatencyChartProps) {
  if (pings.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', borderRadius: 4, color: '#9CA3AF', fontSize: 10 }}>
        No Data
      </div>
    );
  }

  // Take last 15 and reverse to chronological order (oldest left, newest right)
  const data = [...pings].slice(0, 15).reverse().map(ping => {
    const d = new Date(ping.checked_at);
    return {
      timeLabel: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
      latency: ping.response_time_ms, // null if timeout
      isUp: ping.is_up,
      status: ping.is_up ? 'UP' : 'DOWN',
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const point = payload[0].payload;
      const latencyText = point.latency !== null ? `${point.latency}ms` : 'timeout';
      return (
        <div style={{ backgroundColor: '#111827', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 10, pointerEvents: 'none' }}>
          {point.timeLabel} • {latencyText}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
        <defs>
          <linearGradient id="colorLatencyMini" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <XAxis dataKey="timeLabel" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} minTickGap={10} />
        <YAxis dataKey="latency" domain={[0, 'auto']} tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickCount={3} />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 1 }} />
        <Area 
          type="monotone" 
          dataKey="latency" 
          stroke="#1D9E75" 
          strokeWidth={1.5} 
          fillOpacity={1} 
          fill="url(#colorLatencyMini)"
          dot={false} 
          isAnimationActive={false}
          connectNulls={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
