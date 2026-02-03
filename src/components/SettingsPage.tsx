'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// Settings page props
export interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: string;
}

// Simplified Settings Page Component - Account Only
export function SettingsPage({ isOpen, onClose }: SettingsPageProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, signOut } = useAuth();

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSignOut = async () => {
    await signOut();
    onClose();
    router.push('/login');
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-md overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-black/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-garden-500/20 flex items-center justify-center">
                <span className="text-2xl">⚙️</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Settings</h2>
                <p className="text-sm text-slate-400">Manage your account</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-all"
              aria-label="Close settings"
            >
              <span className="text-slate-400 text-xl">✕</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Account Section */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>👤</span> Account
            </h3>

            {/* User Info */}
            <div className="p-4 rounded-lg bg-slate-800/50 border border-white/5 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-garden-500 to-gold-500 flex items-center justify-center">
                  <span className="text-white text-lg font-bold">
                    {user?.email?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-slate-400 text-sm block">Signed in as</span>
                  <p className="text-white font-medium truncate">{user?.email || 'Unknown'}</p>
                </div>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full px-4 py-3 rounded-xl bg-error-600/20 hover:bg-error-600/30 border border-error-500/30 text-error-400 font-medium transition-all flex items-center justify-center gap-2"
            >
              <span>🚪</span> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
