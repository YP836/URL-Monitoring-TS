import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function LaunchPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Opening console - Uptime Monitor';
    const timer = window.setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <main className="launch-page" aria-live="polite" aria-busy="true">
      <section className="launch-frame" aria-label="Opening monitoring console">
        <div className="launch-brand">UPTIME<span>.9</span></div>
        <div className="launch-scan" />
        <div className="launch-copy">
          <span>Opening monitoring console</span>
          <strong>WATCH EVERY URL</strong>
          <strong>BEFORE IT FAILS</strong>
        </div>
      </section>
    </main>
  );
}
