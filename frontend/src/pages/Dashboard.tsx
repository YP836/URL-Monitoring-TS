import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AddUrlModal } from '../components/urls/AddUrlModal';
import { UrlList } from '../components/urls/UrlList';
import { Toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { RadarIcon } from '../components/ui/Icons';
import { UrlCardSkeleton } from '../components/ui/Skeleton';
import { PageLayout } from '../components/layout/PageLayout';
import { getUrlExtraData } from '../api/client';
import { useUrls } from '../hooks/useUrls';
import { buildWsUrl, useWebSocket } from '../hooks/useWebSocket';
import { useLiveStatus } from '../hooks/useLiveStatus';
import { URLItem } from '../types';

export function Dashboard() {
  const { urls, isLoading, error, addUrl, deleteUrl, retryFetch, clearError } = useUrls();
  const navigate = useNavigate();
  const [extraDataMap, setExtraDataMap] = useState<Record<number, Record<string, unknown>>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const wsUrl = buildWsUrl(import.meta.env.VITE_API_BASE_URL);
  const { lastMessage, isConnected, connectionError } = useWebSocket(wsUrl);
  const { liveUrls, lastPingMap } = useLiveStatus(urls, lastMessage);

  useEffect(() => {
    document.title = 'Uptime Monitor';
  }, []);

  useEffect(() => {
    if (urls.length === 0) {
      setExtraDataMap({});
      return;
    }

    let mounted = true;

    const loadExtraData = async () => {
      const nextExtraMap: Record<number, Record<string, unknown>> = {};
      await Promise.allSettled(
        urls.map(async (url) => {
          try {
            const data = await getUrlExtraData(url.id);
            nextExtraMap[url.id] = data.extra_data;
          } catch {
            return;
          }
        }),
      );

      if (mounted) setExtraDataMap(nextExtraMap);
    };

    void loadExtraData();

    return () => {
      mounted = false;
    };
  }, [urls]);

  useEffect(() => {
    if (!lastMessage?.extra_data || !lastMessage.check_type) return;
    const messageCheckType = lastMessage.check_type;

    setExtraDataMap((previous) => ({
      ...previous,
      [lastMessage.url_id]: {
        ...(previous[lastMessage.url_id] ?? {}),
        [messageCheckType]: lastMessage.extra_data as Record<string, unknown>,
      },
    }));
  }, [lastMessage]);

  const renderSkeletons = () => (
    <div className="url-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      {Array.from({ length: 6 }, (_, index) => <UrlCardSkeleton key={index} />)}
    </div>
  );

  const renderEmptyState = () => (
    <div className="center-state">
      <RadarIcon size={48} color="#C6A15B" />
      <div style={{ fontSize: 18, fontWeight: 500, color: '#6B7280' }}>No URLs monitored yet</div>
      <div style={{ fontSize: 14, color: '#A9A195' }}>Add a site above to begin monitoring it</div>
    </div>
  );

  const renderErrorState = () => (
    <div className="center-state">
      <div className="state-card">
        <div style={{ fontSize: 16, color: '#E24B4A', fontWeight: 500 }}>Failed to load URLs</div>
        <div style={{ fontSize: 13, color: '#A9A195', marginTop: 6 }}>{error}</div>
        <button type="button" className="primary" style={{ marginTop: 14 }} onClick={retryFetch}>
          Retry
        </button>
      </div>
    </div>
  );

  const handleAddUrl = async (payload: Parameters<typeof addUrl>[0]) => {
    await addUrl(payload);
  };

  const handleInspectUrl = (url: URLItem) => {
    navigate(`/urls/${url.id}`);
  };

  return (
    <PageLayout isConnected={isConnected} connectionError={connectionError} urlCount={liveUrls.length}>
      <div className="dashboard-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '1.7rem', fontWeight: 400 }}>
            Monitored URLs
          </h1>
          <Badge variant="neutral" label={`${liveUrls.length} sites`} />
        </div>
      </div>

      <motion.section
        className="monitor-form collapsed dashboard-add-command"
        layout
        initial={{ opacity: 0, y: 20, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="monitor-start-panel">
          <p className="landing-kicker">Command center</p>
          <h2>Start a precision monitor</h2>
          <p>Add the URL, choose only the signals you need, and set the exact check frequency.</p>
        </div>

        <motion.button
          type="button"
          disabled={isLoading}
          className="primary start-monitor-button"
          onClick={() => setIsAddModalOpen(true)}
          whileHover={{ y: -2, scale: 1.015 }}
          whileTap={{ scale: 0.97 }}
        >
          Start monitoring
        </motion.button>
      </motion.section>

      <AnimatePresence>
        {isAddModalOpen && (
          <AddUrlModal
            onClose={() => setIsAddModalOpen(false)}
            onAdd={handleAddUrl}
            isLoading={isLoading}
          />
        )}
      </AnimatePresence>

      {isLoading && urls.length === 0 && renderSkeletons()}
      {!isLoading && error && urls.length === 0 && renderErrorState()}
      {!isLoading && !error && urls.length === 0 && renderEmptyState()}
      {urls.length > 0 && (
        <UrlList
          urls={liveUrls}
          onDelete={deleteUrl}
          onInspect={handleInspectUrl}
          extraDataMap={extraDataMap}
          lastPingMap={lastPingMap}
        />
      )}

      {error && urls.length > 0 && <Toast message={error} onDismiss={clearError} />}
    </PageLayout>
  );
}
