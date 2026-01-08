'use client';

import { Suspense } from 'react';
import { DashboardView } from '@/components/dashboard';

function DashboardLoading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-garden-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading dashboard...
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardView />
    </Suspense>
  );
}
