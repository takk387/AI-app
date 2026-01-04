'use client';

import { motion } from 'framer-motion';
import { CheckIcon, XMarkIcon, MinusIcon } from '@/components/ui/Icons';

const features = [
  // EXCLUSIVE FEATURES - Only AI App Builder has these
  {
    name: 'Natural Conversation Wizard',
    us: true,
    v0: false,
    bolt: false,
    lovable: false,
    replit: false,
    base44: false,
    exclusive: true,
  },
  {
    name: 'Dual AI System (Gemini + Claude)',
    us: true,
    v0: false,
    bolt: false,
    lovable: false,
    replit: false,
    base44: false,
    exclusive: true,
  },
  {
    name: 'Phased Generation (2-25+ phases)',
    us: true,
    v0: false,
    bolt: false,
    lovable: false,
    replit: false,
    base44: false,
    exclusive: true,
  },
  {
    name: 'Custom Architecture Generation',
    us: true,
    v0: false,
    bolt: false,
    lovable: false,
    replit: false,
    base44: false,
    exclusive: true,
  },
  {
    name: 'Project Documentation Generator',
    us: true,
    v0: false,
    bolt: false,
    lovable: false,
    replit: false,
    base44: false,
    exclusive: true,
  },
  {
    name: 'Planned vs Built Comparison',
    us: true,
    v0: false,
    bolt: false,
    lovable: false,
    replit: false,
    base44: false,
    exclusive: true,
  },
  // COMMON FEATURES - Others may have some of these
  {
    name: 'Vision Input (Screenshots)',
    us: true,
    v0: true,
    bolt: 'partial',
    lovable: true,
    replit: false,
    base44: true,
    exclusive: false,
  },
  {
    name: 'Full-Stack Generation',
    us: true,
    v0: false,
    bolt: true,
    lovable: true,
    replit: true,
    base44: true,
    exclusive: false,
  },
  {
    name: 'Built-in Version Control',
    us: true,
    v0: false,
    bolt: true,
    lovable: 'partial',
    replit: true,
    base44: true,
    exclusive: false,
  },
  {
    name: 'Real-Time Preview',
    us: true,
    v0: true,
    bolt: true,
    lovable: true,
    replit: true,
    base44: true,
    exclusive: false,
  },
];

const competitors = [
  { key: 'us', name: 'AI App Builder', highlight: true },
  { key: 'v0', name: 'v0.dev', highlight: false },
  { key: 'bolt', name: 'bolt.new', highlight: false },
  { key: 'lovable', name: 'Lovable', highlight: false },
  { key: 'replit', name: 'Replit Agent', highlight: false },
  { key: 'base44', name: 'Base44', highlight: false },
];

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <div className="flex items-center justify-center">
        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckIcon size={14} className="text-green-400" />
        </div>
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="flex items-center justify-center">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          <XMarkIcon size={14} style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center">
      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
        <MinusIcon size={14} className="text-amber-400" />
      </div>
    </div>
  );
}

export function ComparisonTable() {
  return (
    <section className="py-24 px-4" style={{ background: 'var(--bg-secondary)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            How We Compare
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            See how AI App Builder stacks up against other popular AI code generators.
          </p>
        </div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="overflow-x-auto"
        >
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th
                  className="text-left p-4 font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Feature
                </th>
                {competitors.map((comp) => (
                  <th
                    key={comp.key}
                    className={`p-4 text-center font-medium ${
                      comp.highlight ? 'text-garden-400 bg-garden-500/10 rounded-t-xl' : ''
                    }`}
                    style={!comp.highlight ? { color: 'var(--text-secondary)' } : undefined}
                  >
                    {comp.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr
                  key={feature.name}
                  style={index % 2 === 0 ? { background: 'var(--bg-tertiary)' } : undefined}
                >
                  <td className="p-4" style={{ color: 'var(--text-primary)' }}>
                    <span className="flex items-center gap-2">
                      {feature.name}
                      {feature.exclusive && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-garden-500 to-gold-500 text-white rounded uppercase tracking-wide">
                          Exclusive
                        </span>
                      )}
                    </span>
                  </td>
                  {competitors.map((comp) => (
                    <td key={comp.key} className={`p-4 ${comp.highlight ? 'bg-garden-500/5' : ''}`}>
                      <FeatureCell
                        value={feature[comp.key as keyof typeof feature] as boolean | string}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-12 text-center"
        >
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
            Ready to build with the most capable AI app builder?
          </p>
          <a
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 text-white bg-garden-600 hover:bg-garden-500 rounded-lg font-medium transition-colors"
          >
            Start Building Free
          </a>
        </motion.div>
      </div>
    </section>
  );
}
