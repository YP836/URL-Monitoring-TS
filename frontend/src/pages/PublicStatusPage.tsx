import { useState, useEffect } from 'react';
import { PublicStatus } from '../types';
import { getPublicStatus } from '../api/client';
import { StatusDot } from '../components/ui/StatusDot';
import { parseApiDate, timeAgo } from '../utils/dates';
import '../styles/status.css';

export function PublicStatusPage() {
  const [statusData, setStatusData] = useState<PublicStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'System Status';
    getPublicStatus()
      .then(setStatusData)
      .catch((err) => setError(err.message || 'Failed to load status'));
  }, []);

  if (error) {
    return (
      <div className="status-page-error">
        <h2>Failed to load status</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!statusData) {
    return (
      <div className="status-page-loading">
        Loading system status...
      </div>
    );
  }

  const { monitors, maintenance_windows } = statusData;
  const activeIncidents = monitors.filter(m => m.open_incident).map(m => m.open_incident!);
  
  let globalStatus = 'operational';
  let globalStatusText = 'All systems operational';
  
  if (activeIncidents.length > 0) {
    globalStatus = 'incident';
    globalStatusText = 'Incident in progress';
  } else if (maintenance_windows.length > 0) {
    globalStatus = 'maintenance';
    globalStatusText = 'Scheduled maintenance';
  }

  return (
    <div className="public-status-container">
      <header className="public-status-header">
        <h1>System Status</h1>
      </header>

      <main className="public-status-main">
        <div className={`global-status-banner status-${globalStatus}`}>
          {globalStatusText}
        </div>

        {maintenance_windows.length > 0 && (
          <div className="maintenance-section">
            <h2>Scheduled Maintenance</h2>
            {maintenance_windows.map(m => (
              <div key={m.id} className="maintenance-card">
                <h3>{m.title}</h3>
                <p>{m.message}</p>
                <div className="maintenance-times">
                  Starts: {parseApiDate(m.starts_at).toLocaleString()} | 
                  Ends: {parseApiDate(m.ends_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="monitors-list">
          {monitors.map(monitor => (
            <div key={monitor.id} className="monitor-row">
              <div className="monitor-info">
                <StatusDot status={monitor.status} />
                <span className="monitor-name">{monitor.name}</span>
              </div>
              <div className="monitor-stats">
                <span className="monitor-uptime">{monitor.uptime_90d.toFixed(2)}% uptime</span>
                <span className="monitor-checked">
                  {monitor.last_checked_at ? timeAgo(monitor.last_checked_at) : 'pending'}
                </span>
              </div>
            </div>
          ))}
          {monitors.length === 0 && (
            <div className="no-monitors">No public services configured.</div>
          )}
        </div>

        {activeIncidents.length > 0 && (
          <div className="incidents-section">
            <h2>Active Incidents</h2>
            {activeIncidents.map(incident => (
              <div key={incident.id} className="incident-card">
                <h3>{incident.url_name} - Issue detected</h3>
                <p>Started {timeAgo(incident.started_at)}</p>
                {incident.note && <p className="incident-note">{incident.note}</p>}
              </div>
            ))}
          </div>
        )}
      </main>
      <footer className="public-status-footer">
        Powered by Uptime Monitor
      </footer>
    </div>
  );
}
