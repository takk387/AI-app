'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeContext } from '@/contexts/ThemeContext';
import {
  RocketIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
  LayoutIcon,
} from '@/components/ui/Icons';

const docsDropdownItems = [
  { label: 'User Guides', href: '/docs', description: 'Learn how to use the app builder' },
  { label: 'Terms of Service', href: '/terms', description: 'Our terms and conditions' },
  { label: 'Privacy Policy', href: '/privacy', description: 'How we handle your data' },
];

export function MarketingNav() {
  const { user } = useAuth();
  const { resolvedTheme, toggleTheme } = useThemeContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [docsDropdownOpen, setDocsDropdownOpen] = useState(false);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b"
      style={{ background: 'var(--nav-bg)', borderColor: 'var(--border-color)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-garden-500 to-gold-500 flex items-center justify-center">
              <RocketIcon size={18} className="text-white" />
            </div>
            <span
              className="text-lg font-semibold group-hover:text-garden-400 transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
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
                className="flex items-center gap-1 px-4 py-2 text-sm transition-colors rounded-lg"
                style={{ color: 'var(--text-secondary)' }}
              >
                <DocumentTextIcon size={16} />
                <span>Documents</span>
                <ChevronDownIcon
                  size={14}
                  className={`transition-transform ${docsDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {docsDropdownOpen && (
                <div
                  className="absolute top-full left-0 mt-2 w-64 rounded-xl shadow-xl overflow-hidden"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {docsDropdownItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-4 py-3 transition-colors"
                      style={{ background: 'var(--bg-secondary)' }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = 'var(--bg-tertiary)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = 'var(--bg-secondary)')
                      }
                    >
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {item.label}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {item.description}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Pricing */}
            <Link
              href="/pricing"
              className="flex items-center gap-1 px-4 py-2 text-sm transition-colors rounded-lg"
              style={{ color: 'var(--text-secondary)' }}
            >
              <CurrencyDollarIcon size={16} />
              <span>Pricing</span>
            </Link>
          </div>

          {/* Auth Buttons + Theme Toggle */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {resolvedTheme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
            </button>

            {user ? (
              <>
                <Link
                  href="/app/dashboard"
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium transition-colors rounded-lg"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <LayoutIcon size={16} />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/app"
                  className="px-4 py-2 text-sm font-medium text-white bg-garden-600 hover:bg-garden-500 rounded-lg transition-colors"
                >
                  Go to App
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-sm font-medium text-white bg-garden-600 hover:bg-garden-500 rounded-lg transition-colors"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            {mobileMenuOpen ? <XMarkIcon size={24} /> : <Bars3Icon size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden"
          style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}
        >
          <div className="px-4 py-4 space-y-2">
            {/* Theme Toggle in Mobile */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 w-full px-4 py-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              {resolvedTheme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
              <span>{resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <Link
              href="/docs"
              className="block px-4 py-2 rounded-lg"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              User Guides
            </Link>
            <Link
              href="/terms"
              className="block px-4 py-2 rounded-lg"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="block px-4 py-2 rounded-lg"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              Privacy Policy
            </Link>
            <Link
              href="/pricing"
              className="block px-4 py-2 rounded-lg"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <div className="pt-4 space-y-2" style={{ borderTop: '1px solid var(--border-color)' }}>
              {user ? (
                <>
                  <Link
                    href="/app/dashboard"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg"
                    style={{ color: 'var(--text-secondary)' }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LayoutIcon size={18} />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    href="/app"
                    className="block px-4 py-2 text-center text-white bg-garden-600 hover:bg-garden-500 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Go to App
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block px-4 py-2 text-center rounded-lg"
                    style={{ color: 'var(--text-secondary)' }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="block px-4 py-2 text-center text-white bg-garden-600 hover:bg-garden-500 rounded-lg"
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
