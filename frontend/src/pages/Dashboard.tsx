import { useEffect, useState } from 'react';
import { AddUrlForm } from '../components/urls/AddUrlForm';
import { UrlList } from '../components/urls/UrlList';
import { Toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { RadarIcon } from '../components/ui/Icons';
import { UrlCardSkeleton } from '../components/ui/Skeleton';
import { PageLayout } from '../components/layout/PageLayout';
import { useUrls } from '../hooks/useUrls';
import { buildWsUrl, useWebSocket } from '../hooks/useWebSocket';
import { useLiveStatus } from '../hooks/useLiveStatus';

export function Dashboard() {
  const { urls, isLoading, error, addUrl, deleteUrl, retryFetch, clearError } = useUrls();
  const [showAddForm, setShowAddForm] = useState(false);
  const wsUrl = buildWsUrl(import.meta.env.VITE_API_BASE_URL);
  const { lastMessage, isConnected, connectionError } = useWebSocket(wsUrl);
  const { liveUrls, lastPingMap } = useLiveStatus(urls, lastMessage);

  useEffect(() => {
    document.title = 'Uptime Monitor';
  }, []);

  const renderSkeletons = () => (
    <div className="url-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      {Array.from({ length: 6 }, (_, index) => <UrlCardSkeleton key={index} />)}
    </div>
  );

  const renderEmptyState = () => (
    <div className="center-state">
      <RadarIcon size={48} color="#C6A15B" />
      <div style={{ fontSize: 18, fontWeight: 500, color: '#F7F0E4' }}>No URLs monitored yet</div>
      <div style={{ fontSize: 14, color: '#A9A195' }}>Use Add link to begin monitoring a new site</div>
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
    setShowAddForm(false);
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
        <button type="button" className="add-link-button" onClick={() => setShowAddForm((current) => !current)}>
          {showAddForm ? 'Close' : 'Add link'}
        </button>
      </div>

      {showAddForm && <AddUrlForm onAdd={handleAddUrl} isLoading={isLoading} />}

      {isLoading && urls.length === 0 && renderSkeletons()}
      {!isLoading && error && urls.length === 0 && renderErrorState()}
      {!isLoading && !error && urls.length === 0 && renderEmptyState()}
      {urls.length > 0 && <UrlList urls={liveUrls} onDelete={deleteUrl} lastPingMap={lastPingMap} />}

      {error && urls.length > 0 && <Toast message={error} onDismiss={clearError} />}
    </PageLayout>
  );
}
