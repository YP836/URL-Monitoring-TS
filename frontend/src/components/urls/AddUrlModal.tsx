import { useState, FormEvent, useEffect, ClipboardEvent, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const isBasicValid = Boolean(name.trim()) && name.length <= 100 && /^https?:\/\/.+\..+/.test(url);
  const hasErrors = nameError !== null || urlError !== null || keywordError !== null || intervalError !== null;

  const resetForm = () => {
    setName('');
    setUrl('');
    setKeyword('');
    setIntervalValue('30');
    setIntervalUnit('minutes');
    setIntervalError(null);
    setTouchedInterval(false);
    setSelectedSignals(['HTTP']);
    setTouchedName(false);
    setTouchedUrl(false);
    setTouchedKeyword(false);
    setNameError(null);
    setUrlError(null);
    setKeywordError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouchedName(true);
    setTouchedUrl(true);

    if (!isBasicValid) return;

    setTouchedKeyword(true);
    const isValidKeyword = !selectedSignals.includes('KEYWORD') || Boolean(keyword.trim());
    if (!isValidKeyword) {
      setKeywordError('Keyword is required');
      return;
    }

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
      handleClose();
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

  const intervalSeconds = convertToSeconds(intervalValue, intervalUnit);
  const estimatedChecks = Math.round(2592000 / intervalSeconds).toLocaleString();

  const handlePreset = (val: string, unit: UnitType) => {
    setIntervalValue(val);
    setIntervalUnit(unit);
  };

  return (
    <motion.div
      className="add-url-modal-backdrop"
      role="presentation"
      onClick={handleClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        className="add-url-modal-panel step-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-url-modal-title"
        onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="add-url-modal-header">
          <div>
            <p className="landing-kicker modal-kicker"><i className="ti ti-device-desktop"></i> NEW MONITOR</p>
            <h2 id="add-url-modal-title">Add monitor</h2>
            <p className="modal-subtitle">Monitor your website or service for uptime, performance, and issues.</p>
          </div>
          <button type="button" className="add-url-modal-close" onClick={handleClose} aria-label="Close add monitor modal">
            x
          </button>
        </div>

        <form className="monitor-form step-modal-form" onSubmit={handleSubmit}>
          
          {/* SECTION 1 */}
          <div className="modal-section">
            <div className="modal-section-header">
              <div className="step-badge">1</div>
              <h3>Monitor details</h3>
            </div>
            <div className="modal-section-body inputs-row">
              <div className="monitor-field site-name-field">
                <label htmlFor="site-name">Monitor name <span className="req">*</span></label>
                <div className="input-with-icon">
                  <i className="ti ti-device-desktop"></i>
                  <input
                    id="site-name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    onBlur={() => setTouchedName(true)}
                    placeholder="google.com"
                  />
                </div>
                <div className="field-hint">Give your monitor a descriptive name.</div>
                {nameError && touchedName && <div className="field-error">{nameError}</div>}
              </div>

              <div className="monitor-field site-url-field">
                <label htmlFor="site-url">URL <span className="req">*</span></label>
                <div className="input-with-icon">
                  <i className="ti ti-link"></i>
                  <input
                    id="site-url"
                    type="url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    onBlur={() => setTouchedUrl(true)}
                    onPaste={handleUrlPaste}
                    placeholder="https://google.com"
                  />
                </div>
                <div className="field-hint">Enter the full URL including http:// or https://</div>
                {urlError && touchedUrl && <div className="field-error">{urlError}</div>}
              </div>
            </div>
          </div>

          {/* SECTION 2 */}
          <div className="modal-section">
            <div className="modal-section-header">
              <div className="step-badge">2</div>
              <h3>Monitoring checks</h3>
            </div>
            <div className="modal-section-body">
              <p className="section-desc">Select one or more checks. Only the selected checks will run in the background.</p>

              <SignalSelector selectedSignals={selectedSignals} onChange={setSelectedSignals} />

              <AnimatePresence>
                {selectedSignals.includes('KEYWORD') && (
                  <motion.div
                    className="keyword-field"
                    key="keyword-field"
                    layout
                    initial={{ opacity: 0, y: 14, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label htmlFor="keyword-to-find">Keyword to find <span className="req">*</span></label>
                    <div className="input-with-icon">
                      <i className="ti ti-search"></i>
                      <input
                        id="keyword-to-find"
                        type="text"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        onBlur={() => setTouchedKeyword(true)}
                        placeholder='e.g. "Add to cart"'
                        required
                      />
                    </div>
                    {keywordError && touchedKeyword && <div className="field-error">{keywordError}</div>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* SECTION 3 */}
          <div className="modal-section">
            <div className="modal-section-header">
              <div className="step-badge">3</div>
              <h3>Check frequency</h3>
            </div>
            <div className="modal-section-body frequency-body">
              <div className="frequency-controls">
                <div className="freq-dropdowns">
                  <label>Check every</label>
                  <IntervalInput
                    id="ping-interval-add"
                    value={intervalValue}
                    unit={intervalUnit}
                    onChange={(nextValue, nextUnit) => {
                      setIntervalValue(nextValue);
                      setIntervalUnit(nextUnit);
                    }}
                    onErrorChange={setIntervalError}
                    touched={touchedInterval}
                    onBlur={() => setTouchedInterval(true)}
                  />
                </div>
                <div className="freq-presets">
                  <label>Quick presets</label>
                  <div className="preset-buttons">
                    <button type="button" className={`preset-btn ${intervalValue === '1' && intervalUnit === 'minutes' ? 'active' : ''}`} onClick={() => handlePreset('1', 'minutes')}>1 min</button>
                    <button type="button" className={`preset-btn ${intervalValue === '5' && intervalUnit === 'minutes' ? 'active' : ''}`} onClick={() => handlePreset('5', 'minutes')}>5 min</button>
                    <button type="button" className={`preset-btn ${intervalValue === '30' && intervalUnit === 'minutes' ? 'active' : ''}`} onClick={() => handlePreset('30', 'minutes')}>30 min</button>
                    <button type="button" className={`preset-btn ${intervalValue === '1' && intervalUnit === 'hours' ? 'active' : ''}`} onClick={() => handlePreset('1', 'hours')}>1 hour</button>
                    <button type="button" className="preset-btn">Custom</button>
                  </div>
                </div>
              </div>

              <div className="estimation-box">
                <i className="ti ti-info-circle"></i>
                <div className="est-text">
                  <div className="est-top">
                    <span className="est-freq">Every {intervalValue} {intervalUnit}</span>
                    <i className="ti ti-arrow-right"></i>
                    <span className="est-total">~{estimatedChecks} checks / month</span>
                  </div>
                  <small>This is an estimate based on 30 days.</small>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="step-modal-footer">
            <button type="button" className="cancel-btn" onClick={handleClose}>Cancel</button>
            <button type="submit" disabled={isLoading || hasErrors} className="primary save-monitor-btn">
              {isLoading ? 'Saving...' : 'Save monitor'} <i className="ti ti-arrow-right"></i>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
