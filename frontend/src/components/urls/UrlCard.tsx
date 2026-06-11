import { URLItem } from '../../types';
import { StatusDot } from '../ui/StatusDot';
import styles from './UrlCard.module.css';

interface UrlCardProps {
  url: URLItem;
  onDelete: (id: number) => void;
}

export function UrlCard({ url, onDelete }: UrlCardProps) {
  let relativeTime = 'Just now';
  try {
    const d = new Date(url.created_at);
    relativeTime = d.toLocaleString();
  } catch (e) {
    // Ignore invalid dates in this basic scaffold
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.name}>{url.name}</div>
        <StatusDot status={url.status} />
      </div>
      <div className={styles.address}>{url.web_address}</div>
      <div className={styles.footer}>
        <div className={styles.time}>Last checked: {relativeTime}</div>
        <button className={styles.deleteBtn} onClick={() => onDelete(url.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}
