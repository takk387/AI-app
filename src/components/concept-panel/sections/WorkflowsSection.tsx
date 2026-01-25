'use client';

import { useState } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  WorkflowIcon,
  PlusIcon,
  TrashIcon,
} from '@/components/ui/Icons';
import type { AppConcept, Workflow as WorkflowType } from '@/types/appConcept';
import { EditableField } from '../EditableField';

interface WorkflowsSectionProps {
  appConcept: AppConcept;
  onUpdate: (path: string, value: unknown) => void;
  readOnly?: boolean;
}

/**
 * Section for workflows with steps
 */
export function WorkflowsSection({
  appConcept,
  onUpdate,
  readOnly = false,
}: WorkflowsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const workflows = appConcept.workflows || [];

  const handleUpdateWorkflow = (index: number, updates: Partial<WorkflowType>) => {
    const updated = [...workflows];
    updated[index] = { ...updated[index], ...updates };
    onUpdate('workflows', updated);
  };

  const handleDeleteWorkflow = (index: number) => {
    const updated = workflows.filter((_, i) => i !== index);
    onUpdate('workflows', updated);
  };

  const handleAddWorkflow = () => {
    const newWorkflow: WorkflowType = {
      name: 'New Workflow',
      description: '',
      steps: [],
      involvedRoles: [],
    };
    onUpdate('workflows', [...workflows, newWorkflow]);
  };

  const handleAddStep = (workflowIndex: number) => {
    const workflow = workflows[workflowIndex];
    handleUpdateWorkflow(workflowIndex, {
      steps: [...workflow.steps, 'New step'],
    });
  };

  const handleUpdateStep = (workflowIndex: number, stepIndex: number, value: string) => {
    const workflow = workflows[workflowIndex];
    const steps = [...workflow.steps];
    steps[stepIndex] = value;
    handleUpdateWorkflow(workflowIndex, { steps });
  };

  const handleDeleteStep = (workflowIndex: number, stepIndex: number) => {
    const workflow = workflows[workflowIndex];
    const steps = workflow.steps.filter((_, i) => i !== stepIndex);
    handleUpdateWorkflow(workflowIndex, { steps });
  };

  if (workflows.length === 0 && readOnly) {
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
          <ChevronDownIcon size={14} className="text-slate-400" />
        ) : (
          <ChevronRightIcon size={14} className="text-slate-400" />
        )}
        <WorkflowIcon size={14} className="text-slate-400" />
        <span className="text-xs text-slate-500 uppercase tracking-wide">
          Workflows ({workflows.length})
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-3 pl-5">
          {workflows.length === 0 ? (
            <p className="text-sm text-slate-500 italic py-2">No workflows defined</p>
          ) : (
            workflows.map((workflow, workflowIndex) => (
              <div
                key={workflowIndex}
                className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <EditableField
                    value={workflow.name}
                    onChange={(name) => handleUpdateWorkflow(workflowIndex, { name })}
                    readOnly={readOnly}
                    valueClassName="font-medium text-sm"
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleDeleteWorkflow(workflowIndex)}
                      className="ml-auto p-1 text-slate-500 hover:text-error-400 transition-colors"
                      title="Delete workflow"
                    >
                      <TrashIcon size={14} />
                    </button>
                  )}
                </div>

                {/* Description */}
                {(workflow.description || !readOnly) && (
                  <EditableField
                    value={workflow.description || ''}
                    onChange={(description) => handleUpdateWorkflow(workflowIndex, { description })}
                    placeholder="Describe this workflow..."
                    readOnly={readOnly}
                    valueClassName="text-xs text-slate-500"
                    className="mb-2"
                  />
                )}

                {/* Steps */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-600 uppercase tracking-wide">
                    Steps
                  </label>
                  {workflow.steps.map((step, stepIndex) => (
                    <div key={stepIndex} className="flex items-center gap-2 group">
                      <span className="w-5 h-5 flex items-center justify-center text-[10px] text-slate-500 bg-slate-800 rounded-full flex-shrink-0">
                        {stepIndex + 1}
                      </span>
                      <EditableField
                        value={step}
                        onChange={(value) => handleUpdateStep(workflowIndex, stepIndex, value)}
                        readOnly={readOnly}
                        valueClassName="text-xs text-slate-400"
                        className="flex-1"
                      />
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleDeleteStep(workflowIndex, stepIndex)}
                          className="p-0.5 text-slate-600 hover:text-error-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <TrashIcon size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleAddStep(workflowIndex)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mt-1"
                    >
                      <PlusIcon size={12} />
                      Add step
                    </button>
                  )}
                </div>

                {/* Involved roles */}
                {workflow.involvedRoles.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-700/50">
                    <label className="text-[10px] text-slate-600 uppercase tracking-wide block mb-1">
                      Roles
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {workflow.involvedRoles.map((role, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 text-[10px] bg-slate-700 text-slate-300 rounded"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Add workflow button */}
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddWorkflow}
              className="flex items-center gap-2 w-full py-2 px-3 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg border border-dashed border-slate-700 hover:border-slate-600 transition-colors"
            >
              <PlusIcon size={14} />
              Add Workflow
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default WorkflowsSection;
