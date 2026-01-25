'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, SettingsIcon } from '@/components/ui/Icons';
import type { AppConcept } from '@/types/appConcept';

interface TechnicalSectionProps {
  appConcept: AppConcept;
  onUpdate: (path: string, value: unknown) => void;
  readOnly?: boolean;
}

interface TechToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  readOnly?: boolean;
  colorClass: string;
}

function TechToggle({
  label,
  description,
  checked,
  onChange,
  readOnly,
  colorClass,
}: TechToggleProps) {
  return (
    <label
      className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
        !readOnly ? 'cursor-pointer hover:bg-slate-800/50' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !readOnly && onChange(e.target.checked)}
        disabled={readOnly}
        className="mt-0.5 rounded border-slate-600 bg-slate-800 text-garden-500 focus:ring-garden-500 focus:ring-offset-0"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-200">{label}</span>
          {checked && (
            <span className={`px-1.5 py-0.5 text-[10px] rounded ${colorClass}`}>Active</span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </label>
  );
}

/**
 * Section for technical requirements: auth, database, API, realtime toggles
 */
export function TechnicalSection({
  appConcept,
  onUpdate,
  readOnly = false,
}: TechnicalSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const tech = appConcept.technical || {};

  const handleUpdate = (field: string, value: unknown) => {
    onUpdate(`technical.${field}`, value);
  };

  // Count active requirements
  const activeCount = [
    tech.needsAuth,
    tech.needsDatabase,
    tech.needsAPI,
    tech.needsRealtime,
    tech.needsFileUpload,
  ].filter(Boolean).length;

  return (
    <div>
      {/* Header with toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left mb-2"
      >
        {isExpanded ? (
          <ChevronDownIcon size={14} className="text-slate-400" />
        ) : (
          <ChevronRightIcon size={14} className="text-slate-400" />
        )}
        <SettingsIcon size={14} className="text-slate-400" />
        <span className="text-xs text-slate-500 uppercase tracking-wide">Technical</span>
        {activeCount > 0 && (
          <span className="ml-auto px-1.5 py-0.5 text-[10px] bg-garden-500/20 text-garden-300 rounded">
            {activeCount} active
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="space-y-1 pl-5">
          <TechToggle
            label="Authentication"
            description="User login, registration, sessions"
            checked={!!tech.needsAuth}
            onChange={(checked) => handleUpdate('needsAuth', checked)}
            readOnly={readOnly}
            colorClass="bg-garden-500/20 text-garden-300"
          />

          <TechToggle
            label="Database"
            description="Persistent data storage"
            checked={!!tech.needsDatabase}
            onChange={(checked) => handleUpdate('needsDatabase', checked)}
            readOnly={readOnly}
            colorClass="bg-success-500/20 text-success-300"
          />

          <TechToggle
            label="API Integration"
            description="External API connections"
            checked={!!tech.needsAPI}
            onChange={(checked) => handleUpdate('needsAPI', checked)}
            readOnly={readOnly}
            colorClass="bg-pink-500/20 text-pink-300"
          />

          <TechToggle
            label="Real-time Updates"
            description="WebSockets, live data"
            checked={!!tech.needsRealtime}
            onChange={(checked) => handleUpdate('needsRealtime', checked)}
            readOnly={readOnly}
            colorClass="bg-gold-500/20 text-gold-300"
          />

          <TechToggle
            label="File Upload"
            description="Image, document uploads"
            checked={!!tech.needsFileUpload}
            onChange={(checked) => handleUpdate('needsFileUpload', checked)}
            readOnly={readOnly}
            colorClass="bg-orange-500/20 text-orange-300"
          />

          {/* Advanced options - collapsed by default */}
          {(tech.needsI18n || tech.needsOfflineSupport || tech.needsCaching) && (
            <div className="pt-2 border-t border-slate-800 mt-2 space-y-1">
              <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-1">Advanced</p>
              {tech.needsI18n && (
                <span className="inline-block px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-300 rounded mr-1">
                  i18n
                </span>
              )}
              {tech.needsOfflineSupport && (
                <span className="inline-block px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-300 rounded mr-1">
                  Offline
                </span>
              )}
              {tech.needsCaching && (
                <span className="inline-block px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 rounded mr-1">
                  Caching
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TechnicalSection;
