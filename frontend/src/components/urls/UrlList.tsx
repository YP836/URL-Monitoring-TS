import { PingResult, URLItem } from '../../types';
import { UrlCard } from './UrlCard';

interface UrlListProps {
  urls: URLItem[];
  onDelete: (id: number) => void;
  onInspect: (url: URLItem) => void;
  extraDataMap: Record<number, Record<string, unknown>>;
  lastPingMap: Record<number, PingResult>;
}

export function UrlList({ urls, onDelete, onInspect, extraDataMap, lastPingMap }: UrlListProps) {
  return (
    <div
      className="url-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
      }}
    >
      {urls.map((url) => (
        <UrlCard
          key={url.id}
          url={url}
          onDelete={onDelete}
          onInspect={onInspect}
          extraData={extraDataMap[url.id]}
          lastPing={lastPingMap[url.id] ?? null}
        />
      ))}
    </div>
  );
}
