interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = '4px',
  className,
}: SkeletonProps) {
  return (
    <>
      <style>
        {`
          @keyframes skeleton-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
          .skeleton-block {
            background: linear-gradient(90deg, rgba(255,255,255,0.06), rgba(198,161,91,0.12), rgba(255,255,255,0.06));
            animation: skeleton-pulse 1.5s ease-in-out infinite;
          }
        `}
      </style>
      <div
        className={`skeleton-block${className ? ` ${className}` : ''}`}
        style={{ width, height, borderRadius }}
        aria-hidden="true"
      />
    </>
  );
}

export function UrlCardSkeleton() {
  return (
    <div
      style={{
        minHeight: 120,
        width: '100%',
        borderRadius: 8,
        border: '1px solid rgba(198, 161, 91, 0.2)',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
        <Skeleton width="45%" height={20} />
        <Skeleton width={10} height={10} borderRadius="50%" />
      </div>
      <Skeleton width="78%" height={14} />
      <div style={{ marginTop: 14 }}>
        <Skeleton width={68} height={22} borderRadius="12px" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div
      style={{
        height: 80,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.055)',
        padding: 16,
      }}
    >
      <Skeleton width="48%" height={12} />
      <div style={{ marginTop: 12 }}>
        <Skeleton width="68%" height={24} />
      </div>
    </div>
  );
}

export function ChartSkeleton({ height = 180 }: { height?: number }) {
  return <Skeleton height={height} borderRadius="8px" />;
}
