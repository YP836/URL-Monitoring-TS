import { useState, FormEvent, useEffect } from 'react';
import { getApiErrorMessage, updateUrl } from '../../api/client';
import { URLItem } from '../../types';
import { IntervalInput, UnitType, convertToSeconds, parseSeconds } from './IntervalInput';

interface EditUrlModalProps {
  url: URLItem | null;
  onClose: () => void;
  onSuccess: (updatedUrl: URLItem) => void;
}

export function EditUrlModal({ url, onClose, onSuccess }: EditUrlModalProps) {
  const [name, setName] = useState('');
  const [webAddress, setWebAddress] = useState('');
  const [intervalValue, setIntervalValue] = useState('30');
  const [intervalUnit, setIntervalUnit] = useState<UnitType>('minutes');
  const [intervalError, setIntervalError] = useState<string | null>(null);
  const [touchedInterval, setTouchedInterval] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (url) {
      setName(url.name);
      setWebAddress(url.web_address);
      const parsed = parseSeconds(url.ping_interval_seconds || 30);
      setIntervalValue(parsed.value);
      setIntervalUnit(parsed.unit);
    }
  }, [url]);

  if (!url) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (intervalError) {
      setTouchedInterval(true);
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const intervalSeconds = convertToSeconds(intervalValue, intervalUnit);
      const updated = await updateUrl(url.id, {
        name: name !== url.name ? name : undefined,
        web_address: webAddress !== url.web_address ? webAddress : undefined,
        ping_interval_seconds: intervalSeconds !== url.ping_interval_seconds ? intervalSeconds : undefined
      });
      onSuccess(updated);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update URL'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#FFFFFF', padding: 32, borderRadius: 12,
        width: '100%', maxWidth: 420, boxShadow: '0 8px 30px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: 20, color: '#111827' }}>Edit URL</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#4B5563' }}>Name</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)}
              placeholder="e.g. My Website"
              required
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#4B5563' }}>Web Address</label>
            <input 
              value={webAddress} 
              onChange={e => setWebAddress(e.target.value)}
              placeholder="https://example.com"
              type="url"
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="ping-interval-edit" style={{ fontSize: 13, fontWeight: 500, color: '#4B5563' }}>Ping interval</label>
            <IntervalInput
              id="ping-interval-edit"
              value={intervalValue}
              unit={intervalUnit}
              onChange={(v, u) => {
                setIntervalValue(v);
                setIntervalUnit(u);
              }}
              onErrorChange={setIntervalError}
              touched={touchedInterval}
              onBlur={() => setTouchedInterval(true)}
            />
          </div>

          {error && <div style={{ color: '#F56565', fontSize: 13 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
            <button 
              type="button" 
              className="outline-button" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
