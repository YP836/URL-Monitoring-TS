import React from 'react';
import { Sidebar } from './Sidebar';
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
  connectionError: _connectionError,
  urlCount = 0,
}: PageLayoutProps) {
  return (
    <div className="app-shell">
      <Sidebar urlCount={urlCount} />
      <main className="main-content">

        <div className={`connection-banner${isConnected ? '' : ' visible'}`}>
          Live updates paused - attempting to reconnect...
        </div>
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
