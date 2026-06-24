import { useState, FormEvent, useEffect, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { AlertChannel, AlertChannelPayload, AlertChannelType } from '../../types';

interface AlertChannelModalProps {
  channel?: AlertChannel | null;
  isSaving: boolean;
  onSave: (payload: AlertChannelPayload) => Promise<void> | void;
  onClose: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/;

export function AlertChannelModal({ channel, isSaving, onSave, onClose }: AlertChannelModalProps) {
  const isEdit = Boolean(channel);
  const [channelType, setChannelType] = useState<AlertChannelType>(channel?.channel_type ?? 'EMAIL');
  const [name, setName] = useState(channel?.name ?? '');
  const [destination, setDestination] = useState(channel?.destination ?? '');
  const [notifyOnDown, setNotifyOnDown] = useState(channel?.notify_on_down ?? true);
  const [notifyOnRecovery, setNotifyOnRecovery] = useState(channel?.notify_on_recovery ?? true);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const destinationValid =
    channelType === 'EMAIL' ? EMAIL_RE.test(destination.trim()) : URL_RE.test(destination.trim());
  const nameValid = name.trim().length > 0 && name.trim().length <= 100;
  const isValid = nameValid && destinationValid;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    try {
      await onSave({
        channel_type: channelType,
        name: name.trim(),
        destination: destination.trim(),
        notify_on_down: notifyOnDown,
        notify_on_recovery: notifyOnRecovery,
      });
      onClose();
    } catch {
      // parent surfaces the error via toast
    }
  };

  return (
    <motion.div
      className="add-url-modal-backdrop"
      role="presentation"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        className="add-url-modal-panel step-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-modal-title"
        onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="add-url-modal-header">
          <div>
            <p className="landing-kicker modal-kicker">
              <i className="ti ti-bell"></i> {isEdit ? 'EDIT CHANNEL' : 'NEW CHANNEL'}
            </p>
            <h2 id="alert-modal-title">{isEdit ? 'Edit alert channel' : 'Add alert channel'}</h2>
            <p className="modal-subtitle">Get notified the moment one of your monitors goes down or recovers.</p>
          </div>
          <button type="button" className="add-url-modal-close" onClick={onClose} aria-label="Close">
            x
          </button>
        </div>

        <form className="monitor-form step-modal-form" onSubmit={handleSubmit}>
          <div className="modal-section">
            <div className="modal-section-header">
              <div className="step-badge">1</div>
              <h3>Channel type</h3>
            </div>
            <div className="modal-section-body">
              <div style={{ display: 'flex', gap: 12 }}>
                {(['EMAIL', 'WEBHOOK'] as AlertChannelType[]).map((type) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setChannelType(type)}
                    aria-pressed={channelType === type}
                    style={{
                      flex: 1,
                      padding: '14px 16px',
                      borderRadius: 12,
                      border: `2px solid ${channelType === type ? '#FF7F50' : 'rgba(0,0,0,0.1)'}`,
                      background: channelType === type ? 'rgba(255,127,80,0.08)' : '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: 600,
                    }}
                  >
                    <i className={`ti ${type === 'EMAIL' ? 'ti-mail' : 'ti-webhook'}`} style={{ marginRight: 8 }}></i>
                    {type === 'EMAIL' ? 'Email' : 'Webhook'}
                    <small style={{ display: 'block', fontWeight: 400, color: '#6B7280', marginTop: 4 }}>
                      {type === 'EMAIL' ? 'Send to an inbox' : 'Discord, Slack, or generic JSON'}
                    </small>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-section">
            <div className="modal-section-header">
              <div className="step-badge">2</div>
              <h3>Details</h3>
            </div>
            <div className="modal-section-body inputs-row">
              <div className="monitor-field site-name-field">
                <label htmlFor="channel-name">Label <span className="req">*</span></label>
                <div className="input-with-icon">
                  <i className="ti ti-tag"></i>
                  <input
                    id="channel-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={channelType === 'EMAIL' ? 'My inbox' : 'Ops Discord'}
                  />
                </div>
                {touched && !nameValid && <div className="field-error">A label is required.</div>}
              </div>

              <div className="monitor-field site-url-field">
                <label htmlFor="channel-destination">
                  {channelType === 'EMAIL' ? 'Email address' : 'Webhook URL'} <span className="req">*</span>
                </label>
                <div className="input-with-icon">
                  <i className={`ti ${channelType === 'EMAIL' ? 'ti-at' : 'ti-link'}`}></i>
                  <input
                    id="channel-destination"
                    type={channelType === 'EMAIL' ? 'email' : 'url'}
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder={channelType === 'EMAIL' ? 'you@example.com' : 'https://discord.com/api/webhooks/...'}
                  />
                </div>
                {touched && !destinationValid && (
                  <div className="field-error">
                    {channelType === 'EMAIL' ? 'Enter a valid email address.' : 'Enter a valid http(s) URL.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modal-section">
            <div className="modal-section-header">
              <div className="step-badge">3</div>
              <h3>When to notify</h3>
            </div>
            <div className="modal-section-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={notifyOnDown} onChange={(e) => setNotifyOnDown(e.target.checked)} />
                <span>Notify when a monitor goes <strong>DOWN</strong></span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={notifyOnRecovery} onChange={(e) => setNotifyOnRecovery(e.target.checked)} />
                <span>Notify when a monitor <strong>recovers</strong></span>
              </label>
            </div>
          </div>

          <div className="step-modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={isSaving} className="primary save-monitor-btn">
              {isSaving ? 'Saving...' : isEdit ? 'Save changes' : 'Add channel'} <i className="ti ti-arrow-right"></i>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
