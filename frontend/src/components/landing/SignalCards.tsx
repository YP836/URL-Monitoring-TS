import { motion } from 'framer-motion';
import { Activity, AlertTriangle, Clock3, FileSearch, Gauge, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Signal {
  description: string;
  icon: LucideIcon;
  name: string;
}

const signals: Signal[] = [
  { name: 'HTTP', description: 'Availability and response status', icon: Activity },
  { name: 'SSL Certificate', description: 'Expiry and certificate health', icon: ShieldCheck },
  { name: 'Time to First Byte', description: 'Server responsiveness at the edge', icon: Gauge },
  { name: 'Keyword Monitor', description: 'Critical content change detection', icon: FileSearch },
  { name: 'Downtime Duration', description: 'Precise interruption windows', icon: Clock3 },
  { name: 'Error Rate', description: 'Failure patterns before escalation', icon: AlertTriangle },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const card = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

export function SignalCards({ compact = false }: { compact?: boolean }) {
  return (
    <section id="signals" className={`cinematic-signals${compact ? ' cinematic-signals--compact' : ''}`} aria-labelledby="signals-title">
      <div className="cinematic-section-heading">
        <p className="cinematic-eyebrow">Six signals, one source of truth</p>
        <h2 id="signals-title">See the warning signs before they become incidents.</h2>
      </div>
      <motion.div
        className="cinematic-signal-grid"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
      >
        {signals.map(({ description, icon: Icon, name }) => (
          <motion.article className="cinematic-signal-card" key={name} variants={card} whileHover={{ y: -4, borderColor: '#FF6B35' }}>
            <Icon size={22} aria-hidden="true" />
            <h3>{name}</h3>
            <p>{description}</p>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}
