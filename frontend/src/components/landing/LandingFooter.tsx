import { motion } from 'framer-motion';
import { RadioTower } from 'lucide-react';

const links = [
  { label: 'About', href: '#about' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
  { label: 'API Docs', href: '/api/docs' },
  { label: 'Status', href: '/dashboard' },
  { label: 'Sign up', href: '/signup' },
];

export function LandingFooter() {
  return (
    <motion.footer
      className="ls-footer"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6 }}
    >
      <div className="ls-container ls-footer-inner">
        <div className="ls-footer-brand">
          <span className="cinematic-brand-mark" aria-hidden="true">U</span>
          <span>Uptime Monitor</span>
        </div>

        <nav className="ls-footer-nav" aria-label="Footer navigation">
          {links.map(({ label, href }) => (
            <a key={label} href={href}>{label}</a>
          ))}
        </nav>

        <div className="ls-footer-bottom">
          <p>
            <RadioTower size={13} aria-hidden="true" />
            &nbsp;Real-time monitoring for URLs, APIs, and services.
          </p>
          <p>&copy; {new Date().getFullYear()} Uptime Monitor. Built with precision.</p>
        </div>
      </div>
    </motion.footer>
  );
}
