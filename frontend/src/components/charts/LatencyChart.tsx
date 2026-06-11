import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { PingHistoryRead } from '../../types';

interface LatencyChartProps {
  pings: PingHistoryRead[];
  height?: number;
}

export function LatencyChart({ pings, height = 180 }: LatencyChartProps) {
  if (pings.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
        No ping history yet
      </div>
    );
  }

  // Take last 50 and reverse to chronological order (oldest left, newest right)
  const data = [...pings].slice(0, 50).reverse().map(ping => {
    const d = new Date(ping.checked_at);
    return {
      timeLabel: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
      latency: ping.response_time_ms, // null if timeout
      isUp: ping.is_up,
      status: ping.is_up ? 'UP' : 'DOWN',
      fullDate: ping.checked_at,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const point = payload[0].payload;
      const latencyText = point.latency !== null ? `${point.latency}ms` : 'timeout';
      return (
        <div style={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: 8, padding: 10 }}>
          {point.timeLabel} &middot; {latencyText} &middot; {point.status}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="timeLabel" tick={{ fontSize: 12, fill: '#666' }} axisLine={false} tickLine={false} />
          <YAxis dataKey="latency" domain={[0, 'auto']} tick={{ fontSize: 12, fill: '#666' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          
          {data.map((entry, index) => 
            !entry.isUp ? (
              <ReferenceLine key={`ref-${index}`} x={entry.timeLabel} stroke="#E24B4A" strokeDasharray="3 3" />
            ) : null
          )}
          
          <Line 
            type="monotone" 
            dataKey="latency" 
            stroke="#1D9E75" 
            strokeWidth={2} 
            dot={false} 
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
