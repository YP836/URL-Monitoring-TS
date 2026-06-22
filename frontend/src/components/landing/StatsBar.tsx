import { motion } from 'framer-motion';
import { BellRing, CircleGauge, Network } from 'lucide-react';

const stats = [
  { value: '99.9%', label: 'uptime visibility', icon: CircleGauge },
  { value: '< 30s', label: 'alert time', icon: BellRing },
  { value: '6', label: 'signal types', icon: Network },
];

export function StatsBar() {
  return (
    <motion.section
      className="cinematic-stats"
      aria-label="Platform highlights"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6 }}
    >
      {stats.map(({ icon: Icon, label, value }) => (
        <div className="cinematic-stat" key={label}>
          <Icon size={20} aria-hidden="true" />
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </motion.section>
  );
}
