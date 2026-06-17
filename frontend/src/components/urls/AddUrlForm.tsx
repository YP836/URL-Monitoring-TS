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
  const [intervalValue, setIntervalValue] = useState(30);
  const [intervalUnit, setIntervalUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');
  const [selectedSignals, setSelectedSignals] = useState<CheckType[]>(['HTTP']);
  const [keyword, setKeyword] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
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

    if (!hasStarted) {
      setHasStarted(true);
      return;
    }

    setTouchedName(true);
    setTouchedUrl(true);

    const isValidUrl = /^https?:\/\/.+\..+/.test(url);
    if (!name.trim() || name.length > 100 || !isValidUrl) return;

    setTouchedKeyword(true);
    const isValidKeyword = !selectedSignals.includes('KEYWORD') || Boolean(keyword.trim());
    if (!isValidKeyword) setKeywordError('Keyword is required');
    if (!isValidKeyword) return;

    const intervalMultiplier = intervalUnit === 'days' ? 86400 : intervalUnit === 'hours' ? 3600 : 60;
    const intervalSeconds = Math.max(60, Math.floor(intervalValue) * intervalMultiplier);

    try {
      await onAdd({
        name: name.trim(),
        web_address: url.trim(),
        check_type: selectedSignals.join(','),
        keyword_to_find: selectedSignals.includes('KEYWORD') ? keyword.trim() : undefined,
        check_interval_seconds: intervalSeconds,
        ping_interval_seconds: intervalSeconds,
      });
    } catch {
      return;
    }

    setName('');
    setUrl('');
    setKeyword('');
    setIntervalValue(30);
    setIntervalUnit('minutes');
    setSelectedSignals(['HTTP']);
    setHasStarted(false);
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
  const isBasicValid = Boolean(name.trim()) && name.length <= 100 && /^https?:\/\/.+\..+/.test(url);
  const showAdvancedOptions = hasStarted && isBasicValid;

  return (
    <form
      className={`monitor-form${hasStarted ? ' expanded' : ' collapsed'}${showAdvancedOptions ? ' advanced' : ' basic'}`}
      onSubmit={handleSubmit}
    >
      {!hasStarted && (
        <div className="monitor-start-panel">
          <p className="landing-kicker">Command center</p>
          <h2>Start a precision monitor</h2>
          <p>Add the URL, choose only the signals you need, and set the exact check frequency.</p>
        </div>
      )}

      {!hasStarted && (
        <button
          type="submit"
          disabled={isLoading}
          className="primary start-monitor-button"
        >
          {wasAdded ? 'Added' : isLoading ? 'Opening...' : 'Start monitoring'}
        </button>
      )}

      {hasStarted && (
        <>
          <div className="monitor-field site-name-field">
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

          <div className="monitor-field site-url-field">
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

          <div className="monitor-submit-slot">
            <button type="submit" disabled={isLoading || hasErrors} className="primary">
              {wasAdded ? 'Added' : isLoading ? 'Adding...' : showAdvancedOptions ? 'Save monitor' : 'Continue'}
            </button>
          </div>
        </>
      )}

      {showAdvancedOptions && (
        <div className="monitor-options-panel">
          <div>
            <p className="landing-kicker">Choose signal checks</p>
            <h2>What should this monitor check?</h2>
            <p>Select one or many. Only the selected checks will run in the background.</p>
          </div>

          <SignalSelector selectedSignals={selectedSignals} onChange={setSelectedSignals} />

          <div className="interval-builder">
            <label htmlFor="ping-interval-value">Check frequency</label>
            <div className="interval-control">
              <input
                id="ping-interval-value"
                type="number"
                min={1}
                value={intervalValue}
                onChange={(e) => setIntervalValue(Math.max(1, Number(e.target.value) || 1))}
              />
              <div className="interval-unit-group" aria-label="Interval unit">
                {(['minutes', 'hours', 'days'] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    className={intervalUnit === unit ? 'selected' : ''}
                    onClick={() => setIntervalUnit(unit)}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>
          </div>

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
        </div>
      )}
    </form>
  );
}
