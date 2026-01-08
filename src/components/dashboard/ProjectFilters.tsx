'use client';

import type { FilterState } from '@/types/dashboard';
import type { BuildStatus } from '@/types/projectDocumentation';

interface ProjectFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  projectCount: number;
}

const STATUS_OPTIONS: Array<{ value: BuildStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Status' },
  { value: 'planning', label: 'Planning' },
  { value: 'ready', label: 'Ready' },
  { value: 'building', label: 'Building' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'paused', label: 'Paused' },
];

const SORT_OPTIONS: Array<{ value: FilterState['sortBy']; label: string }> = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'name', label: 'Name' },
  { value: 'status', label: 'Status' },
];

export function ProjectFilters({ filters, onFiltersChange, projectCount }: ProjectFiltersProps) {
  return (
    <div
      className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
    >
      {/* Search */}
      <div className="relative flex-1 w-full sm:w-auto">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: 'var(--text-muted)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onFiltersChange({ search: e.target.value })}
          placeholder="Search projects..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Status Filter */}
      <select
        value={filters.status}
        onChange={(e) => onFiltersChange({ status: e.target.value as FilterState['status'] })}
        className="px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
        }}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <select
          value={filters.sortBy}
          onChange={(e) => onFiltersChange({ sortBy: e.target.value as FilterState['sortBy'] })}
          className="px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          onClick={() =>
            onFiltersChange({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })
          }
          className="p-2 rounded-lg transition-colors"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
          }}
          title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          {filters.sortOrder === 'asc' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
              />
            </svg>
          )}
        </button>
      </div>

      {/* View Toggle */}
      <div
        className="flex items-center gap-1 p-1 rounded-lg"
        style={{ background: 'var(--bg-tertiary)' }}
      >
        <button
          onClick={() => onFiltersChange({ view: 'grid' })}
          className="p-1.5 rounded-md transition-colors"
          style={{
            background: filters.view === 'grid' ? 'var(--bg-secondary)' : 'transparent',
            color: filters.view === 'grid' ? 'var(--accent-primary)' : 'var(--text-muted)',
            boxShadow: filters.view === 'grid' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
          }}
          title="Grid view"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
        </button>
        <button
          onClick={() => onFiltersChange({ view: 'list' })}
          className="p-1.5 rounded-md transition-colors"
          style={{
            background: filters.view === 'list' ? 'var(--bg-secondary)' : 'transparent',
            color: filters.view === 'list' ? 'var(--accent-primary)' : 'var(--text-muted)',
            boxShadow: filters.view === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
          }}
          title="List view"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* Count */}
      <span className="text-sm ml-auto" style={{ color: 'var(--text-muted)' }}>
        {projectCount} project{projectCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
