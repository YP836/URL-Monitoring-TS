import { AddUrlForm } from '../components/urls/AddUrlForm';
import { UrlList } from '../components/urls/UrlList';
import { TopBar } from '../components/layout/TopBar';
import { Sidebar } from '../components/layout/Sidebar';
import { Toast } from '../components/ui/Toast';
import { useUrls } from '../hooks/useUrls';
import { useWebSocket } from '../hooks/useWebSocket';
import { useLiveStatus } from '../hooks/useLiveStatus';
import styles from '../components/urls/UrlCard.module.css'; // Just for skeleton base

export function Dashboard() {
  const { urls, isLoading, error, addUrl, deleteUrl, clearError } = useUrls();
  const { lastMessage, isConnected } = useWebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws');
  const liveUrls = useLiveStatus(urls, lastMessage);

  const renderSkeleton = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      {[1, 2, 3].map(i => (
        <div key={i} className={styles.card} style={{ height: 140, backgroundColor: '#f0f0f0', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TopBar isConnected={isConnected} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: 32, overflowY: 'auto', backgroundColor: '#fff' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 24, fontWeight: 600 }}>
            Monitored URLs
          </h1>
          
          <AddUrlForm onAdd={addUrl} isLoading={isLoading} />
          
          {isLoading && urls.length === 0 ? (
            renderSkeleton()
          ) : (
            <UrlList urls={liveUrls} onDelete={deleteUrl} />
          )}

          {error && <Toast message={error} onDismiss={clearError} />}
        </main>
      </div>
    </div>
  );
}
