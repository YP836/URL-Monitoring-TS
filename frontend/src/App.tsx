import { BrowserRouter, Link, Route, Routes, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { LandingPage } from './pages/LandingPage';
import { LaunchPage } from './pages/LaunchPage';
import { UrlDetailPage } from './pages/UrlDetailPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { TeamPage } from './pages/TeamPage';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="center-state">Loading...</div>;
  }
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary fallback={<AppCrashFallback />}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/launch" element={<LaunchPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard view="home" /></ProtectedRoute>} />
            <Route path="/monitors" element={<ProtectedRoute><Dashboard view="monitors" /></ProtectedRoute>} />
            <Route path="/incidents" element={<ProtectedRoute><Dashboard view="incidents" /></ProtectedRoute>} />
            <Route path="/status-pages" element={<ProtectedRoute><Dashboard view="status-pages" /></ProtectedRoute>} />
            <Route path="/maintenance" element={<ProtectedRoute><Dashboard view="maintenance" /></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute><Dashboard view="alerts" /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Dashboard view="reports" /></ProtectedRoute>} />
            <Route path="/integrations" element={<ProtectedRoute><Dashboard view="integrations" /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Dashboard view="settings" /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
            <Route path="/urls/:id" element={<ProtectedRoute><UrlDetailPage /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

function AppCrashFallback() {
  return (
    <div className="center-state" style={{ minHeight: '100vh' }}>
      <div className="state-card">
        <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>Something needs a refresh</div>
        <p style={{ margin: '8px 0 16px', color: '#667085' }}>
          The app hit an unexpected state. Your saved monitors are safe.
        </p>
        <button className="primary" type="button" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    </div>
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
