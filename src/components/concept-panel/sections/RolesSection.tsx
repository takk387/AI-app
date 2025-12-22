'use client';

import { useState } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  UsersIcon,
  PlusIcon,
  TrashIcon,
} from '@/components/ui/Icons';
import type { AppConcept, UserRole } from '@/types/appConcept';
import { EditableField } from '../EditableField';

interface RolesSectionProps {
  appConcept: AppConcept;
  onUpdate: (path: string, value: unknown) => void;
  readOnly?: boolean;
}

/**
 * Section for user roles with capabilities
 */
export function RolesSection({ appConcept, onUpdate, readOnly = false }: RolesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const roles = appConcept.roles || [];

  const handleUpdateRole = (index: number, updates: Partial<UserRole>) => {
    const updated = [...roles];
    updated[index] = { ...updated[index], ...updates };
    onUpdate('roles', updated);
  };

  const handleDeleteRole = (index: number) => {
    const updated = roles.filter((_, i) => i !== index);
    onUpdate('roles', updated);
  };

  const handleAddRole = () => {
    const newRole: UserRole = {
      name: 'New Role',
      capabilities: [],
    };
    onUpdate('roles', [...roles, newRole]);
  };

  const handleAddCapability = (roleIndex: number) => {
    const role = roles[roleIndex];
    handleUpdateRole(roleIndex, {
      capabilities: [...role.capabilities, 'New capability'],
    });
  };

  const handleUpdateCapability = (roleIndex: number, capIndex: number, value: string) => {
    const role = roles[roleIndex];
    const caps = [...role.capabilities];
    caps[capIndex] = value;
    handleUpdateRole(roleIndex, { capabilities: caps });
  };

  const handleDeleteCapability = (roleIndex: number, capIndex: number) => {
    const role = roles[roleIndex];
    const caps = role.capabilities.filter((_, i) => i !== capIndex);
    handleUpdateRole(roleIndex, { capabilities: caps });
  };

  if (roles.length === 0 && readOnly) {
    return null;
  }

  return (
    <div>
      {/* Header with toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left mb-2"
      >
        {isExpanded ? (
          <ChevronDownIcon size={14} className="text-zinc-400" />
        ) : (
          <ChevronRightIcon size={14} className="text-zinc-400" />
        )}
        <UsersIcon size={14} className="text-zinc-400" />
        <span className="text-xs text-zinc-500 uppercase tracking-wide">
          User Roles ({roles.length})
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-3 pl-5">
          {roles.length === 0 ? (
            <p className="text-sm text-zinc-500 italic py-2">No roles defined</p>
          ) : (
            roles.map((role, roleIndex) => (
              <div
                key={roleIndex}
                className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <EditableField
                    value={role.name}
                    onChange={(name) => handleUpdateRole(roleIndex, { name })}
                    readOnly={readOnly}
                    valueClassName="font-medium text-sm"
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleDeleteRole(roleIndex)}
                      className="ml-auto p-1 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Delete role"
                    >
                      <TrashIcon size={14} />
                    </button>
                  )}
                </div>

                {/* Capabilities */}
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-600 uppercase tracking-wide">
                    Capabilities
                  </label>
                  {role.capabilities.map((cap, capIndex) => (
                    <div key={capIndex} className="flex items-center gap-2 group">
                      <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full" />
                      <EditableField
                        value={cap}
                        onChange={(value) => handleUpdateCapability(roleIndex, capIndex, value)}
                        readOnly={readOnly}
                        valueClassName="text-xs text-zinc-400"
                        className="flex-1"
                      />
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCapability(roleIndex, capIndex)}
                          className="p-0.5 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <TrashIcon size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleAddCapability(roleIndex)}
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mt-1"
                    >
                      <PlusIcon size={12} />
                      Add capability
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Add role button */}
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddRole}
              className="flex items-center gap-2 w-full py-2 px-3 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-700 hover:border-zinc-600 transition-colors"
            >
              <PlusIcon size={14} />
              Add Role
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default RolesSection;
