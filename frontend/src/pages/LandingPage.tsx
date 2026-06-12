import { Link } from 'react-router-dom';

const signalTiles = [
  { label: 'Live pulse', value: '99.9%', tone: 'green' },
  { label: 'Edge latency', value: '42ms', tone: 'gold' },
  { label: 'Incidents', value: '0', tone: 'ivory' },
];

export function LandingPage() {
  return (
    <main className="landing-page">
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
        <div className="landing-copy">
          <p className="landing-kicker">The art of precision</p>
          <h1 id="landing-title">Signal Ascendant</h1>
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
        </div>

        <div className="landing-stage" aria-hidden="true">
          <div className="hero-panel">
            <div className="hero-panel-glow" />
            <div className="orbital-ring ring-one" />
            <div className="orbital-ring ring-two" />
            <div className="signal-core">
              <span />
            </div>
            <div className="scan-lines">
              {Array.from({ length: 7 }, (_, index) => (
                <i key={index} style={{ width: `${92 - index * 9}%` }} />
              ))}
            </div>
          </div>

          <div className="floating-card card-top">
            <span>Global watch</span>
            <strong>12 regions</strong>
          </div>
          <div className="floating-card card-side">
            <span>Response</span>
            <strong>live</strong>
          </div>
          <div className="image-tile tile-one" />
          <div className="image-tile tile-two" />
          <div className="image-tile tile-three" />
        </div>
      </section>

      <section id="signals" className="landing-band">
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

      <section id="precision" className="landing-details">
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
    </main>
  );
}
