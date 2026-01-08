'use client';

import { motion } from 'framer-motion';
import type { DashboardStats } from '@/types/dashboard';

interface StatsCardsProps {
  stats: DashboardStats;
  isLoading?: boolean;
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  iconBgStyle: React.CSSProperties;
  delay?: number;
  isLoading?: boolean;
}

function StatCard({ label, value, icon, iconBgStyle, delay = 0, isLoading }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            {label}
          </p>
          {isLoading ? (
            <div
              className="h-8 w-16 mt-1 rounded animate-pulse"
              style={{ background: 'var(--bg-tertiary)' }}
            />
          ) : (
            <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {value}
            </p>
          )}
        </div>
        <div className="p-2.5 rounded-lg" style={iconBgStyle}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const cards = [
    {
      label: 'Total Projects',
      value: stats.totalProjects,
      iconBgStyle: {
        background: 'color-mix(in srgb, var(--accent-primary) 20%, transparent)',
        color: 'var(--accent-primary)',
      },
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      ),
    },
    {
      label: 'Completed Builds',
      value: stats.completedBuilds,
      iconBgStyle: {
        background: 'color-mix(in srgb, var(--success) 20%, transparent)',
        color: 'var(--success)',
      },
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      label: 'In Progress',
      value: stats.inProgress,
      iconBgStyle: {
        background: 'color-mix(in srgb, var(--warning) 20%, transparent)',
        color: 'var(--warning)',
      },
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: 'Tokens Used',
      value:
        stats.totalTokensUsed > 1000
          ? `${(stats.totalTokensUsed / 1000).toFixed(1)}K`
          : stats.totalTokensUsed,
      iconBgStyle: {
        background: 'color-mix(in srgb, var(--info) 20%, transparent)',
        color: 'var(--info)',
      },
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value}
          icon={card.icon}
          iconBgStyle={card.iconBgStyle}
          delay={index * 0.1}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}
