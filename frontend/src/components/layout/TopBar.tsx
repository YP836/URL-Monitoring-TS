interface TopBarProps {
  isConnected: boolean;
  connectionError: string | null;
}

export function TopBar({ isConnected, connectionError }: TopBarProps) {
  const statusColor = connectionError ? '#E24B4A' : isConnected ? '#1D9E75' : '#BA7517';
  const statusText = connectionError ? 'Disconnected' : isConnected ? 'Live' : 'Reconnecting...';

  const renderStatusIcon = () => {
    if (!connectionError && !isConnected) {
      return (
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: '#FF7F50',
            display: 'inline-block',
            animation: 'spin 0.8s linear infinite',
            boxSizing: 'border-box',
          }}
        />
      );
    }

    return (
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: statusColor,
          display: 'inline-block',
        }}
      />
    );
  };

  return (
    <header className="topbar">
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
      <div className="topbar-brand">
        Uptime Monitor
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {renderStatusIcon()}
        <span style={{ color: statusColor, fontWeight: 500, fontSize: 13 }}>
          {statusText}
        </span>
        {connectionError && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginLeft: 4,
              border: '1px solid rgba(245, 101, 101, 0.35)',
              backgroundColor: 'rgba(245, 101, 101, 0.08)',
              color: '#111827',
              borderRadius: 4,
              padding: '3px 8px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        )}
      </div>
    </header>
  );
}
