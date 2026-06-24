import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AlertChannel, AlertChannelPayload } from '../../types';
import { useAlertChannels } from '../../hooks/useAlertChannels';
import { getApiErrorMessage } from '../../api/client';
import { Toast } from '../ui/Toast';
import { CardGridSkeleton } from '../ui/Skeleton';
import { timeAgo } from '../../utils/dates';
import { AlertChannelCard } from './AlertChannelCard';
import { AlertChannelModal } from './AlertChannelModal';

export function AlertsView() {
  const { channels, deliveries, isLoading, error, create, update, remove, test } = useAlertChannels();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<AlertChannel | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<AlertChannel | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const openEdit = (channel: AlertChannel) => {
    setEditing(channel);
    setIsModalOpen(true);
  };

  const handleSave = async (payload: AlertChannelPayload) => {
    setIsSaving(true);
    try {
      if (editing) {
        await update(editing.id, payload);
        setToast('Channel updated.');
      } else {
        await create(payload);
        setToast('Channel added.');
      }
    } catch (err) {
      setToast(getApiErrorMessage(err, 'Could not save the channel.'));
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (channel: AlertChannel) => {
    try {
      await update(channel.id, { is_enabled: !channel.is_enabled });
    } catch (err) {
      setToast(getApiErrorMessage(err, 'Could not update the channel.'));
    }
  };

  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      const delivery = await test(id);
      setToast(delivery.status === 'SENT' ? 'Test sent successfully.' : `Test failed: ${delivery.error ?? 'unknown error'}`);
    } catch (err) {
      setToast(getApiErrorMessage(err, 'Could not send the test.'));
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await remove(toDelete.id);
      setToast('Channel deleted.');
    } catch (err) {
      setToast(getApiErrorMessage(err, 'Could not delete the channel.'));
    } finally {
      setToDelete(null);
    }
  };

  if (isLoading) return <CardGridSkeleton count={3} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <p style={{ color: '#6B7280', margin: 0, maxWidth: 560 }}>
          Configure where alerts go. Any of your monitors going down (or recovering) notifies every enabled channel below.
        </p>
        <button type="button" className="primary" onClick={openCreate}>
          <i className="ti ti-plus" style={{ marginRight: 6 }}></i> Add channel
        </button>
      </div>

      {error && <div className="field-error">{error}</div>}

      {channels.length === 0 ? (
        <div className="ops-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔔</div>
          <h3 style={{ margin: '0 0 6px' }}>No alert channels yet</h3>
          <p style={{ color: '#6B7280', margin: '0 0 18px' }}>
            Add an email or webhook so you know the instant something breaks.
          </p>
          <button type="button" className="primary" onClick={openCreate}>Add your first channel</button>
        </div>
      ) : (
        <section className="ops-card-grid">
          {channels.map((channel) => (
            <AlertChannelCard
              key={channel.id}
              channel={channel}
              isTesting={testingId === channel.id}
              onTest={handleTest}
              onToggle={handleToggle}
              onEdit={openEdit}
              onDelete={setToDelete}
            />
          ))}
        </section>
      )}

      {deliveries.length > 0 && (
        <div className="ops-panel">
          <div className="ops-panel-header">
            <div>
              <p className="ops-kicker">Audit log</p>
              <h3>Recent deliveries</h3>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {deliveries.slice(0, 12).map((d) => (
              <div
                key={d.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', fontSize: '0.85rem',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ color: d.status === 'SENT' ? '#1D9E75' : '#E24B4A', fontWeight: 700 }}>
                    {d.status === 'SENT' ? '✓' : '✗'}
                  </span>
                  <strong>{d.event_type}</strong>
                  <span style={{ color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.channel_name ?? 'channel'}{d.url_name ? ` · ${d.url_name}` : ''}
                    {d.status === 'FAILED' && d.error ? ` — ${d.error}` : ''}
                  </span>
                </span>
                <span style={{ color: '#9CA3AF', flexShrink: 0 }}>{timeAgo(d.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <AlertChannelModal
            channel={editing}
            isSaving={isSaving}
            onSave={handleSave}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toDelete && (
          <AlertChannelModal_DeleteConfirm
            channel={toDelete}
            onCancel={() => setToDelete(null)}
            onConfirm={handleDelete}
          />
        )}
      </AnimatePresence>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function AlertChannelModal_DeleteConfirm({
  channel,
  onCancel,
  onConfirm,
}: {
  channel: AlertChannel;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="add-url-modal-backdrop"
      role="presentation"
      onClick={onCancel}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 380, textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
        <h2 style={{ margin: '0 0 8px' }}>Delete channel?</h2>
        <p style={{ color: '#6B7280', margin: '0 0 20px' }}>
          This removes <strong>{channel.name}</strong>. Alerts will no longer be sent here.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button type="button" className="primary" style={{ background: '#E24B4A' }} onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
