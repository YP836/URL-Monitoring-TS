export type MetricKey =
  | 'avgLatency'
  | 'p95Latency'
  | 'uptime'
  | 'lastChecked'
  | 'sslExpiry'
  | 'ttfb'
  | 'keyword'
  | 'downtimeDuration'
  | 'errorRate';

interface MetricOption {
  key: MetricKey;
  title: string;
  detail: string;
}

const metricOptions: MetricOption[] = [
  { key: 'avgLatency', title: 'Avg latency', detail: 'Typical response speed' },
  { key: 'p95Latency', title: 'P95 latency', detail: 'Slow edge behavior' },
  { key: 'uptime', title: 'Uptime', detail: 'Reliability percentage' },
  { key: 'lastChecked', title: 'Last checked', detail: 'Freshness of signal' },
  { key: 'sslExpiry', title: 'SSL expiry', detail: 'Certificate days remaining' },
  { key: 'ttfb', title: 'TTFB', detail: 'Time to first byte' },
  { key: 'keyword', title: 'Keyword', detail: 'Word found in page body' },
  { key: 'downtimeDuration', title: 'Downtime', detail: 'Minutes down from history' },
  { key: 'errorRate', title: 'Error rate', detail: 'Failed ping percentage' },
];

interface MetricChooserProps {
  selectedMetrics: MetricKey[];
  onChange: (metrics: MetricKey[]) => void;
}

export function MetricChooser({ selectedMetrics, onChange }: MetricChooserProps) {
  const toggleMetric = (key: MetricKey) => {
    if (selectedMetrics.includes(key)) {
      onChange(selectedMetrics.filter((metric) => metric !== key));
      return;
    }

    onChange([...selectedMetrics, key]);
  };

  return (
    <section className="metric-chooser" aria-labelledby="metric-chooser-title">
      <div>
        <p className="landing-kicker">Choose your signal</p>
        <h2 id="metric-chooser-title">What do you want to check?</h2>
      </div>
      <div className="metric-options" role="group" aria-label="Monitoring metrics">
        {metricOptions.map((option) => {
          const isSelected = selectedMetrics.includes(option.key);
          return (
            <button
              className={`metric-option${isSelected ? ' selected' : ''}`}
              type="button"
              key={option.key}
              aria-pressed={isSelected}
              onClick={() => toggleMetric(option.key)}
            >
              <span>{option.title}</span>
              <small>{option.detail}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
