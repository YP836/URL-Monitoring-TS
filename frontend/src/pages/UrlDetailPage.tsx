import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUrlDetail } from '../api/client';
import { URLDetail } from '../types';
import { TopBar } from '../components/layout/TopBar';
import { Sidebar } from '../components/layout/Sidebar';
import { Toast } from '../components/ui/Toast';
import { StatusDot } from '../components/ui/StatusDot';
import { StatsRow } from '../components/stats/StatsRow';
import { UptimeBar } from '../components/charts/UptimeBar';
import { LatencyChart } from '../components/charts/LatencyChart';

function timeAgo(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function UrlDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [url, setUrl] = useState<URLDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    
    getUrlDetail(parseInt(id, 10))
      .then(data => {
        if (mounted) {
          setUrl(data);
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message);
          setIsLoading(false);
        }
      });
      
    return () => { mounted = false; };
  }, [id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TopBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: 32, overflowY: 'auto', backgroundColor: '#fff' }}>
          <button 
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', marginBottom: 24, fontSize: 14, padding: 0 }}
          >
            &larr; Back to dashboard
          </button>

          {isLoading ? (
            <div style={{ width: '100%', height: 200, backgroundColor: '#f0f0f0', animation: 'pulse 1.5s ease-in-out infinite', borderRadius: 8 }} />
          ) : url ? (
            <>
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <StatusDot status={url.status} />
                  <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>{url.name}</h1>
                </div>
                <a href={url.web_address} target="_blank" rel="noopener noreferrer" style={{ color: '#666', fontSize: 14, textDecoration: 'none' }}>
                  {url.web_address}
                </a>
              </div>

              <StatsRow pings={url.recent_pings} />

              <div style={{ marginBottom: 40 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Uptime &mdash; last 90 days</h2>
                <UptimeBar pings={url.recent_pings} />
              </div>

              <div style={{ marginBottom: 40 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Response time &mdash; last 50 pings</h2>
                <LatencyChart pings={url.recent_pings} />
              </div>

              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Recent checks</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e0e0e0', textAlign: 'left' }}>
                      <th style={{ padding: '12px 8px', fontWeight: 'bold' }}>Time</th>
                      <th style={{ padding: '12px 8px', fontWeight: 'bold' }}>Status</th>
                      <th style={{ padding: '12px 8px', fontWeight: 'bold' }}>Latency</th>
                      <th style={{ padding: '12px 8px', fontWeight: 'bold' }}>HTTP Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {url.recent_pings.slice(0, 20).map((ping, i) => (
                      <tr key={ping.id} style={{ backgroundColor: i % 2 === 0 ? '#f8f8f6' : '#fff' }}>
                        <td style={{ padding: '12px 8px' }}>{timeAgo(ping.checked_at)}</td>
                        <td style={{ padding: '12px 8px', color: ping.is_up ? '#1D9E75' : '#E24B4A', fontWeight: 500 }}>
                          {ping.is_up ? 'UP' : 'DOWN'}
                        </td>
                        <td style={{ padding: '12px 8px' }}>{ping.response_time_ms !== null ? `${ping.response_time_ms}ms` : '—'}</td>
                        <td style={{ padding: '12px 8px' }}>{ping.status_code || '—'}</td>
                      </tr>
                    ))}
                    {url.recent_pings.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: '24px 8px', textAlign: 'center', color: '#999' }}>No checks yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ color: '#999' }}>Failed to load URL details</div>
          )}

          {error && <Toast message={error} onDismiss={() => setError(null)} />}
        </main>
      </div>
    </div>
  );
}
