import { useState, FormEvent, useEffect, ClipboardEvent } from 'react';
import { AddURLPayload, CheckType } from '../../types';
import { SignalSelector } from './SignalSelector';

interface AddUrlFormProps {
  onAdd: (payload: AddURLPayload) => Promise<void> | void;
  isLoading: boolean;
}

export function AddUrlForm({ onAdd, isLoading }: AddUrlFormProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedSignals, setSelectedSignals] = useState<CheckType[]>(['HTTP']);
  const [keyword, setKeyword] = useState('');
  const [checkInterval, setCheckInterval] = useState(60);
  const [showSignalOptions, setShowSignalOptions] = useState(false);
  const [touchedName, setTouchedName] = useState(false);
  const [touchedUrl, setTouchedUrl] = useState(false);
  const [touchedKeyword, setTouchedKeyword] = useState(false);
  const [wasAdded, setWasAdded] = useState(false);
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

    if (!showSignalOptions) {
      setShowSignalOptions(true);
      return;
    }

    setTouchedKeyword(true);
    const isValidKeyword = !selectedSignals.includes('KEYWORD') || Boolean(keyword.trim());
    if (!isValidKeyword) setKeywordError('Keyword is required');
    if (!isValidKeyword) return;

    try {
      await onAdd({
        name: name.trim(),
        web_address: url.trim(),
        check_type: selectedSignals.join(','),
        keyword_to_find: selectedSignals.includes('KEYWORD') ? keyword.trim() : undefined,
        check_interval_seconds: checkInterval,
      });
    } catch {
      return;
    }

    setName('');
    setUrl('');
    setKeyword('');
    setSelectedSignals(['HTTP']);
    setCheckInterval(60);
    setShowSignalOptions(false);
    setTouchedName(false);
    setTouchedUrl(false);
    setTouchedKeyword(false);
    setWasAdded(true);
    window.setTimeout(() => setWasAdded(false), 2000);
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

  const hasErrors = nameError !== null || urlError !== null || keywordError !== null;

  return (
    <form className="monitor-form" onSubmit={handleSubmit}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="site-name">Site name</label>
        <input
          id="site-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouchedName(true)}
          placeholder="My Website"
        />
        {nameError && touchedName && <div className="field-error">{nameError}</div>}
      </div>

      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="site-url">URL</label>
        <input
          id="site-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => setTouchedUrl(true)}
          onPaste={handleUrlPaste}
          placeholder="https://example.com"
        />
        {urlError && touchedUrl && <div className="field-error">{urlError}</div>}
      </div>

      <div style={{ marginTop: 24 }}>
        <button
          type="submit"
          disabled={isLoading || hasErrors}
          className="primary"
          style={{ color: wasAdded ? '#D8F8EA' : undefined, backgroundColor: wasAdded ? '#1D9E75' : undefined }}
        >
          {wasAdded ? 'Added' : isLoading ? 'Adding...' : showSignalOptions ? 'Save monitor' : 'Start monitoring'}
        </button>
      </div>

      {showSignalOptions && (
        <div className="monitor-options-panel">
          <div>
            <p className="landing-kicker">Choose signal checks</p>
            <h2>What should this monitor check?</h2>
            <p>Select one or many. Only the selected checks will run in the background.</p>
          </div>

          <SignalSelector selectedSignals={selectedSignals} onChange={setSelectedSignals} />

          {selectedSignals.includes('KEYWORD') && (
            <div className="keyword-field">
              <label htmlFor="keyword-to-find">Keyword to find</label>
              <input
                id="keyword-to-find"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onBlur={() => setTouchedKeyword(true)}
                placeholder='e.g. "Add to cart"'
                required
              />
              {keywordError && touchedKeyword && <div className="field-error">{keywordError}</div>}
            </div>
          )}

          <div className="keyword-field" style={{ marginTop: 16 }}>
            <label htmlFor="check-interval">Ping frequency</label>
            <select
              id="check-interval"
              value={checkInterval}
              onChange={(e) => setCheckInterval(Number(e.target.value))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(0,0,0,0.1)',
                background: '#FFFFFF',
                color: '#111827',
                fontSize: '0.875rem'
              }}
            >
              <option value={30}>Every 30 seconds</option>
              <option value={60}>Every 1 minute</option>
              <option value={300}>Every 5 minutes</option>
              <option value={1800}>Every 30 minutes</option>
              <option value={3600}>Every 1 hour</option>
              <option value={86400}>Every 1 day</option>
              <option value={259200}>Every 3 days</option>
            </select>
          </div>
        </div>
      )}
    </form>
  );
}
