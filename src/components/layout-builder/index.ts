// Layout Builder Sub-Components
// Extracted from LayoutBuilderWizard.tsx for better modularity

export { ExtractedColorsPanel } from './ExtractedColorsPanel';
export { ConfirmDialog } from './ConfirmDialog';
export { DraftRecoveryBanner } from './DraftRecoveryBanner';
export { MessageBubble } from './MessageBubble';
export { SuggestedActionsBar } from './SuggestedActionsBar';
export { RecentChangesIndicator } from './RecentChangesIndicator';
export { TemplatePicker } from './TemplatePicker';
export { ChatInput } from './ChatInput';
export { TemplatesMenu } from './TemplatesMenu';
export { ToolsMenu } from './ToolsMenu';
export { DesignSidePanel } from './DesignSidePanel';
export { MediaUploadZone } from './MediaUploadZone';
export { LintPanel } from './LintPanel';
export { ShadcnPreview } from './ShadcnPreview';
export { ViewOptionsMenu } from './ViewOptionsMenu';
export { ColorPickerMenu } from './ColorPickerMenu';

// Click + Talk Mode Components
export { SelectionHighlight } from './SelectionHighlight';
export { ClickableOverlay } from './ClickableOverlay';
export { DesignOptionsPanel, type DesignOption } from './DesignOptionsPanel';
export { OptionCard } from './OptionCard';
export { BeforeAfter } from './BeforeAfter';

// Micro-Interactions Components
export { InteractionEditor } from './InteractionEditor';
export { StateEditor } from './StateEditor';
export { GestureEditor } from './GestureEditor';
export { AnimationPreviewPlayer } from './AnimationPreviewPlayer';

// History, Templates & Voice Components
export { HistoryTimeline } from './HistoryTimeline';
export { TemplateLibrary, type DesignTemplate } from './TemplateLibrary';
export { VoiceInput } from './VoiceInput';

// Accessibility & Error Handling Components
export { A11yWarnings } from './A11yWarnings';
export {
  ErrorRecovery,
  ErrorBadge,
  ErrorToast,
  type RecoverableError,
  type ErrorType,
} from './ErrorRecovery';
