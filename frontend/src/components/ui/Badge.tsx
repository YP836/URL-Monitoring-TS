import { ReactNode } from 'react';

interface BadgeProps {
  label: string | ReactNode;
  variant: 'success' | 'danger' | 'neutral';
}

export function Badge({ label, variant }: BadgeProps) {
  let bgColor = '#e0e0e0';
  let textColor = '#333';

  if (variant === 'success') {
    bgColor = '#e6f4ea';
    textColor = '#1e8e3e';
  } else if (variant === 'danger') {
    bgColor = '#fce8e6';
    textColor = '#d93025';
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
        gap: 6,
      }}
    >
      {label}
    </span>
  );
}
