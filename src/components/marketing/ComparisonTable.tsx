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
        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
          <XMarkIcon size={14} className="text-zinc-600" />
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
    <section className="py-24 px-4 bg-zinc-900/30">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">How We Compare</h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
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
                <th className="text-left p-4 text-zinc-400 font-medium">Feature</th>
                {competitors.map((comp) => (
                  <th
                    key={comp.key}
                    className={`p-4 text-center font-medium ${
                      comp.highlight ? 'text-blue-400 bg-blue-500/10 rounded-t-xl' : 'text-zinc-400'
                    }`}
                  >
                    {comp.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr key={feature.name} className={index % 2 === 0 ? 'bg-zinc-900/50' : ''}>
                  <td className="p-4 text-zinc-300">
                    <span className="flex items-center gap-2">
                      {feature.name}
                      {feature.exclusive && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded uppercase tracking-wide">
                          Exclusive
                        </span>
                      )}
                    </span>
                  </td>
                  {competitors.map((comp) => (
                    <td key={comp.key} className={`p-4 ${comp.highlight ? 'bg-blue-500/5' : ''}`}>
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
          <p className="text-zinc-400 mb-4">Ready to build with the most capable AI app builder?</p>
          <a
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 text-white bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
          >
            Start Building Free
          </a>
        </motion.div>
      </div>
    </section>
  );
}
