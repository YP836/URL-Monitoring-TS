import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { URLItem } from '../../types';
import { StatusDot } from '../ui/StatusDot';
import { Badge } from '../ui/Badge';
import styles from './UrlCard.module.css';

interface UrlCardProps {
  url: URLItem;
  onDelete: (id: number) => void;
}

function timeAgo(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function UrlCard({ url, onDelete }: UrlCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let timer: number;
    if (isConfirming) {
      timer = window.setTimeout(() => setIsConfirming(false), 4000);
    }
    return () => window.clearTimeout(timer);
  }, [isConfirming]);

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
    return 'neutral';
  };

  return (
    <div 
      className={styles.card} 
      onClick={() => navigate(`/urls/${url.id}`)}
      style={{ cursor: 'pointer' }}
    >
      <div className={styles.header}>
        <div className={styles.name}>{url.name}</div>
        <StatusDot status={url.status} />
      </div>
      <div className={styles.address}>
        <div style={{ marginBottom: 8 }}>{url.web_address}</div>
        <Badge variant={getBadgeVariant(url.status)} label={url.status} />
      </div>
      <div className={styles.footer}>
        <div className={styles.time}>Added: {timeAgo(url.created_at)}</div>
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
          <button className={styles.deleteBtn} onClick={handleDeleteClick}>
            {isConfirming ? 'Confirm?' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
