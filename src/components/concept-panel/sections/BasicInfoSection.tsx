'use client';

import type { AppConcept } from '@/types/appConcept';
import { EditableField } from '../EditableField';

interface BasicInfoSectionProps {
  appConcept: AppConcept;
  onUpdate: (path: string, value: unknown) => void;
  readOnly?: boolean;
}

/**
 * Section for basic app info: name, description, purpose, target users
 */
export function BasicInfoSection({
  appConcept,
  onUpdate,
  readOnly = false,
}: BasicInfoSectionProps) {
  return (
    <div className="space-y-4">
      <EditableField
        label="App Name"
        value={appConcept.name || ''}
        onChange={(value) => onUpdate('name', value)}
        placeholder="Enter app name..."
        readOnly={readOnly}
        valueClassName="text-lg font-semibold"
      />

      <EditableField
        label="Description"
        value={appConcept.description || ''}
        onChange={(value) => onUpdate('description', value)}
        type="textarea"
        placeholder="Describe your app..."
        readOnly={readOnly}
        valueClassName="text-sm"
      />

      {(appConcept.purpose || !readOnly) && (
        <EditableField
          label="Purpose"
          value={appConcept.purpose || ''}
          onChange={(value) => onUpdate('purpose', value)}
          type="textarea"
          placeholder="What problem does this solve?"
          readOnly={readOnly}
          valueClassName="text-sm"
        />
      )}

      <EditableField
        label="Target Users"
        value={appConcept.targetUsers || ''}
        onChange={(value) => onUpdate('targetUsers', value)}
        placeholder="Who is this app for?"
        readOnly={readOnly}
        valueClassName="text-sm"
      />
    </div>
  );
}

export default BasicInfoSection;
