import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import ErrorBoundary from '../ui/ErrorBoundary';

interface PageLayoutProps {
  children: React.ReactNode;
  isConnected: boolean;
  connectionError: string | null;
  urlCount?: number;
}

export function PageLayout({
  children,
  isConnected,
  connectionError,
  urlCount = 0,
}: PageLayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#090A0D' }}>
      <TopBar isConnected={isConnected} connectionError={connectionError} />
      <div
        style={{
          backgroundColor: 'rgba(198, 161, 91, 0.14)',
          color: '#E9C77F',
          fontSize: 13,
          padding: isConnected ? '0 24px' : '8px 24px',
          opacity: isConnected ? 0 : 1,
          maxHeight: isConnected ? 0 : 40,
          overflow: 'hidden',
          borderBottom: isConnected ? '0 solid transparent' : '1px solid rgba(198, 161, 91, 0.22)',
          transition: 'opacity 0.3s ease, max-height 0.3s ease, padding 0.3s ease',
        }}
      >
        Live updates paused - attempting to reconnect...
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar urlCount={urlCount} />
        <main
          className="main-content"
          style={{
            flex: 1,
            padding: 24,
            overflowY: 'auto',
            color: '#F7F0E4',
            background:
              'linear-gradient(135deg, #0D0E12 0%, #14161A 58%, #0A0B0E 100%)',
          }}
        >
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
