interface StatusDotProps {
  status: 'UP' | 'DOWN' | 'PENDING';
}

export function StatusDot({ status }: StatusDotProps) {
  let color = '#B4B2A9'; // PENDING
  if (status === 'UP') color = '#1D9E75';
  if (status === 'DOWN') color = '#E24B4A';

  return (
    <div
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        backgroundColor: color,
        display: 'inline-block',
      }}
      title={`Status: ${status}`}
    />
  );
}
