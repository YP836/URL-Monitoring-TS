import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckType, PingResult, URLItem } from '../../types';
import { StatusDot } from '../ui/StatusDot';
import { Badge } from '../ui/Badge';
import styles from './UrlCard.module.css';

interface UrlCardProps {
  url: URLItem;
  onDelete: (id: number) => void;
  onInspect: (url: URLItem) => void;
  extraData?: Record<string, unknown> | null;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function getExtraDataForCheck(checkType: CheckType, extraData?: Record<string, unknown> | null) {
  if (!extraData) return null;
  const nestedExtraData = extraData[checkType];
  return isRecord(nestedExtraData) ? nestedExtraData : extraData;
}

function getSignalLine(checkType: CheckType, allExtraData?: Record<string, unknown> | null) {
  const extraData = getExtraDataForCheck(checkType, allExtraData);
  if (!extraData) return null;

  if (checkType === 'SSL_EXPIRY') {
    const d = getNumber(extraData.days_remaining);
    if (d === null) return null;
    return {
      text: `SSL ${d} days remaining`,
      color: d > 30 ? '#72E0BC' : d >= 7 ? '#F0B45F' : '#FF8D84',
    };
  }

  if (checkType === 'TTFB') {
    const t = getNumber(extraData.ttfb_ms);
    if (t === null) return null;
    return {
      text: `TTFB ${t}ms`,
      color: t < 200 ? '#72E0BC' : t < 800 ? '#F0B45F' : '#FF8D84',
    };
  }

  if (checkType === 'KEYWORD') {
    const found = getBoolean(extraData.keyword_found);
    if (found === null) return null;
    const keyword = getString(extraData.keyword) ?? 'Keyword';
    return {
      text: found ? `"${keyword}" found` : `"${keyword}" not found`,
      color: found ? '#72E0BC' : '#FF8D84',
    };
  }

  if (checkType === 'DOWNTIME_DURATION') {
    const m = getNumber(extraData.downtime_minutes_30d);
    if (m === null) return null;
    return {
      text: `${m} min down / 30d`,
      color: m === 0 ? '#72E0BC' : m < 60 ? '#F0B45F' : '#FF8D84',
    };
  }

  if (checkType === 'ERROR_RATE') {
    const r = getNumber(extraData.error_rate_pct);
    if (r === null) return null;
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
    return webAddress.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0];
  }
}

function getBadgeVariant(status: string) {
  if (status === 'UP') return 'success';
  if (status === 'DOWN') return 'danger';
  if (status === 'WARN') return 'warning';
  return 'neutral';
}

export function UrlCard({ url, onDelete, onInspect, extraData, lastPing }: UrlCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [flashStatus, setFlashStatus] = useState<'UP' | 'DOWN' | 'WARN' | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const previousStatus = useRef(url.status);
  const domain = getDomain(url.web_address);
  const signalLines = splitCheckTypes(url.check_type)
    .filter((checkType) => checkType !== 'HTTP')
    .map((checkType) => getSignalLine(checkType, extraData))
    .filter((line): line is { text: string; color: string } => line !== null);

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

  const handleDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsConfirming(true);
  };

  const handleCancelDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsConfirming(false);
  };

  const handleConfirmDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDelete(url.id);
    setIsConfirming(false);
  };

  return (
    <>
      <motion.div
        className={styles.card}
        onClick={() => onInspect(url)}
        layout
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -14, scale: 0.985 }}
        whileHover={{ y: -5, scale: 1.012 }}
        whileTap={{ scale: 0.995 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
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
            <span style={{ fontSize: '0.82rem', color: '#9CA3AF', fontWeight: 800 }}>U</span>
          )}
          <div className={styles.name} style={{ flex: 1 }}>{url.name}</div>
          <StatusDot status={url.status} />
        </div>

        <div className={styles.address}>
          <div className={styles.addressRow}>
            <span className={styles.label}>URL:</span>
            <span style={{ color: '#374151', fontSize: '0.85rem', fontWeight: 500 }}>{url.web_address}</span>
          </div>
          <div className={styles.addressRow} style={{ marginTop: 4 }}>
            <span className={styles.label}>Status:</span>
            <Badge variant={getBadgeVariant(url.status)} label={url.status} />
          </div>
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
                onClick={(event) => {
                  event.stopPropagation();
                  onInspect(url);
                }}
              >
                View details
              </button>
              <motion.button
                className={styles.deleteBtn}
                type="button"
                onClick={handleDeleteClick}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
              >
                Delete
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {createPortal(
        <AnimatePresence>
          {isConfirming && (
            <motion.div
              className={styles.modalOverlay}
              onClick={handleCancelDelete}
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <motion.div
                className={styles.confirmDialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby={`delete-title-${url.id}`}
                onClick={(event) => event.stopPropagation()}
                initial={{ opacity: 0, y: 18, scale: 0.96, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: 12, scale: 0.96, filter: 'blur(8px)' }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.div
                  className={styles.confirmIcon}
                  initial={{ scale: 0.6, rotate: -18 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.08, type: 'spring', stiffness: 380, damping: 22 }}
                >
                  !
                </motion.div>
                <h2 id={`delete-title-${url.id}`}>Delete monitor?</h2>
                <p>
                  This will remove <strong>{url.name}</strong> and its saved monitoring history.
                </p>
                <div className={styles.dialogActions}>
                  <motion.button
                    className={styles.cancelBtn}
                    type="button"
                    onClick={handleCancelDelete}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    className={styles.confirmDeleteBtn}
                    type="button"
                    onClick={handleConfirmDelete}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    Confirm delete
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
