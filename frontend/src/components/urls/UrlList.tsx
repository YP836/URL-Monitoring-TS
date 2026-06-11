import { URLItem } from '../../types';
import { UrlCard } from './UrlCard';

interface UrlListProps {
  urls: URLItem[];
  onDelete: (id: number) => void;
}

export function UrlList({ urls, onDelete }: UrlListProps) {
  if (urls.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 200,
          color: '#888',
          border: '1px dashed #ccc',
          borderRadius: 8,
          backgroundColor: '#fafafa',
        }}
      >
        No URLs being monitored yet. Add one above.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
      }}
    >
      {urls.map((url) => (
        <UrlCard key={url.id} url={url} onDelete={onDelete} />
      ))}
    </div>
  );
}
