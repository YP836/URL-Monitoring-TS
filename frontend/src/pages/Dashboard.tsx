import { AddUrlForm } from '../components/urls/AddUrlForm';
import { UrlList } from '../components/urls/UrlList';
import { TopBar } from '../components/layout/TopBar';
import { Sidebar } from '../components/layout/Sidebar';
import { URLItem, AddURLPayload } from '../types';

const MOCK_URLS: URLItem[] = [
  {
    id: 1,
    name: 'Google',
    web_address: 'https://google.com',
    status: 'UP',
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'My API',
    web_address: 'https://myapi.example.com',
    status: 'DOWN',
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'GitHub',
    web_address: 'https://github.com',
    status: 'PENDING',
    created_at: new Date().toISOString(),
  },
];

export function Dashboard() {
  const handleAddUrl = (payload: AddURLPayload) => {
    console.log('Adding URL:', payload);
    // In Phase 2: call API and update state
  };

  const handleDeleteUrl = (id: number) => {
    console.log('Deleting URL:', id);
    // In Phase 2: call API and update state
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TopBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main
          style={{
            flex: 1,
            padding: 32,
            overflowY: 'auto',
            backgroundColor: '#fff',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', marginBottom: 24, fontWeight: 600 }}>
            Monitored URLs
          </h1>
          <AddUrlForm onAdd={handleAddUrl} isLoading={false} />
          <UrlList urls={MOCK_URLS} onDelete={handleDeleteUrl} />
        </main>
      </div>
    </div>
  );
}
