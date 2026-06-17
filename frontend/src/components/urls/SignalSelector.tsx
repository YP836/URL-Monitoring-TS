import { CheckType } from '../../types';

interface SignalOption {
  key: CheckType;
  title: string;
  detail: string;
  icon: string;
}

const signalOptions: SignalOption[] = [
  { key: 'HTTP', title: 'HTTP', detail: 'Basic uptime and status code', icon: 'ti-world' },
  { key: 'SSL_EXPIRY', title: 'SSL expiry', detail: 'Certificate days remaining', icon: 'ti-lock' },
  { key: 'TTFB', title: 'TTFB', detail: 'Time to first byte', icon: 'ti-bolt' },
  { key: 'KEYWORD', title: 'Keyword', detail: 'Find text in page body', icon: 'ti-search' },
  { key: 'DOWNTIME_DURATION', title: 'Downtime', detail: 'Downtime minutes from history', icon: 'ti-clock-down' },
  { key: 'ERROR_RATE', title: 'Error rate', detail: 'Failed ping percentage', icon: 'ti-percentage' },
];

interface SignalSelectorProps {
  selectedSignals: CheckType[];
  onChange: (signals: CheckType[]) => void;
}

export function SignalSelector({ selectedSignals, onChange }: SignalSelectorProps) {
  const toggleSignal = (signal: CheckType) => {
    if (selectedSignals.includes(signal)) {
      if (selectedSignals.length === 1) return;
      onChange(selectedSignals.filter((selectedSignal) => selectedSignal !== signal));
      return;
    }

    onChange([...selectedSignals, signal]);
  };

  return (
    <section className="signal-selector" aria-label="Monitoring signal type">
      {signalOptions.map((option) => {
        const isSelected = selectedSignals.includes(option.key);
        return (
          <button
            className={`signal-selector-card${isSelected ? ' selected' : ''}`}
            type="button"
            key={option.key}
            aria-pressed={isSelected}
            onClick={() => toggleSignal(option.key)}
          >
            <div className="signal-card-top">
              <div className="signal-icon-wrapper">
                <i className={`ti ${option.icon}`} aria-hidden="true" />
              </div>
              <div className="signal-checkbox">
                {isSelected && <i className="ti ti-check" />}
              </div>
            </div>
            <div className="signal-card-bottom">
              <span>{option.title}</span>
              <small>{option.detail}</small>
            </div>
          </button>
        );
      })}
    </section>
  );
}
