import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  if (seconds < 60) return 'just now';
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
      text: `SSL ${d} days remaining`,
      color: d > 30 ? '#72E0BC' : d >= 7 ? '#F0B45F' : '#FF8D84',
    };
  }

  if (checkType === 'TTFB') {
    const t = extraData.ttfb_ms as number;
    return {
      text: `TTFB ${t}ms`,
      color: t < 200 ? '#72E0BC' : t < 800 ? '#F0B45F' : '#FF8D84',
    };
  }

  if (checkType === 'KEYWORD') {
    const found = extraData.keyword_found as boolean;
    const keyword = extraData.keyword as string;
    return {
      text: found ? `"${keyword}" found` : `"${keyword}" not found`,
      color: found ? '#72E0BC' : '#FF8D84',
    };
  }

  if (checkType === 'DOWNTIME_DURATION') {
    const m = extraData.downtime_minutes_30d as number;
    return {
      text: `${m} min down / 30d`,
      color: m === 0 ? '#72E0BC' : m < 60 ? '#F0B45F' : '#FF8D84',
    };
  }

  if (checkType === 'ERROR_RATE') {
    const r = extraData.error_rate_pct as number;
    return {
      text: `${r.toFixed(1)}% error rate`,
      color: r < 1 ? '#72E0BC' : r < 10 ? '#F0B45F' : '#FF8D84',
    };
  }

  return null;
}

function getDomain(webAddress: string): string {
  try {
    return new URL(webAddress).hostname;
  } catch {
    return webAddress.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
  }
}

export function UrlCard({ url, onDelete, onInspect, extraData, lastPing }: UrlCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [flashStatus, setFlashStatus] = useState<'UP' | 'DOWN' | 'WARN' | null>(null);
  const previousStatus = useRef(url.status);
  const signalLines = splitCheckTypes(url.check_type)
    .filter((checkType) => checkType !== 'HTTP')
    .map((checkType) => getSignalLine(checkType, extraData))
    .filter((line): line is { text: string; color: string } => line !== null);

  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const domain = getDomain(url.web_address);

  useEffect(() => {
    setFaviconUrl(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);
  }, [domain]);

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
    setIsConfirming(true);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirming(false);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(url.id);
    setIsConfirming(false);
  };

  const getBadgeVariant = (status: string) => {
    if (status === 'UP') return 'success';
    if (status === 'DOWN') return 'danger';
    if (status === 'WARN') return 'warning';
    return 'neutral';
  };

  return (
    <>
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
        <div className={styles.header} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {faviconUrl ? (
            <img src={faviconUrl} alt={`${domain} logo`} style={{ width: 20, height: 20, borderRadius: '50%' }} onError={() => setFaviconUrl(null)} />
          ) : (
            <span style={{ fontSize: '1.2rem', color: '#9CA3AF' }}>dYO?</span>
          )}
          <div className={styles.name} style={{ flex: 1 }}>{url.name}</div>
          <StatusDot status={url.status} />
        </div>
        <div className={styles.address}>
          <div className={styles.addressRow}>
            <span className={styles.label}>URL :</span>
            <span style={{ color: '#374151', fontSize: '0.85rem', fontWeight: 500 }}>{url.web_address}</span>
          </div>
          <div className={styles.addressRow} style={{ marginTop: 4 }}>
            <span className={styles.label}>Status :</span>
            <Badge variant={getBadgeVariant(url.status)} label={url.status} />
          </div>
          {signalLines.map((signalLine) => (
            <div key={signalLine.text} className={styles.signalLine} style={{ color: signalLine.color }}>
              {signalLine.text}
            </div>
          ))}
        </div>
        <div className={styles.footer}>
          <div className={styles.time}>Added: {timeAgo(url.created_at)}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 8 }}>
            <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.85rem' }}>
              {lastPing && lastPing.latency_ms !== null ? `${lastPing.latency_ms}ms` : ''}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
              <button className={styles.deleteBtn} type="button" onClick={handleDeleteClick}>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {isConfirming && createPortal(
        <div className={styles.modalOverlay} onClick={handleCancelDelete} role="presentation">
          <div
            className={styles.confirmDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-title-${url.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.confirmIcon}>!</div>
            <h2 id={`delete-title-${url.id}`}>Delete monitor?</h2>
            <p>
              This will remove <strong>{url.name}</strong> and its saved monitoring history.
            </p>
            <div className={styles.dialogActions}>
              <button className={styles.cancelBtn} type="button" onClick={handleCancelDelete}>
                Cancel
              </button>
              <button className={styles.confirmDeleteBtn} type="button" onClick={handleConfirmDelete}>
                Confirm delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
