import { AnimatePresence, motion } from 'framer-motion';
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
    <motion.div
      className="url-grid"
      layout
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
      }}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.055,
          },
        },
      }}
    >
      <AnimatePresence mode="popLayout">
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
      </AnimatePresence>
    </motion.div>
  );
}
