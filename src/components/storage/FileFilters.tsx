'use client';

import React from 'react';

interface FileFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  sortBy: 'name' | 'size' | 'created_at' | 'updated_at';
  sortOrder: 'asc' | 'desc';
  onSortChange: (
    sortBy: 'name' | 'size' | 'created_at' | 'updated_at',
    order: 'asc' | 'desc'
  ) => void;
  onClearFilters: () => void;
  fileTypes?: string[];
}

/**
 * FileFilters Component
 *
 * Provides search, filtering, and sorting controls for files.
 * Includes type filtering and sort options.
 */
export function FileFilters({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  sortBy,
  sortOrder,
  onSortChange,
  onClearFilters,
  fileTypes = ['all', 'image', 'video', 'document', 'other'],
}: FileFiltersProps) {
  const hasActiveFilters =
    searchQuery !== '' || selectedType !== 'all' || sortBy !== 'created_at' || sortOrder !== 'desc';

  const typeIcons: Record<string, string> = {
    all: '📁',
    image: '🖼️',
    video: '🎥',
    audio: '🎵',
    document: '📄',
    other: '📎',
  };

  const sortOptions: Array<{
    value: 'name' | 'size' | 'created_at' | 'updated_at';
    label: string;
  }> = [
    { value: 'name', label: 'Name' },
    { value: 'size', label: 'Size' },
    { value: 'created_at', label: 'Upload Date' },
    { value: 'updated_at', label: 'Modified Date' },
  ];

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search files..."
          className="w-full px-4 py-2.5 pl-10 rounded-lg glass-panel border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500/60 transition-all duration-300"
          aria-label="Search files"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {/* File Type Filter */}
        <div className="flex gap-2">
          {fileTypes.map((type) => (
            <button
              key={type}
              onClick={() => onTypeChange(type)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                ${
                  selectedType === type
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
                }
              `}
              aria-label={`Filter by ${type}`}
              aria-pressed={selectedType === type}
            >
              <span className="mr-1">{typeIcons[type] || '📎'}</span>
              <span className="capitalize">{type}</span>
            </button>
          ))}
        </div>

        {/* Sort Controls */}
        <div className="flex gap-2 ml-auto">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as any, sortOrder)}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Sort by"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-800">
                {option.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
            aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>

          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 hover:text-red-200 text-sm font-medium transition-all"
              aria-label="Clear all filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
