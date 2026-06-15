import { useState, useEffect, useRef } from 'react';
import { CheckType, PingResult, URLItem } from '../../types';
import { StatusDot } from '../ui/StatusDot';
import { Badge } from '../ui/Badge';
import styles from './UrlCard.module.css';

interface UrlCardProps {
  url: URLItem;
  onDelete: (id: number) => void;
  onInspect: (url: URLItem) => void;
  extraData?: Record<string, unknown>;
  lastPing?: PingResult | null;
}

function timeAgo(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function splitCheckTypes(checkType: string | undefined): CheckType[] {
  const knownChecks: CheckType[] = ['HTTP', 'SSL_EXPIRY', 'TTFB', 'KEYWORD', 'DOWNTIME_DURATION', 'ERROR_RATE'];
  const checks = (checkType ?? 'HTTP')
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is CheckType => knownChecks.includes(item as CheckType));
  return checks.length > 0 ? checks : ['HTTP'];
}

function getExtraDataForCheck(checkType: CheckType, extraData?: Record<string, unknown>) {
  if (!extraData) return null;
  const nestedExtraData = extraData[checkType] as Record<string, unknown> | undefined;
  return nestedExtraData ?? extraData;
}

function getSignalLine(checkType: CheckType, allExtraData?: Record<string, unknown>) {
  const extraData = getExtraDataForCheck(checkType, allExtraData);
  if (!extraData) return null;

  if (checkType === 'SSL_EXPIRY') {
    const d = extraData.days_remaining as number;
    return {
      text: `🔒 ${d} days remaining`,
      color: d > 30 ? '#1D9E75' : d >= 7 ? '#BA7517' : '#E24B4A',
    };
  }

  if (checkType === 'TTFB') {
    const t = extraData.ttfb_ms as number;
    return {
      text: `⚡ TTFB ${t}ms`,
      color: t < 200 ? '#1D9E75' : t < 800 ? '#BA7517' : '#E24B4A',
    };
  }

  if (checkType === 'KEYWORD') {
    const found = extraData.keyword_found as boolean;
    const keyword = extraData.keyword as string;
    return {
      text: found ? `✓ "${keyword}" found` : `✗ "${keyword}" not found`,
      color: found ? '#1D9E75' : '#E24B4A',
    };
  }

  if (checkType === 'DOWNTIME_DURATION') {
    const m = extraData.downtime_minutes_30d as number;
    return {
      text: `${m} min down / 30d`,
      color: m === 0 ? '#1D9E75' : m < 60 ? '#BA7517' : '#E24B4A',
    };
  }

  if (checkType === 'ERROR_RATE') {
    const r = extraData.error_rate_pct as number;
    return {
      text: `${r.toFixed(1)}% error rate`,
      color: r < 1 ? '#1D9E75' : r < 10 ? '#BA7517' : '#E24B4A',
    };
  }

  return null;
}

export function UrlCard({ url, onDelete, onInspect, extraData, lastPing }: UrlCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [flashStatus, setFlashStatus] = useState<'UP' | 'DOWN' | 'WARN' | null>(null);
  const previousStatus = useRef(url.status);
  const signalLines = splitCheckTypes(url.check_type)
    .filter((checkType) => checkType !== 'HTTP')
    .map((checkType) => getSignalLine(checkType, extraData))
    .filter((line): line is { text: string; color: string } => line !== null);

  useEffect(() => {
    let timer: number;
    if (isConfirming) {
      timer = window.setTimeout(() => setIsConfirming(false), 4000);
    }
    return () => window.clearTimeout(timer);
  }, [isConfirming]);

  useEffect(() => {
    if (previousStatus.current !== url.status && url.status !== 'PENDING') {
      setFlashStatus(url.status);
      const timer = window.setTimeout(() => setFlashStatus(null), 600);
      previousStatus.current = url.status;
      return () => window.clearTimeout(timer);
    }

    previousStatus.current = url.status;
    return undefined;
  }, [url.status]);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isConfirming) {
      onDelete(url.id);
    } else {
      setIsConfirming(true);
    }
  };

  const getBadgeVariant = (status: string) => {
    if (status === 'UP') return 'success';
    if (status === 'DOWN') return 'danger';
    if (status === 'WARN') return 'warning';
    return 'neutral';
  };

  return (
    <div 
      className={styles.card} 
      onClick={() => onInspect(url)}
      style={{
        cursor: 'pointer',
        borderColor:
          flashStatus === 'UP'
            ? '#1D9E75'
            : flashStatus === 'WARN'
              ? '#BA7517'
              : flashStatus === 'DOWN'
                ? '#E24B4A'
                : undefined,
      }}
    >
      <div className={styles.header}>
        <div className={styles.name}>{url.name}</div>
        <StatusDot status={url.status} />
      </div>
      <div className={styles.address}>
        <div style={{ marginBottom: 8 }}>{url.web_address}</div>
        <Badge variant={getBadgeVariant(url.status)} label={url.status} />
        {signalLines.map((signalLine) => (
          <div key={signalLine.text} style={{ fontSize: 11, marginTop: 4, color: signalLine.color }}>
            {signalLine.text}
          </div>
        ))}
      </div>
      <div className={styles.footer}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className={styles.time}>Added: {timeAgo(url.created_at)}</div>
          {lastPing && (
            <Badge
              variant={lastPing.status === 'UP' ? 'neutral' : 'danger'}
              label={lastPing.status === 'UP' && lastPing.latency_ms !== null ? `${lastPing.latency_ms}ms` : 'timeout'}
            />
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isConfirming && (
            <button 
              className={styles.deleteBtn} 
              style={{ border: 'none', background: 'transparent', color: '#666' }}
              onClick={(e) => { e.stopPropagation(); setIsConfirming(false); }}
            >
              cancel
            </button>
          )}
          <button
            className={styles.inspectBtn}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInspect(url);
            }}
          >
            View details
          </button>
          <button className={styles.deleteBtn} onClick={handleDeleteClick}>
            {isConfirming ? 'Confirm?' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
