'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/contexts/AuthContext';
import { RocketIcon, WandIcon, LayoutIcon, SaveIcon, MenuIcon, CheckIcon } from './ui/Icons';

// Navigation items in guided flow order
const navItems = [
  {
    href: '/app/wizard',
    label: 'Wizard',
    step: 1,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    ),
    description: 'Plan your app',
  },
  {
    href: '/app/design',
    label: 'Design',
    step: 2,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
        />
      </svg>
    ),
    description: 'Design layouts',
  },
  {
    href: '/app/build',
    label: 'Build',
    step: 3,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
    description: 'Generate code',
  },
  {
    href: '/app',
    label: 'Builder',
    step: 4,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    description: 'Edit & preview',
  },
];

interface AppNavigationProps {
  projectName?: string;
  onSave?: () => void;
  isSaving?: boolean;
  onMenuClick?: () => void;
}

export function AppNavigation({
  projectName = 'Untitled Project',
  onSave,
  isSaving,
  onMenuClick,
}: AppNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  // Get completed steps from store
  const appConcept = useAppStore((state) => state.appConcept);
  const currentLayoutDesign = useAppStore((state) => state.currentLayoutDesign);
  const newAppStagePlan = useAppStore((state) => state.newAppStagePlan);

  // Determine completed steps based on state
  const completedSteps = {
    1: !!appConcept, // Wizard completed if appConcept exists
    2: !!currentLayoutDesign, // Design completed if layout exists
    3: !!newAppStagePlan, // Build completed if stage plan exists
    4: false, // Builder is the final destination
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-[1800px] mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Project Name */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <RocketIcon size={18} className="text-white" />
              </div>
            </Link>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm font-medium text-white">{projectName}</span>
              <span className="text-xs text-zinc-500">v1.0.0</span>
            </div>
          </div>

          {/* Navigation Steps */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href;
              const isCompleted = completedSteps[item.step as keyof typeof completedSteps];

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200
                    ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border border-blue-500/30'
                        : isCompleted
                          ? 'text-zinc-300 hover:text-white hover:bg-white/5'
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                    }
                  `}
                  title={item.description}
                >
                  {/* Step indicator */}
                  <div
                    className={`
                    w-5 h-5 rounded-full flex items-center justify-center text-xs
                    ${
                      isActive
                        ? 'bg-blue-500 text-white'
                        : isCompleted
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-zinc-800 text-zinc-500'
                    }
                  `}
                  >
                    {isCompleted ? <CheckIcon size={12} /> : item.step}
                  </div>
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Skip to Builder - Show on non-builder pages */}
            {pathname !== '/app' && (
              <button
                onClick={() => router.push('/app')}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Skip to Builder →
              </button>
            )}

            {/* Save Button */}
            {onSave && (
              <button
                onClick={onSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SaveIcon size={16} />
                <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
              </button>
            )}

            {/* Menu Button */}
            <button
              onClick={onMenuClick}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-400 hover:text-white transition-colors"
              title="Menu"
            >
              <MenuIcon size={18} />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const isCompleted = completedSteps[item.step as keyof typeof completedSteps];

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap
                  transition-colors
                  ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : isCompleted
                        ? 'text-zinc-400 bg-zinc-800/50'
                        : 'text-zinc-500'
                  }
                `}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800'
                  }`}
                >
                  {isCompleted ? <CheckIcon size={10} /> : item.step}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default AppNavigation;
