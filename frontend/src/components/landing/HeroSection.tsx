import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, RadioTower } from 'lucide-react';

interface HeroSectionProps {
  compact?: boolean;
  isNavigating: boolean;
  onStartMonitoring: () => void;
}

const revealTransition = { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const };

export function HeroSection({ compact = false, isNavigating, onStartMonitoring }: HeroSectionProps) {
  return (
    <section className={`cinematic-hero${compact ? ' cinematic-hero--compact' : ''}`} aria-labelledby="landing-title">
      <motion.div
        className="cinematic-hero-copy"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={revealTransition}
      >
        <p className="cinematic-eyebrow"><RadioTower size={14} aria-hidden="true" /> Uptime monitoring reimagined</p>
        <h1 id="landing-title">Your infrastructure,<br />always on.</h1>
        <p className="cinematic-lede">
          Monitor URLs, APIs, and services with millisecond precision. Know before your users do.
        </p>
        <div className="cinematic-actions">
          <motion.button
            className="cinematic-primary-button"
            type="button"
            aria-label="Start monitoring your URLs"
            disabled={isNavigating}
            onClick={onStartMonitoring}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {isNavigating ? 'Opening console' : 'Start Monitoring'} <ArrowRight size={17} aria-hidden="true" />
          </motion.button>
          <motion.a href="#signals" whileHover={{ x: 3 }} whileTap={{ scale: 0.98 }}>
            See how it works <ArrowRight size={15} aria-hidden="true" />
          </motion.a>
        </div>
      </motion.div>

      <motion.aside
        className="cinematic-hero-status"
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ ...revealTransition, delay: 0.12 }}
        aria-label="Monitoring status summary"
      >
        <div className="cinematic-status-topline"><span>Live command view</span><span className="cinematic-live-dot" /> Online</div>
        <div className="cinematic-status-display">
          <span>Fleet availability</span>
          <strong>99.98%</strong>
          <small>Across the last 30 days</small>
        </div>
        <div className="cinematic-status-metrics">
          <span><CheckCircle2 size={16} aria-hidden="true" /> 128 monitored services</span>
          <span><CheckCircle2 size={16} aria-hidden="true" /> 0 active incidents</span>
        </div>
      </motion.aside>
    </section>
  );
}
