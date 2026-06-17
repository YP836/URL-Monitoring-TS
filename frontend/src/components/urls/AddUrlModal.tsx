import { useState, FormEvent, useEffect, ClipboardEvent } from 'react';
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
  });

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
  const showAdvancedOptions = isBasicValid;
  const hasErrors = nameError !== null || urlError !== null || keywordError !== null || intervalError !== null;
  const panelTransition = { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const };

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
        className="add-url-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-url-modal-title"
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, y: 18, scale: 0.97, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: 12, scale: 0.97, filter: 'blur(8px)' }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="add-url-modal-header">
          <div>
            <p className="landing-kicker">New monitor</p>
            <h2 id="add-url-modal-title">Add monitor</h2>
          </div>
          <button type="button" className="add-url-modal-close" onClick={handleClose} aria-label="Close add monitor modal">
            x
          </button>
        </div>

        <motion.form
          className={`monitor-form expanded add-url-modal-form${showAdvancedOptions ? ' advanced' : ' basic'}`}
          onSubmit={handleSubmit}
          layout
          transition={panelTransition}
        >
          <motion.div
            className="monitor-field site-name-field"
            layout
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...panelTransition, delay: 0.02 }}
          >
            <label htmlFor="site-name">Site name</label>
            <input
              id="site-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => setTouchedName(true)}
              placeholder="My Website"
            />
            {nameError && touchedName && <div className="field-error">{nameError}</div>}
          </motion.div>

          <motion.div
            className="monitor-field site-url-field"
            layout
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...panelTransition, delay: 0.06 }}
          >
            <label htmlFor="site-url">URL</label>
            <input
              id="site-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onBlur={() => setTouchedUrl(true)}
              onPaste={handleUrlPaste}
              placeholder="https://example.com"
            />
            {urlError && touchedUrl && <div className="field-error">{urlError}</div>}
          </motion.div>

          <motion.div
            className="monitor-submit-slot"
            layout
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...panelTransition, delay: 0.1 }}
          >
            <motion.button
              type="submit"
              disabled={isLoading || hasErrors}
              className="primary"
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
            >
              {isLoading ? 'Adding...' : showAdvancedOptions ? 'Save monitor' : 'Continue'}
            </motion.button>
          </motion.div>

          <AnimatePresence>
            {showAdvancedOptions && (
              <motion.div
                className="monitor-options-panel"
                key="monitor-options"
                layout
                initial={{ opacity: 0, y: 22, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.985 }}
                transition={{ ...panelTransition, delay: 0.03 }}
              >
                <div>
                  <p className="landing-kicker">Choose signal checks</p>
                  <h2>What should this monitor check?</h2>
                  <p>Select one or many. Only the selected checks will run in the background.</p>
                </div>

                <SignalSelector selectedSignals={selectedSignals} onChange={setSelectedSignals} />

                <motion.div className="interval-builder" layout>
                  <label htmlFor="ping-interval-add">Check frequency</label>
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
                </motion.div>

                <AnimatePresence>
                  {selectedSignals.includes('KEYWORD') && (
                    <motion.div
                      className="keyword-field"
                      key="keyword-field"
                      layout
                      initial={{ opacity: 0, y: 14, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      transition={panelTransition}
                    >
                      <label htmlFor="keyword-to-find">Keyword to find</label>
                      <input
                        id="keyword-to-find"
                        type="text"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        onBlur={() => setTouchedKeyword(true)}
                        placeholder='e.g. "Add to cart"'
                        required
                      />
                      {keywordError && touchedKeyword && <div className="field-error">{keywordError}</div>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.form>
      </motion.div>
    </motion.div>
  );
}
