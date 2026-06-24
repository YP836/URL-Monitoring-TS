import { useState } from 'react';
import { motion } from 'framer-motion';
import { createMaintenanceWindow } from '../../api/client';
import modalStyles from '../urls/UrlCard.module.css';
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
      className={modalStyles.modalOverlay}
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={modalStyles.addUrlDialog}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
      >
        <h2 style={{ marginTop: 0 }}>Schedule Maintenance</h2>
        <p style={{ color: '#667085', fontSize: '0.9rem', marginBottom: 20 }}>
          {urlName ? `For ${urlName}.` : 'Select monitors to schedule downtime.'} This will display on the public status page.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!urlId && urls.length > 0 && (
            <label className={modalStyles.formGroup}>
              <span>Affected Monitors *</span>
              <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #d1d5db', borderRadius: 6, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {urls.map(u => (
                  <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', cursor: 'pointer', fontWeight: 'normal' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedUrlIds.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedUrlIds([...selectedUrlIds, u.id]);
                        else setSelectedUrlIds(selectedUrlIds.filter(id => id !== u.id));
                      }}
                    />
                    {u.name}
                  </label>
                ))}
              </div>
            </label>
          )}
          <label className={modalStyles.formGroup}>
            <span>Title *</span>
            <input 
              type="text" 
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Database Upgrade"
            />
          </label>
          <label className={modalStyles.formGroup}>
            <span>Message</span>
            <textarea 
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Describe the maintenance..."
              style={{ padding: 10, borderRadius: 6, border: '1px solid #d1d5db', minHeight: 60 }}
            />
          </label>
          <label className={modalStyles.formGroup}>
            <span>Starts at *</span>
            <input 
              type="datetime-local" 
              required
              value={startsAt}
              onChange={e => setStartsAt(e.target.value)}
            />
          </label>
          <label className={modalStyles.formGroup}>
            <span>Ends at *</span>
            <input 
              type="datetime-local" 
              required
              value={endsAt}
              onChange={e => setEndsAt(e.target.value)}
            />
          </label>
          
          <div className={modalStyles.dialogActions} style={{ marginTop: 8 }}>
            <button type="button" className={modalStyles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className={modalStyles.primaryBtn} disabled={isSubmitting}>
              {isSubmitting ? 'Scheduling...' : 'Schedule'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
    {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
