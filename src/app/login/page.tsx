'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await signIn(email, password);

      if (error) {
        setError(error.message || 'Failed to sign in');
      } else {
        // Start users at wizard for guided flow
        router.push('/app/wizard');
        router.refresh();
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15,
      },
    },
  };

  const glowVariants = {
    idle: {
      boxShadow: '0 0 20px rgba(99, 102, 241, 0.15), 0 0 40px rgba(139, 92, 246, 0.1)',
    },
    hover: {
      boxShadow: '0 0 30px rgba(99, 102, 241, 0.25), 0 0 60px rgba(139, 92, 246, 0.15)',
    },
  };

  const inputFocusVariants = {
    idle: {
      boxShadow: '0 0 0 0 rgba(99, 102, 241, 0)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    focus: {
      boxShadow: '0 0 20px rgba(99, 102, 241, 0.3), 0 0 40px rgba(139, 92, 246, 0.1)',
      borderColor: 'rgba(99, 102, 241, 0.5)',
    },
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated background gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[120px]"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[120px]"
          animate={{
            x: [0, -30, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-violet-600/10 blur-[100px]"
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Theme Toggle */}
      <motion.div
        className="absolute top-6 right-6 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: 'spring' }}
      >
        <ThemeToggle size="md" showDropdown={true} />
      </motion.div>

      {/* Main card */}
      <motion.div
        className="max-w-md w-full relative z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div
          className="relative bg-[#12121a]/80 backdrop-blur-2xl rounded-3xl border border-white/[0.08] p-10"
          variants={glowVariants}
          initial="idle"
          whileHover="hover"
          transition={{ duration: 0.3 }}
        >
          {/* Subtle top border glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

          {/* Logo/Title */}
          <motion.div className="text-center mb-10" variants={itemVariants}>
            <motion.div
              className="mb-5 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600"
              animate={{
                boxShadow: [
                  '0 0 20px rgba(99, 102, 241, 0.4)',
                  '0 0 40px rgba(139, 92, 246, 0.4)',
                  '0 0 20px rgba(99, 102, 241, 0.4)',
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                />
              </svg>
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">AI App Builder</h1>
            <p className="text-slate-400 text-sm">Sign in to your account</p>
          </motion.div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div variants={itemVariants}>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <motion.input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={loading}
                required
                className="w-full px-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-slate-500 focus:outline-none transition-colors duration-200"
                variants={inputFocusVariants}
                initial="idle"
                whileFocus="focus"
                autoFocus
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <motion.input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  required
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder-slate-500 focus:outline-none transition-colors duration-200"
                  variants={inputFocusVariants}
                  initial="idle"
                  whileFocus="focus"
                />
                <motion.button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  )}
                </motion.button>
              </div>
            </motion.div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <motion.div variants={itemVariants}>
              <motion.button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full relative px-6 py-4 rounded-xl font-medium text-white overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Button gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%]" />

                {/* Animated shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3,
                    ease: 'easeInOut',
                  }}
                />

                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 blur-xl opacity-50 -z-10" />

                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <motion.div
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                      />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </span>
              </motion.button>
            </motion.div>
          </form>

          {/* Sign Up Link */}
          <motion.div className="mt-8 text-center" variants={itemVariants}>
            <p className="text-sm text-slate-400">
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                Sign up
              </Link>
            </p>
          </motion.div>

          {/* Footer */}
          <motion.div
            className="mt-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2"
            variants={itemVariants}
          >
            <motion.svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </motion.svg>
            Secure authentication with Supabase
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
