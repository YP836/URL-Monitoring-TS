interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

const strokeProps = {
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 2,
};

export function RadarIcon({ size = 24, color = 'currentColor', className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path {...strokeProps} stroke={color} d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path {...strokeProps} stroke={color} d="M4 12a8 8 0 0 1 8 -8" />
      <path {...strokeProps} stroke={color} d="M12 20a8 8 0 0 0 8 -8" />
      <path {...strokeProps} stroke={color} d="M12 16a4 4 0 0 1 -4 -4" />
      <path {...strokeProps} stroke={color} d="M16 12a4 4 0 0 0 -4 -4" />
    </svg>
  );
}

export function RefreshIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path {...strokeProps} stroke={color} d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" />
      <path {...strokeProps} stroke={color} d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
    </svg>
  );
}

export function BookIcon({ size = 16, color = 'currentColor', className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path {...strokeProps} stroke={color} d="M3 19a2 2 0 0 1 2 -2h14" />
      <path {...strokeProps} stroke={color} d="M5 3h14v18h-14a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2z" />
      <path {...strokeProps} stroke={color} d="M9 7h6" />
    </svg>
  );
}
