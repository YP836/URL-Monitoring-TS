import { ReactNode } from 'react';

interface BadgeProps {
  label: string | ReactNode;
  variant: 'success' | 'danger' | 'warning' | 'neutral';
}

export function Badge({ label, variant }: BadgeProps) {
  let bgColor = 'rgba(255, 255, 255, 0.09)';
  let textColor = '#374151';
  let borderColor = 'rgba(17, 24, 39, 0.1)';

  if (variant === 'success') {
    bgColor = 'rgba(29, 158, 117, 0.14)';
    textColor = '#1D9E75';
    borderColor = 'rgba(29, 158, 117, 0.3)';
  } else if (variant === 'danger') {
    bgColor = 'rgba(226, 75, 74, 0.14)';
    textColor = '#C53B3A';
    borderColor = 'rgba(226, 75, 74, 0.3)';
  } else if (variant === 'warning') {
    bgColor = 'rgba(186, 117, 23, 0.16)';
    textColor = '#BA7517';
    borderColor = 'rgba(186, 117, 23, 0.34)';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: bgColor,
        color: textColor,
        border: `1px solid ${borderColor}`,
        gap: 6,
      }}
    >
      {label}
    </span>
  );
}
