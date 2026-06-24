import { AlertChannel } from '../../types';
import { timeAgo } from '../../utils/dates';

interface AlertChannelCardProps {
  channel: AlertChannel;
  isTesting: boolean;
  onTest: (id: number) => void;
  onToggle: (channel: AlertChannel) => void;
  onEdit: (channel: AlertChannel) => void;
  onDelete: (channel: AlertChannel) => void;
}

function maskDestination(channel: AlertChannel): string {
  if (channel.channel_type === 'EMAIL') return channel.destination;
  try {
    const url = new URL(channel.destination);
    return `${url.host}/…`;
  } catch {
    return channel.destination;
  }
}

export function AlertChannelCard({ channel, isTesting, onTest, onToggle, onEdit, onDelete }: AlertChannelCardProps) {
  const icon = channel.channel_type === 'EMAIL' ? 'ti-mail' : 'ti-webhook';

  return (
    <div
      className="ops-panel"
      style={{ opacity: channel.is_enabled ? 1 : 0.6, display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: 'rgba(255,127,80,0.12)', color: '#FF7F50',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}
          >
            <i className={`ti ${icon}`}></i>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>{channel.name}</div>
            <div style={{ color: '#6B7280', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {maskDestination(channel)}
            </div>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={channel.is_enabled}
          aria-label={channel.is_enabled ? 'Disable channel' : 'Enable channel'}
          onClick={() => onToggle(channel)}
          style={{
            width: 42, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
            background: channel.is_enabled ? '#1D9E75' : '#D1D5DB', position: 'relative', transition: 'background 0.2s',
          }}
        >
          <span
            style={{
              position: 'absolute', top: 2, left: channel.is_enabled ? 20 : 2,
              width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
            }}
          />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {channel.notify_on_down && (
          <span className="ops-pill" style={{ background: 'rgba(226,75,74,0.1)', color: '#E24B4A', padding: '2px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}>
            On DOWN
          </span>
        )}
        {channel.notify_on_recovery && (
          <span className="ops-pill" style={{ background: 'rgba(29,158,117,0.1)', color: '#1D9E75', padding: '2px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}>
            On recovery
          </span>
        )}
      </div>

      {channel.last_delivery_at && (
        <div style={{ fontSize: '0.8rem', color: channel.last_delivery_status === 'SENT' ? '#1D9E75' : '#E24B4A' }}>
          {channel.last_delivery_status === 'SENT' ? '✓ Last sent ' : '✗ Last attempt failed '}
          {timeAgo(channel.last_delivery_at)}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <button type="button" className="cancel-btn" disabled={isTesting} onClick={() => onTest(channel.id)} style={{ flex: 1 }}>
          {isTesting ? 'Sending…' : 'Send test'}
        </button>
        <button type="button" className="cancel-btn" onClick={() => onEdit(channel)} aria-label="Edit channel">
          <i className="ti ti-pencil"></i>
        </button>
        <button
          type="button"
          className="cancel-btn"
          onClick={() => onDelete(channel)}
          aria-label="Delete channel"
          style={{ color: '#E24B4A' }}
        >
          <i className="ti ti-trash"></i>
        </button>
      </div>
    </div>
  );
}
