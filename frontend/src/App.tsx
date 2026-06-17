import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { LandingPage } from './pages/LandingPage';
import { LaunchPage } from './pages/LaunchPage';
import { UrlDetailPage } from './pages/UrlDetailPage';
import ErrorBoundary from './components/ui/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary fallback={<div>App crashed. <a href="/">Reload</a></div>}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/launch" element={<LaunchPage />} />
          <Route path="/dashboard" element={<Dashboard view="home" />} />
          <Route path="/monitors" element={<Dashboard view="monitors" />} />
          <Route path="/incidents" element={<Dashboard view="incidents" />} />
          <Route path="/status-pages" element={<Dashboard view="status-pages" />} />
          <Route path="/maintenance" element={<Dashboard view="maintenance" />} />
          <Route path="/alerts" element={<Dashboard view="alerts" />} />
          <Route path="/reports" element={<Dashboard view="reports" />} />
          <Route path="/integrations" element={<Dashboard view="integrations" />} />
          <Route path="/settings" element={<Dashboard view="settings" />} />
          <Route path="/urls/:id" element={<UrlDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

function NotFoundPage() {
  useEffect(() => {
    document.title = '404 - Uptime Monitor';
  }, []);

  return (
    <div className="center-state" style={{ minHeight: '100vh' }}>
      <div style={{ fontSize: 22, fontWeight: 600 }}>404 - Page not found</div>
      <Link to="/dashboard">&larr; Back to dashboard</Link>
    </div>
  );
}

export default App;
