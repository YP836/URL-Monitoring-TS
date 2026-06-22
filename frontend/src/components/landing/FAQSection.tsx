import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

const faqs = [
  {
    q: 'How often does Uptime Monitor check my URLs?',
    a: 'By default, checks run every 30 seconds. You can configure the interval per monitor — from 10 seconds for critical endpoints up to 24 hours for low-priority batch jobs. All timing is enforced by Celery Beat on the backend, so drift is minimal.',
  },
  {
    q: 'What check types are available?',
    a: 'Six signal types: HTTP availability (status code and response), SSL certificate expiry, Time to First Byte (TTFB), Keyword presence/absence detection, Downtime duration tracking, and Error rate analysis. You can combine multiple checks on a single monitor.',
  },
  {
    q: 'How do I receive alerts when something goes down?',
    a: 'Alerts route through email, Slack, SMS, and webhooks. Configure routing policies in the Alert Routing page — you can target different channels based on severity (WARN vs DOWN) and assign on-call owners per monitor.',
  },
  {
    q: 'Is my data isolated from other users?',
    a: 'Yes. Every account is fully isolated at the database level. Your monitors, ping history, incidents, alerts, and status pages are never visible or accessible to other tenants.',
  },
  {
    q: 'Can I publish a public status page for my users?',
    a: 'Yes — navigate to Status Pages in the sidebar. You can compose a customer-facing page that shows service health, active incidents, and maintenance windows. Subscribers can opt in to email notifications.',
  },
  {
    q: 'How far back does the ping history go?',
    a: 'History is retained for 90 days by default. Latency charts, uptime bars, SSL timelines, and error-rate trends are all drawn from real stored pings — no estimates or synthetic data.',
  },
  {
    q: 'Does it work with APIs, not just websites?',
    a: 'Yes. Any HTTP or HTTPS endpoint works — REST APIs, GraphQL endpoints, webhooks, CDN origins, third-party services, and internal services exposed via a reverse proxy. KEYWORD checks can also validate specific response body content.',
  },
  {
    q: 'What happens during a planned maintenance window?',
    a: 'Create a maintenance window in the Maintenance page. During that window the monitoring system suppresses alerts and marks status as expected — so on-call stays calm and status pages show the right message to subscribers.',
  },
];

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  const toggle = (index: number) => setOpen(open === index ? null : index);

  return (
    <section className="ls-faq" id="faq" aria-labelledby="faq-title">
      <div className="ls-container ls-container--narrow">
        <motion.div
          className="ls-section-head"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="ls-eyebrow">Frequently asked</p>
          <h2 id="faq-title">Everything you need to know before you start monitoring.</h2>
        </motion.div>

        <motion.div
          className="ls-faq-list"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.65, delay: 0.1 }}
        >
          {faqs.map(({ q, a }, i) => (
            <div className={`ls-faq-item${open === i ? ' ls-faq-item--open' : ''}`} key={q}>
              <button
                type="button"
                className="ls-faq-trigger"
                aria-expanded={open === i}
                onClick={() => toggle(i)}
              >
                <span>{q}</span>
                <motion.span
                  className="ls-faq-chevron"
                  animate={{ rotate: open === i ? 180 : 0 }}
                  transition={{ duration: 0.22 }}
                  aria-hidden="true"
                >
                  <ChevronDown size={18} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    className="ls-faq-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <p>{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
