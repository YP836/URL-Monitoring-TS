import { motion } from 'framer-motion';
import { useRef, useState, type ReactNode } from 'react';

const ease = [0.16, 1, 0.3, 1] as const;

interface ScrollCanvasProps {
  cta?: ReactNode;
}

export function ScrollCanvas({ cta }: ScrollCanvasProps) {
  const videoRef          = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  return (
    <section
      className="cinematic-intro cinematic-intro--autoplay"
      aria-label="Cinematic introduction"
    >
      <div className="cinematic-canvas-stage">

        <video
          ref={videoRef}
          className={`cinematic-canvas${ready ? ' cinematic-canvas--ready' : ''}`}
          autoPlay
          muted
          loop
          playsInline
          onCanPlay={() => setReady(true)}
          aria-label="Live monitoring station background"
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>

        <div className="cinematic-canvas-scrim" aria-hidden="true" />
        <div className="cinematic-intro-brand" aria-hidden="true">
          <span className="cinematic-brand-mark">U</span>
          <span>Uptime Monitor</span>
        </div>

        <div className="cinematic-story" id="landing-content">
          <motion.div
            className="cinematic-story-layer cinematic-story-layer--cta"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.4 }}
          >
            {cta}
          </motion.div>
        </div>

      </div>
    </section>
  );
}
