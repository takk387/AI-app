'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  RocketIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
} from '@/components/ui/Icons';

const docsDropdownItems = [
  { label: 'User Guides', href: '/docs', description: 'Learn how to use the app builder' },
  { label: 'Terms of Service', href: '/terms', description: 'Our terms and conditions' },
  { label: 'Privacy Policy', href: '/privacy', description: 'How we handle your data' },
];

export function MarketingNav() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [docsDropdownOpen, setDocsDropdownOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <RocketIcon size={18} className="text-white" />
            </div>
            <span className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
              AI App Builder
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {/* Documents Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDocsDropdownOpen(!docsDropdownOpen)}
                onBlur={() => setTimeout(() => setDocsDropdownOpen(false), 150)}
                className="flex items-center gap-1 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                <DocumentTextIcon size={16} />
                <span>Documents</span>
                <ChevronDownIcon
                  size={14}
                  className={`transition-transform ${docsDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {docsDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
                  {docsDropdownItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-4 py-3 hover:bg-zinc-800 transition-colors"
                    >
                      <div className="text-sm font-medium text-white">{item.label}</div>
                      <div className="text-xs text-zinc-500">{item.description}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Pricing */}
            <Link
              href="/pricing"
              className="flex items-center gap-1 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <CurrencyDollarIcon size={16} />
              <span>Pricing</span>
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Link
                href="/app"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
              >
                Go to App
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-white"
          >
            {mobileMenuOpen ? <XMarkIcon size={24} /> : <Bars3Icon size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-zinc-900 border-t border-zinc-800">
          <div className="px-4 py-4 space-y-2">
            <Link
              href="/docs"
              className="block px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              User Guides
            </Link>
            <Link
              href="/terms"
              className="block px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="block px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              Privacy Policy
            </Link>
            <Link
              href="/pricing"
              className="block px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <div className="pt-4 border-t border-zinc-800 space-y-2">
              {user ? (
                <Link
                  href="/app"
                  className="block px-4 py-2 text-center text-white bg-blue-600 hover:bg-blue-500 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Go to App
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block px-4 py-2 text-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="block px-4 py-2 text-center text-white bg-blue-600 hover:bg-blue-500 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
