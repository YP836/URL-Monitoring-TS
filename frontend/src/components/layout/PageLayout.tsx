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
    <div className="app-shell">
      <TopBar isConnected={isConnected} connectionError={connectionError} />
      <div
        className={`connection-banner${isConnected ? '' : ' visible'}`}
      >
        Live updates paused - attempting to reconnect...
      </div>
      <div className="app-body">
        <Sidebar urlCount={urlCount} />
        <main
          className="main-content"
        >
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
