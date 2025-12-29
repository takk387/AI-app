'use client';

import { motion } from 'framer-motion';
import {
  MessageSquareIcon,
  BrainIcon,
  CubeIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  ListChecksIcon,
} from '@/components/ui/Icons';

const features = [
  {
    icon: MessageSquareIcon,
    title: 'Natural Conversation Wizard',
    description:
      'EXCLUSIVE: Not just a chat — a structured concept-building system. AI extracts your app concept from natural conversation with draft persistence, so you can resume where you left off.',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    icon: BrainIcon,
    title: 'Dual AI System (Gemini + Claude)',
    description:
      'EXCLUSIVE: Two AI models working together. Gemini as Creative Director for visual analysis, Claude as Precision Architect for code. Intelligent routing picks the right AI for each task.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: CubeIcon,
    title: 'Intelligent Phased Generation',
    description:
      'EXCLUSIVE: Build complex apps in 2-25+ intelligent phases based on complexity. Each phase is reviewed, validated, and tested before proceeding — no broken one-shot generations.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: CodeBracketIcon,
    title: 'Custom Architecture Generation',
    description:
      'EXCLUSIVE: AI reasons through your architecture from scratch — not templates. Uses extended thinking to generate custom Prisma schemas, API routes, and RBAC tailored to your app.',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: DocumentTextIcon,
    title: 'Project Documentation Generator',
    description:
      'EXCLUSIVE: Records ALL planning information automatically. Captures ConceptSnapshot, LayoutSnapshot, PlanSnapshot at every milestone — go back and see what was planned at any point.',
    gradient: 'from-red-500 to-rose-500',
  },
  {
    icon: ListChecksIcon,
    title: 'Builder Tab (Planned vs Built)',
    description:
      "EXCLUSIVE: See what's being built in each phase. Compare what was planned vs what was actually built with visual side-by-side comparison — ensure everything is correct before moving on.",
    gradient: 'from-indigo-500 to-violet-500',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export function FeaturesGrid() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Why Developers Choose Us
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Built different from the ground up. Features that actually matter for building real
            applications.
          </p>
        </div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group relative p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all hover:bg-zinc-900/80"
            >
              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                <feature.icon size={24} className="text-white" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-zinc-400 leading-relaxed">{feature.description}</p>

              {/* Hover Glow */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity`}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
