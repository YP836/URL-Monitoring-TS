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
    <header
      style={{
        height: 56,
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        justifyContent: 'space-between',
        color: '#111827',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
      }}
    >
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
      <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '1.25rem', letterSpacing: 0 }}>
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
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
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
