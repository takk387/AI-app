/**
 * Dashboard Layout
 *
 * Provides layout context for the dashboard pages including
 * proper metadata and shared UI elements.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | AI App Builder',
  description: 'Manage your deployed applications, monitor usage, and configure deployments.',
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
