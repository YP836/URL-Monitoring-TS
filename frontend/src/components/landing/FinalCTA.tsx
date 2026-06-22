import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface FinalCTAProps {
  compact?: boolean;
  isNavigating: boolean;
  onStartMonitoring: () => void;
}

export function FinalCTA({ compact = false, isNavigating, onStartMonitoring }: FinalCTAProps) {
  return (
    <motion.section
      className={`cinematic-final-cta${compact ? ' cinematic-final-cta--compact' : ''}`}
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <p className="cinematic-eyebrow">Ready when your users need you</p>
      <h2>Start monitoring in 60 seconds.</h2>
      <p>No card required. Connect the first endpoint and let the signal do the rest.</p>
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
    </motion.section>
  );
}
