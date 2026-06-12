import { ReactNode } from 'react';

interface BadgeProps {
  label: string | ReactNode;
  variant: 'success' | 'danger' | 'neutral';
}

export function Badge({ label, variant }: BadgeProps) {
  let bgColor = 'rgba(255, 255, 255, 0.09)';
  let textColor = '#F7F0E4';
  let borderColor = 'rgba(255, 255, 255, 0.12)';

  if (variant === 'success') {
    bgColor = 'rgba(29, 158, 117, 0.14)';
    textColor = '#72E0BC';
    borderColor = 'rgba(29, 158, 117, 0.3)';
  } else if (variant === 'danger') {
    bgColor = 'rgba(226, 75, 74, 0.14)';
    textColor = '#FF8D84';
    borderColor = 'rgba(226, 75, 74, 0.3)';
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
