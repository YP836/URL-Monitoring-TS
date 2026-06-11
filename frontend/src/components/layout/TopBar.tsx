import { StatusDot } from '../ui/StatusDot';

interface TopBarProps {
  isConnected?: boolean;
}

export function TopBar({ isConnected = false }: TopBarProps) {
  return (
    <header
      style={{
        height: 56,
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>Uptime Monitor</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
        <StatusDot status={isConnected ? 'UP' : 'PENDING'} />
        <span style={{ color: isConnected ? '#1D9E75' : '#999', fontWeight: 500 }}>
          {isConnected ? 'Live' : 'Reconnecting...'}
        </span>
      </div>
    </header>
  );
}
