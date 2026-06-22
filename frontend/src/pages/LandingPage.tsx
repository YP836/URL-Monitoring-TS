import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AboutSection } from '../components/landing/AboutSection';
import { ContactSection } from '../components/landing/ContactSection';
import { FAQSection } from '../components/landing/FAQSection';
import { FinalCTA } from '../components/landing/FinalCTA';
import { LandingFooter } from '../components/landing/LandingFooter';
import { ScrollCanvas } from '../components/landing/ScrollCanvas';
import '../styles/landing.css';

export function LandingPage() {
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();
  const navigationTimer = useRef<number>();

  useEffect(() => {
    document.title = 'Uptime Monitor | Precision visibility';
    return () => window.clearTimeout(navigationTimer.current);
  }, []);

  const startMonitoring = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    navigationTimer.current = window.setTimeout(() => navigate('/dashboard'), 220);
  };

  return (
    <main className={`cinematic-landing${isNavigating ? ' cinematic-landing--exiting' : ''}`}>
      {/* Cinematic scroll-driven / auto-play intro */}
      <ScrollCanvas
        cta={<FinalCTA compact isNavigating={isNavigating} onStartMonitoring={startMonitoring} />}
      />

      {/* Standard page sections below the cinematic intro */}
      <div className="ls-page-sections">
        <AboutSection />
        <FAQSection />
        <ContactSection />
        <LandingFooter />
      </div>
    </main>
  );
}
