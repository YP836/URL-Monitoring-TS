import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';

const signalTiles = [
  { label: 'Live pulse', value: '99.9%', tone: 'green' },
  { label: 'Edge latency', value: '42ms', tone: 'gold' },
  { label: 'Incidents', value: '0', tone: 'ivory' },
];

export function LandingPage() {
  const [isLoadingIntro, setIsLoadingIntro] = useState(true);
  const [introProgress, setIntroProgress] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    document.title = 'Signal Ascendant - Uptime Monitor';
    const timer = window.setTimeout(() => setIsLoadingIntro(false), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let frame = 0;

    const updateProgress = () => {
      const viewportHeight = Math.max(window.innerHeight, 1);
      const nextProgress = Math.min(Math.max(window.scrollY / viewportHeight, 0), 1);
      setIntroProgress(nextProgress);
      frame = 0;
    };

    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const welcomeOpacity = Math.max(0.12, 1 - introProgress * 0.86);
  const welcomeScale = prefersReducedMotion ? 1 : 1 - introProgress * 0.08;
  const welcomeShift = prefersReducedMotion ? 0 : introProgress * -110;
  const contentLift = prefersReducedMotion ? 0 : introProgress * 42;
  const motionTransition = { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <main className={`landing-page${isLoadingIntro ? ' intro-loading' : ' intro-ready'}`}>
      <AnimatePresence>
        {isLoadingIntro && (
          <motion.div
            className="landing-loader"
            role="status"
            aria-live="polite"
            aria-label="Loading Signal Ascendant"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="loader-orbit"
              aria-hidden="true"
              animate={prefersReducedMotion ? undefined : { rotate: 360 }}
              transition={{ duration: 6, ease: 'linear', repeat: Infinity }}
            >
              <span />
              <span />
              <span />
            </motion.div>
            <motion.div
              className="loader-copy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.45 }}
            >
              <span>Calibrating signals</span>
              <strong>Signal Ascendant</strong>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.section
        className="welcome-stage"
        aria-label="Welcome"
        initial={{ opacity: 0, y: 24, scale: 0.98, filter: 'blur(10px)' }}
        animate={{
          opacity: welcomeOpacity,
          y: welcomeShift,
          scale: welcomeScale,
          filter: introProgress > 0.72 && !prefersReducedMotion ? 'blur(8px)' : 'blur(0px)',
        }}
        transition={motionTransition}
      >
        <div className="welcome-grid" aria-hidden="true" />
        <motion.div
          className="welcome-mark"
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 2.05, duration: 0.45 }}
        >
          UPTIME.9
        </motion.div>
        <motion.div
          className="welcome-copy"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="landing-kicker">The art of precision</p>
          <h1>WELCOME</h1>
          <span>Scroll to enter the command room</span>
        </motion.div>
        <motion.div
          className="scroll-cue"
          aria-hidden="true"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: introProgress > 0.18 ? 0 : 1, y: 0 }}
          transition={{ delay: 2.4, duration: 0.45 }}
        >
          <span />
        </motion.div>
      </motion.section>

      <motion.div
        className="landing-content-reveal"
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 80 }}
        animate={{
          opacity: isLoadingIntro ? 0 : 1,
          y: isLoadingIntro ? 80 : `-${contentLift}vh`,
        }}
        transition={motionTransition}
      >
        <motion.nav
          className="landing-nav"
          aria-label="Primary"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: isLoadingIntro ? 0 : 1, y: isLoadingIntro ? -18 : 0 }}
          transition={{ delay: 0.1, duration: 0.45 }}
        >
          <Link className="brand-mark" to="/">
            <span className="brand-glyph">U</span>
            <span>Uptime Monitor</span>
          </Link>
          <div className="landing-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a href="#signals">Signals</a>
            <a href="#precision">Precision</a>
            <Link to="/launch">Console</Link>
            <div style={{ width: '1px', height: '16px', backgroundColor: '#e5e7eb', margin: '0 8px' }} />
            <Link to="/login" style={{ color: '#4b5563', textDecoration: 'none', fontWeight: 500 }}>Log in</Link>
            <Link to="/signup" style={{ 
              backgroundColor: '#FF6B4A', 
              color: 'white', 
              padding: '6px 14px', 
              borderRadius: '6px',
              fontWeight: 500,
              textDecoration: 'none',
              boxShadow: '0 2px 4px rgba(255, 107, 74, 0.2)'
            }}>Sign up</Link>
          </div>
        </motion.nav>

        <section className="landing-hero" aria-labelledby="landing-title">
          <motion.div
            className="hero-panel-map"
            initial={{ opacity: 0, x: 36, scale: 0.985 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="map-header">GEO-SPECIFIC STATUS</div>

            <div className="map-layer">
              <img src="/world-map.svg" alt="World Map" className="world-map-img" />
              <svg viewBox="0 0 1000 500" className="map-connections" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5">
                <path d="M 450 160 Q 360 140 280 200" strokeDasharray="4 4" />
                <path d="M 450 160 Q 600 180 750 275" strokeDasharray="4 4" />
                <path d="M 450 160 Q 400 250 350 350" strokeDasharray="4 4" />
                <path d="M 450 160 Q 650 300 880 400" strokeDasharray="4 4" />
                <circle cx="450" cy="160" r="40" stroke="rgba(0,0,0,0.05)" />
                <circle cx="450" cy="160" r="100" stroke="rgba(0,0,0,0.03)" />
                <circle cx="450" cy="160" r="180" stroke="rgba(0,0,0,0.02)" />
              </svg>
            </div>

            <motion.div className="map-pin pin-lhr" whileHover={{ y: -4, scale: 1.04 }}>
              <span className="pin-dot" />
              <div className="pin-label"><strong>LHR</strong><br />Lat 12ms | Ok</div>
            </motion.div>
            <motion.div className="map-pin pin-nyc" whileHover={{ y: -4, scale: 1.04 }}>
              <span className="pin-dot" />
              <div className="pin-label"><strong>NYC</strong><br />Lat 14ms | Ok</div>
            </motion.div>
            <motion.div className="map-pin pin-sin" whileHover={{ y: -4, scale: 1.04 }}>
              <span className="pin-dot" />
              <div className="pin-label"><strong>Sydney</strong><br />Lat 20ms | Ok</div>
            </motion.div>
            <motion.div className="map-pin pin-sao" whileHover={{ y: -4, scale: 1.04 }}>
              <span className="pin-dot" />
              <div className="pin-label"><strong>Sao Paulo</strong><br />Lat 32ms | Ok</div>
            </motion.div>


            <div className="map-card card-global">
              <span>Global reach</span>
              <strong>12 regions</strong>
            </div>

            <div className="map-card card-latency">
              <span>LATENCY PROFILE</span>
              <div className="latency-mini-chart">
                <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                  <path d="M0,30 L10,28 L20,32 L30,25 L40,28 L50,15 L60,25 L70,35 L80,5 L90,28 L100,25" fill="none" stroke="#A9A195" strokeWidth="2" />
                  <path d="M0,40 L0,30 L10,28 L20,32 L30,25 L40,28 L50,15 L60,25 L70,35 L80,5 L90,28 L100,25 L100,40 Z" fill="rgba(0,0,0,0.04)" />
                </svg>
              </div>
              <div className="latency-stats">
                Avg. Latency: 18ms<br />P95: 22ms
              </div>
            </div>

            <div className="map-footer">
              <strong>GLOBAL COVERAGE:</strong> 9 aggregate status from 12 regional check points. Detailed region map active.
            </div>
          </motion.div>

          <motion.div
            className="landing-copy"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="landing-kicker">The art of precision</p>
            <h1 id="landing-title">Signal<br />Ascendant</h1>
            <p className="landing-lede">
              A premium command room for tracking uptime, latency, and live service health with
              quiet precision.
            </p>
            <div className="landing-actions">
              <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link className="landing-primary" to="/launch">
                Start monitoring
                </Link>
              </motion.div>
              <motion.a className="landing-secondary" href="#signals" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                View signals
              </motion.a>
            </div>

            <motion.div
              className="map-card card-target"
              whileHover={{ y: -6, rotate: -0.6, boxShadow: '0 30px 80px rgba(245, 101, 101, 0.18)' }}
            >
              <div className="target-live">
                <span className="live-dot" /> LIVE
              </div>
              <div className="target-icon" />
              <div className="target-info">
                <strong>TARGET CARD</strong>
                <span>https://api.myapp.com/v1/health</span>
              </div>
            </motion.div>
          </motion.div>
        </section>

        <motion.section
          id="signals"
          className="landing-band reveal-on-scroll"
          initial={{ opacity: 0, y: 42 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ duration: 0.55 }}
        >
          <div className="landing-band-heading">
            <p className="landing-kicker">Operational clarity</p>
            <h2>Every monitor gets the same visual language.</h2>
          </div>
          <div className="signal-grid">
            {signalTiles.map((tile, index) => (
              <motion.article
                className={`signal-tile signal-${tile.tone}`}
                key={tile.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                whileHover={{ y: -6, scale: 1.015 }}
              >
                <span>{tile.label}</span>
                <strong>{tile.value}</strong>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="precision"
          className="landing-details reveal-on-scroll"
          initial={{ opacity: 0, y: 42 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55 }}
        >
          <motion.article whileHover={{ y: -5 }}>
            <span>Sapphire checks</span>
            <p>Live WebSocket updates keep the console aligned with the latest backend signal.</p>
          </motion.article>
          <motion.article whileHover={{ y: -5 }}>
            <span>Hand stitched history</span>
            <p>Each URL detail view carries latency charts, uptime bars, and recent checks.</p>
          </motion.article>
          <motion.article whileHover={{ y: -5 }}>
            <span>Concierge controls</span>
            <p>Add, inspect, retry, and delete monitors without leaving the crafted console theme.</p>
          </motion.article>
        </motion.section>
      </motion.div>
    </main>
  );
}
