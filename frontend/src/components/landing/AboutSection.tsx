import { motion } from 'framer-motion';
import { Globe, Shield, Zap } from 'lucide-react';

const pillars = [
  {
    icon: Zap,
    title: 'Built for speed',
    body: 'Checks run every 30 seconds from the edge. Millisecond-precision latency, TTFB, and P95 data reach your dashboard before your users feel the slowdown.',
  },
  {
    icon: Shield,
    title: 'Signal over noise',
    body: 'Six purpose-built check types — HTTP, SSL, TTFB, Keyword, Downtime, Error Rate — give you exactly what matters without flooding on-call with false positives.',
  },
  {
    icon: Globe,
    title: 'Multi-tenant by design',
    body: 'Each workspace is fully isolated. Teams, monitors, alerts, and status pages belong to the account that created them — nothing bleeds across tenants.',
  },
];

const revealTransition = { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const };

export function AboutSection() {
  return (
    <section className="ls-about" id="about" aria-labelledby="about-title">
      <div className="ls-container">
        <motion.div
          className="ls-section-head"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={revealTransition}
        >
          <p className="ls-eyebrow">About Uptime Monitor</p>
          <h2 id="about-title">Precision visibility built for teams that cannot afford to guess.</h2>
          <p className="ls-lead">
            We built Uptime Monitor after watching too many incidents discovered by end users instead of engineers.
            The product exists to flip that script — real-time signals, clear ownership, and evidence-grade history
            so every degradation is caught, understood, and resolved before it becomes a headline.
          </p>
        </motion.div>

        <div className="ls-pillars">
          {pillars.map(({ icon: Icon, title, body }, i) => (
            <motion.article
              className="ls-pillar-card"
              key={title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ ...revealTransition, delay: i * 0.1 }}
              whileHover={{ y: -5, borderColor: '#FF6B35' }}
            >
              <div className="ls-pillar-icon">
                <Icon size={22} aria-hidden="true" />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </motion.article>
          ))}
        </div>

        <motion.div
          className="ls-stats-strip"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ ...revealTransition, delay: 0.2 }}
        >
          {[
            { value: '99.98%', label: 'Fleet availability SLA' },
            { value: '<30s', label: 'Detection to alert' },
            { value: '6', label: 'Check signal types' },
            { value: '90-day', label: 'Historical evidence window' },
          ].map(({ value, label }) => (
            <div className="ls-stat" key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
