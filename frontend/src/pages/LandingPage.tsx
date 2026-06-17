import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const signalTiles = [
  { label: 'Live pulse', value: '99.9%', tone: 'green' },
  { label: 'Edge latency', value: '42ms', tone: 'gold' },
  { label: 'Incidents', value: '0', tone: 'ivory' },
];

export function LandingPage() {
  const [isLoadingIntro, setIsLoadingIntro] = useState(true);
  const [introProgress, setIntroProgress] = useState(0);

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
  const welcomeScale = 1 - introProgress * 0.08;
  const welcomeShift = introProgress * -110;
  const contentLift = introProgress * 42;

  return (
    <main className={`landing-page${isLoadingIntro ? ' intro-loading' : ' intro-ready'}`}>
      {isLoadingIntro && (
        <div className="landing-loader" role="status" aria-live="polite" aria-label="Loading Signal Ascendant">
          <div className="loader-orbit" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="loader-copy">
            <span>Calibrating signals</span>
            <strong>Signal Ascendant</strong>
          </div>
        </div>
      )}

      <section
        className="welcome-stage"
        aria-label="Welcome"
        style={{
          opacity: welcomeOpacity,
          transform: `translateY(${welcomeShift}px) scale(${welcomeScale})`,
        }}
      >
        <div className="welcome-grid" aria-hidden="true" />
        <div className="welcome-mark">UPTIME.9</div>
        <div className="welcome-copy">
          <p className="landing-kicker">The art of precision</p>
          <h1>WELCOME</h1>
          <span>Scroll to enter the command room</span>
        </div>
        <div className="scroll-cue" aria-hidden="true">
          <span />
        </div>
      </section>

      <div
        className="landing-content-reveal"
        style={{
          transform: `translateY(-${contentLift}vh)`,
        }}
      >
        <nav className="landing-nav" aria-label="Primary">
          <Link className="brand-mark" to="/">
            <span className="brand-glyph">U</span>
            <span>Uptime Monitor</span>
          </Link>
          <div className="landing-nav-links">
            <a href="#signals">Signals</a>
            <a href="#precision">Precision</a>
            <Link to="/launch">Console</Link>
          </div>
        </nav>

        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="hero-panel-map">
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

            <div className="map-pin pin-lhr">
              <span className="pin-dot" />
              <div className="pin-label"><strong>LHR</strong><br />Lat 12ms | Ok</div>
            </div>
            <div className="map-pin pin-nyc">
              <span className="pin-dot" />
              <div className="pin-label"><strong>NYC</strong><br />Lat 14ms | Ok</div>
            </div>
            <div className="map-pin pin-sin">
              <span className="pin-dot" />
              <div className="pin-label"><strong>Singapore</strong><br />Lat 20ms | Ok</div>
            </div>
            <div className="map-pin pin-sao">
              <span className="pin-dot" />
              <div className="pin-label"><strong>Sao Paulo</strong><br />Lat 32ms | Ok</div>
            </div>
            <div className="map-pin pin-syd">
              <span className="pin-dot" />
              <div className="pin-label"><strong>Sydney</strong><br />Lat 28ms | Ok</div>
            </div>

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
          </div>

          <div className="landing-copy">
            <p className="landing-kicker">The art of precision</p>
            <h1 id="landing-title">Signal<br />Ascendant</h1>
            <p className="landing-lede">
              A premium command room for tracking uptime, latency, and live service health with
              quiet precision.
            </p>
            <div className="landing-actions">
              <Link className="landing-primary" to="/launch">
                Start monitoring
              </Link>
              <a className="landing-secondary" href="#signals">
                View signals
              </a>
            </div>

            <div className="map-card card-target">
              <div className="target-live">
                <span className="live-dot" /> LIVE
              </div>
              <div className="target-icon" />
              <div className="target-info">
                <strong>TARGET CARD</strong>
                <span>https://api.myapp.com/v1/health</span>
              </div>
            </div>
          </div>
        </section>

        <section id="signals" className="landing-band reveal-on-scroll">
          <div className="landing-band-heading">
            <p className="landing-kicker">Operational clarity</p>
            <h2>Every monitor gets the same visual language.</h2>
          </div>
          <div className="signal-grid">
            {signalTiles.map((tile) => (
              <article className={`signal-tile signal-${tile.tone}`} key={tile.label}>
                <span>{tile.label}</span>
                <strong>{tile.value}</strong>
              </article>
            ))}
          </div>
        </section>

        <section id="precision" className="landing-details reveal-on-scroll">
          <article>
            <span>Sapphire checks</span>
            <p>Live WebSocket updates keep the console aligned with the latest backend signal.</p>
          </article>
          <article>
            <span>Hand stitched history</span>
            <p>Each URL detail view carries latency charts, uptime bars, and recent checks.</p>
          </article>
          <article>
            <span>Concierge controls</span>
            <p>Add, inspect, retry, and delete monitors without leaving the crafted console theme.</p>
          </article>
        </section>
      </div>
    </main>
  );
}
