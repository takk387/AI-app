/**
 * Modal Components Module
 * 
 * Extracted modal and overlay components from AIBuilder.tsx
 * for better code organization and reusability.
 */

export { LibraryModal } from './LibraryModal';
export { ApprovalModal } from './ApprovalModal';
export { VersionHistoryModal } from './VersionHistoryModal';
export { DeploymentModal } from './DeploymentModal';
export { DiffPreviewModal } from './DiffPreviewModal';
export { StagingConsentModal } from './StagingConsentModal';
export { CompareVersionsModal } from './CompareVersionsModal';
export { PhasedBuildPanel } from './PhasedBuildPanel';

// Re-export types
export type { LibraryModalProps } from './LibraryModal';
export type { ApprovalModalProps } from './ApprovalModal';
export type { VersionHistoryModalProps } from './VersionHistoryModal';
export type { DeploymentModalProps } from './DeploymentModal';
export type { DiffPreviewModalProps } from './DiffPreviewModal';
export type { StagingConsentModalProps } from './StagingConsentModal';
export type { CompareVersionsModalProps } from './CompareVersionsModal';
export type { PhasedBuildPanelProps } from './PhasedBuildPanel';
