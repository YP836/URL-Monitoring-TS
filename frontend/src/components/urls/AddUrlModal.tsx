import { useState, FormEvent, useEffect, ClipboardEvent } from 'react';
import { AddURLPayload, CheckType } from '../../types';
import { SignalSelector } from './SignalSelector';
import { IntervalInput, UnitType, convertToSeconds } from './IntervalInput';

interface AddUrlModalProps {
  onAdd: (payload: AddURLPayload) => Promise<void> | void;
  isLoading: boolean;
  onClose: () => void;
}

export function AddUrlModal({ onAdd, isLoading, onClose }: AddUrlModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [intervalValue, setIntervalValue] = useState('30');
  const [intervalUnit, setIntervalUnit] = useState<UnitType>('minutes');
  const [intervalError, setIntervalError] = useState<string | null>(null);
  const [touchedInterval, setTouchedInterval] = useState(false);
  const [selectedSignals, setSelectedSignals] = useState<CheckType[]>(['HTTP']);
  const [keyword, setKeyword] = useState('');
  
  const [touchedName, setTouchedName] = useState(false);
  const [touchedUrl, setTouchedUrl] = useState(false);
  const [touchedKeyword, setTouchedKeyword] = useState(false);
  
  const [nameError, setNameError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [keywordError, setKeywordError] = useState<string | null>(null);

  useEffect(() => {
    if (!touchedName) return;
    if (!name.trim()) setNameError('Name is required');
    else if (name.length > 100) setNameError('Name must be under 100 characters');
    else setNameError(null);
  }, [name, touchedName]);

  useEffect(() => {
    if (!touchedUrl) return;
    if (!url.trim()) setUrlError('URL is required');
    else if (!/^https?:\/\/.+\..+/.test(url)) setUrlError('Must be a valid HTTP/HTTPS URL');
    else setUrlError(null);
  }, [url, touchedUrl]);

  useEffect(() => {
    if (!selectedSignals.includes('KEYWORD')) {
      setKeywordError(null);
      return;
    }
    if (!touchedKeyword) return;
    if (!keyword.trim()) setKeywordError('Keyword is required');
    else setKeywordError(null);
  }, [keyword, selectedSignals, touchedKeyword]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouchedName(true);
    setTouchedUrl(true);
    
    const isValidUrl = /^https?:\/\/.+\..+/.test(url);
    if (!name.trim() || name.length > 100 || !isValidUrl) return;

    setTouchedKeyword(true);
    const isValidKeyword = !selectedSignals.includes('KEYWORD') || Boolean(keyword.trim());
    if (!isValidKeyword) setKeywordError('Keyword is required');
    if (!isValidKeyword) return;

    if (intervalError) {
      setTouchedInterval(true);
      return;
    }

    const intervalSeconds = convertToSeconds(intervalValue, intervalUnit);

    try {
      await onAdd({
        name: name.trim(),
        web_address: url.trim(),
        check_type: selectedSignals.join(','),
        keyword_to_find: selectedSignals.includes('KEYWORD') ? keyword.trim() : undefined,
        check_interval_seconds: intervalSeconds,
        ping_interval_seconds: intervalSeconds,
      });
      onClose(); // close on success
    } catch {
      return;
    }
  };

  const handleUrlPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pastedText = event.clipboardData.getData('text').trim();
    if (name.trim() || !/^https?:\/\//.test(pastedText)) return;
    try {
      setName(new URL(pastedText).hostname);
    } catch {
      return;
    }
  };

  const hasErrors = nameError !== null || urlError !== null || keywordError !== null || intervalError !== null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#FFFFFF', padding: 32, borderRadius: 12,
        width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 30px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: 20, color: '#111827' }}>Add new monitor</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#4B5563' }}>Site name</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)}
              onBlur={() => setTouchedName(true)}
              placeholder="e.g. My Website"
              required
              style={{
                padding: '10px 14px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)',
                backgroundColor: '#FCFCFC', fontSize: 15, outline: 'none'
              }}
            />
            {nameError && touchedName && <div style={{ color: '#F56565', fontSize: 13 }}>{nameError}</div>}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#4B5563' }}>URL</label>
            <input 
              value={url} 
              onChange={e => setUrl(e.target.value)}
              onBlur={() => setTouchedUrl(true)}
              onPaste={handleUrlPaste}
              placeholder="https://example.com"
              type="url"
              required
              style={{
                padding: '10px 14px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)',
                backgroundColor: '#FCFCFC', fontSize: 15, outline: 'none'
              }}
            />
            {urlError && touchedUrl && <div style={{ color: '#F56565', fontSize: 13 }}>{urlError}</div>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>What should this monitor check?</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>Select one or many signals to track in the background.</div>
            </div>
            <SignalSelector selectedSignals={selectedSignals} onChange={setSelectedSignals} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#4B5563' }}>Check frequency</label>
            <IntervalInput
              id="ping-interval-add"
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

          {selectedSignals.includes('KEYWORD') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#4B5563' }}>Keyword to find</label>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onBlur={() => setTouchedKeyword(true)}
                placeholder='e.g. "Add to cart"'
                required
                style={{
                  padding: '10px 14px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)',
                  backgroundColor: '#FCFCFC', fontSize: 15, outline: 'none'
                }}
              />
              {keywordError && touchedKeyword && <div style={{ color: '#F56565', fontSize: 13 }}>{keywordError}</div>}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
            <button 
              type="button" 
              className="outline-button" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="primary"
              disabled={isLoading || hasErrors}
            >
              {isLoading ? 'Saving...' : 'Start monitoring'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
