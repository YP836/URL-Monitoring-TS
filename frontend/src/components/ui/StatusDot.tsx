import { URLStatus } from '../../types';

interface StatusDotProps {
  status: URLStatus;
}

export function StatusDot({ status }: StatusDotProps) {
  const colorMap: Record<URLStatus, string> = {
    UP: '#1D9E75',
    DOWN: '#E24B4A',
    WARN: '#BA7517',
    PENDING: '#B4B2A9',
  };

  return (
    <div
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        backgroundColor: colorMap[status],
        display: 'inline-block',
      }}
      title={`Status: ${status}`}
    />
  );
}
