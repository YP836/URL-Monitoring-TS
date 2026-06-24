import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createMaintenanceWindow } from '../../api/client';
import { Toast } from '../ui/Toast';

interface MaintenanceModalProps {
  urlId?: number;
  urlName?: string;
  urls?: { id: number; name: string }[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function MaintenanceModal({ urlId, urlName, urls = [], onClose, onSuccess }: MaintenanceModalProps) {
  const [selectedUrlIds, setSelectedUrlIds] = useState<number[]>(urlId ? [urlId] : []);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUrlIds.length === 0) {
      setToast('Please select at least one monitor');
      return;
    }
    if (!title || !startsAt || !endsAt) {
      setToast('Please fill in required fields');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await createMaintenanceWindow({
        url_ids: selectedUrlIds,
        title,
        message,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString()
      });
      setToast('Maintenance window scheduled');
      if (onSuccess) onSuccess();
      setTimeout(onClose, 1500);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Failed to schedule');
      setIsSubmitting(false);
    }
  };

  return (
    <>
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
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="add-url-modal-header">
            <div>
              <p className="landing-kicker modal-kicker"><i className="ti ti-calendar-event"></i> MAINTENANCE</p>
              <h2>Schedule downtime</h2>
              <p className="modal-subtitle">
                {urlName ? `For ${urlName}.` : 'Select monitors to schedule downtime.'} This will display on the public status page.
              </p>
            </div>
            <button type="button" className="add-url-modal-close" onClick={onClose} aria-label="Close modal">
              x
            </button>
          </div>

          <form className="monitor-form step-modal-form" onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 4px 20px' }}>
              {!urlId && urls.length > 0 && (
                <div className="monitor-field">
                  <label>Affected Monitors <span className="req">*</span></label>
                  <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--card-bg)' }}>
                    {urls.map(u => (
                      <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer', color: 'var(--text-main)' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedUrlIds.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedUrlIds([...selectedUrlIds, u.id]);
                            else setSelectedUrlIds(selectedUrlIds.filter(id => id !== u.id));
                          }}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                        />
                        {u.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="monitor-field">
                <label>Title <span className="req">*</span></label>
                <div className="input-with-icon">
                  <i className="ti ti-heading"></i>
                  <input 
                    type="text" 
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Database Upgrade"
                  />
                </div>
              </div>

              <div className="monitor-field">
                <label>Message</label>
                <div className="input-with-icon" style={{ alignItems: 'flex-start' }}>
                  <i className="ti ti-message" style={{ marginTop: '12px' }}></i>
                  <textarea 
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Describe the maintenance..."
                    style={{ width: '100%', minHeight: '80px', padding: '12px 12px 12px 42px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '0.95rem', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="monitor-field" style={{ flex: 1 }}>
                  <label>Starts at <span className="req">*</span></label>
                  <div className="input-with-icon">
                    <i className="ti ti-clock"></i>
                    <input 
                      type="datetime-local" 
                      required
                      value={startsAt}
                      onChange={e => setStartsAt(e.target.value)}
                      style={{ paddingLeft: '42px' }}
                    />
                  </div>
                </div>

                <div className="monitor-field" style={{ flex: 1 }}>
                  <label>Ends at <span className="req">*</span></label>
                  <div className="input-with-icon">
                    <i className="ti ti-clock-stop"></i>
                    <input 
                      type="datetime-local" 
                      required
                      value={endsAt}
                      onChange={e => setEndsAt(e.target.value)}
                      style={{ paddingLeft: '42px' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="step-modal-footer">
              <button type="button" className="cancel-btn" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="primary save-monitor-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Scheduling...' : 'Schedule downtime'} <i className="ti ti-calendar-event"></i>
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
