'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { RocketIcon, SparklesIcon } from '@/components/ui/Icons';

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden">
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute top-1/3 -right-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]"
          animate={{
            x: [0, -30, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute -bottom-1/4 left-1/3 w-[400px] h-[400px] bg-cyan-600/15 rounded-full blur-[100px]"
          animate={{
            x: [0, 40, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8"
        >
          <SparklesIcon size={16} className="text-blue-400" />
          <span className="text-sm text-blue-400">Powered by Claude AI</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
        >
          Build Full-Stack{' '}
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            React Apps
          </span>
          <br />
          with AI
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto"
        >
          The only AI app builder with planning mode, visual design understanding, and intelligent
          phased code generation. Not just components — complete applications.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/signup"
            className="group flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:scale-105"
          >
            <RocketIcon size={20} />
            <span>Get Started Free</span>
          </Link>
          <Link
            href="/docs"
            className="px-8 py-4 text-lg font-semibold text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-xl transition-all hover:bg-white/5"
          >
            See How It Works
          </Link>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 pt-8 border-t border-zinc-800"
        >
          <p className="text-sm text-zinc-500 mb-4">Trusted by developers building with AI</p>
          <div className="flex items-center justify-center gap-8 text-zinc-600">
            <span className="text-2xl font-bold">React</span>
            <span className="text-2xl font-bold">Next.js</span>
            <span className="text-2xl font-bold">TypeScript</span>
            <span className="text-2xl font-bold">Tailwind</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
