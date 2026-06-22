import { motion } from 'framer-motion';
import { ArrowRight, Mail, MessageSquare, Zap } from 'lucide-react';
import { useState } from 'react';

const channels = [
  {
    icon: Zap,
    title: 'Get started free',
    body: 'Create an account, add your first URL, and see a live check result in under 60 seconds. No card required.',
    cta: 'Open the console',
    href: '/signup',
    accent: true,
  },
  {
    icon: MessageSquare,
    title: 'Report a bug or request a feature',
    body: 'Something broken or missing? Open an issue and we will triage it within one business day.',
    cta: 'Open an issue',
    href: 'https://github.com',
    accent: false,
  },
  {
    icon: Mail,
    title: 'Reach the team directly',
    body: 'For enterprise enquiries, data-export requests, or anything that needs a human — send a direct email.',
    cta: 'yatharthsinghgreat@gmail.com',
    href: 'mailto:yatharthsinghgreat@gmail.com',
    accent: false,
  },
];

const revealTransition = { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const };

export function ContactSection() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // mailto fallback — no server needed
    const subject = encodeURIComponent(`Uptime Monitor enquiry from ${form.name}`);
    const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`);
    window.location.href = `mailto:yatharthsinghgreat@gmail.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <section className="ls-contact" id="contact" aria-labelledby="contact-title">
      <div className="ls-container">
        <motion.div
          className="ls-section-head"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={revealTransition}
        >
          <p className="ls-eyebrow">Get in touch</p>
          <h2 id="contact-title">We are here when something matters.</h2>
          <p className="ls-lead">
            Start monitoring in seconds, or send a message if you need a hand.
          </p>
        </motion.div>

        <div className="ls-contact-grid">
          {/* Channel cards */}
          <div className="ls-channel-stack">
            {channels.map(({ icon: Icon, title, body, cta, href, accent }, i) => (
              <motion.a
                key={title}
                className={`ls-channel-card${accent ? ' ls-channel-card--accent' : ''}`}
                href={href}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ ...revealTransition, delay: i * 0.08 }}
                whileHover={{ x: 4 }}
              >
                <div className="ls-channel-icon"><Icon size={20} aria-hidden="true" /></div>
                <div className="ls-channel-copy">
                  <strong>{title}</strong>
                  <p>{body}</p>
                  <span className="ls-channel-cta">{cta} <ArrowRight size={13} aria-hidden="true" /></span>
                </div>
              </motion.a>
            ))}
          </div>

          {/* Contact form */}
          <motion.div
            className="ls-contact-form-wrap"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ ...revealTransition, delay: 0.15 }}
          >
            {submitted ? (
              <div className="ls-form-success">
                <Mail size={32} aria-hidden="true" />
                <h3>Email client opened</h3>
                <p>Your message was pre-filled. Send it from your email client and we will reply within one business day.</p>
              </div>
            ) : (
              <form className="ls-contact-form" onSubmit={handleSubmit} noValidate>
                <h3>Send a message</h3>
                <div className="ls-form-field">
                  <label htmlFor="contact-name">Your name</label>
                  <input
                    id="contact-name"
                    type="text"
                    placeholder="Alex Smith"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="ls-form-field">
                  <label htmlFor="contact-email">Work email</label>
                  <input
                    id="contact-email"
                    type="email"
                    placeholder="alex@company.com"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="ls-form-field">
                  <label htmlFor="contact-message">Message</label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    placeholder="Tell us what you are working on..."
                    required
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  />
                </div>
                <motion.button
                  type="submit"
                  className="cinematic-primary-button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Send message <ArrowRight size={16} aria-hidden="true" />
                </motion.button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
