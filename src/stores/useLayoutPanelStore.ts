import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

/**
 * Panel visibility state for LayoutBuilderWizard
 * Extracted to reduce useState count in the main component
 */

export type PanelName =
  | 'closeConfirm'
  | 'applyConfirm'
  | 'extractedColors'
  | 'templatePicker'
  | 'versionHistory'
  | 'exportMenu'
  | 'comparisonView'
  | 'animationPanel'
  | 'specSheetPanel'
  | 'gridOverlay'
  | 'keyboardShortcuts'
  | 'codePreview'
  | 'componentLibrary'
  | 'architectureTemplates'
  | 'animationTimeline'
  | 'breakpointEditor'
  | 'darkModeEditor'
  | 'layerPanel'
  | 'performanceReport'
  | 'designOptions';

interface LayoutPanelState {
  // Panel visibility states
  showCloseConfirm: boolean;
  showApplyConfirm: boolean;
  showExtractedColors: boolean;
  showTemplatePicker: boolean;
  showVersionHistory: boolean;
  showExportMenu: boolean;
  showComparisonView: boolean;
  showAnimationPanel: boolean;
  showSpecSheetPanel: boolean;
  showGridOverlay: boolean;
  showKeyboardShortcuts: boolean;
  showCodePreview: boolean;
  showComponentLibrary: boolean;
  showArchitectureTemplates: boolean;
  showAnimationTimeline: boolean;
  showBreakpointEditor: boolean;
  showDarkModeEditor: boolean;
  showLayerPanel: boolean;
  showPerformanceReport: boolean;
  showDesignOptions: boolean;

  // Advanced mode toggle (persisted to localStorage)
  isAdvancedMode: boolean;

  // Actions
  setPanel: (panel: PanelName, value: boolean) => void;
  togglePanel: (panel: PanelName) => void;
  openPanel: (panel: PanelName) => void;
  closePanel: (panel: PanelName) => void;
  closeAllPanels: () => void;
  initTemplatePicker: (shouldShow: boolean) => void;
  toggleAdvancedMode: () => void;
}

// Map panel names to state keys
const panelKeyMap: Record<
  PanelName,
  keyof Omit<
    LayoutPanelState,
    | 'setPanel'
    | 'togglePanel'
    | 'openPanel'
    | 'closePanel'
    | 'closeAllPanels'
    | 'initTemplatePicker'
    | 'toggleAdvancedMode'
    | 'isAdvancedMode'
  >
> = {
  closeConfirm: 'showCloseConfirm',
  applyConfirm: 'showApplyConfirm',
  extractedColors: 'showExtractedColors',
  templatePicker: 'showTemplatePicker',
  versionHistory: 'showVersionHistory',
  exportMenu: 'showExportMenu',
  comparisonView: 'showComparisonView',
  animationPanel: 'showAnimationPanel',
  specSheetPanel: 'showSpecSheetPanel',
  gridOverlay: 'showGridOverlay',
  keyboardShortcuts: 'showKeyboardShortcuts',
  codePreview: 'showCodePreview',
  componentLibrary: 'showComponentLibrary',
  architectureTemplates: 'showArchitectureTemplates',
  animationTimeline: 'showAnimationTimeline',
  breakpointEditor: 'showBreakpointEditor',
  darkModeEditor: 'showDarkModeEditor',
  layerPanel: 'showLayerPanel',
  performanceReport: 'showPerformanceReport',
  designOptions: 'showDesignOptions',
};

// Helper to get initial advanced mode from localStorage
const getInitialAdvancedMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem('layoutBuilder_advancedMode');
    return stored ? JSON.parse(stored) : false;
  } catch {
    return false;
  }
};

const initialState = {
  showCloseConfirm: false,
  showApplyConfirm: false,
  showExtractedColors: false,
  showTemplatePicker: false,
  showVersionHistory: false,
  showExportMenu: false,
  showComparisonView: false,
  showAnimationPanel: false,
  showSpecSheetPanel: false,
  showGridOverlay: false,
  showKeyboardShortcuts: false,
  showCodePreview: false,
  showComponentLibrary: false,
  showArchitectureTemplates: false,
  showAnimationTimeline: false,
  showBreakpointEditor: false,
  showDarkModeEditor: false,
  showLayerPanel: false,
  showPerformanceReport: false,
  showDesignOptions: false,
  isAdvancedMode: getInitialAdvancedMode(),
};

export const useLayoutPanelStore = create<LayoutPanelState>((set) => ({
  ...initialState,

  setPanel: (panel, value) => set({ [panelKeyMap[panel]]: value }),

  togglePanel: (panel) => set((state) => ({ [panelKeyMap[panel]]: !state[panelKeyMap[panel]] })),

  openPanel: (panel) => set({ [panelKeyMap[panel]]: true }),

  closePanel: (panel) => set({ [panelKeyMap[panel]]: false }),

  closeAllPanels: () => set(initialState),

  initTemplatePicker: (shouldShow) => set({ showTemplatePicker: shouldShow }),

  toggleAdvancedMode: () =>
    set((state) => {
      const newValue = !state.isAdvancedMode;
      try {
        localStorage.setItem('layoutBuilder_advancedMode', JSON.stringify(newValue));
      } catch {
        // Ignore localStorage errors
      }
      return { isAdvancedMode: newValue };
    }),
}));

// Selector hooks for better performance (only re-render when specific panel changes)
export const useCloseConfirm = () => useLayoutPanelStore((s) => s.showCloseConfirm);
export const useApplyConfirm = () => useLayoutPanelStore((s) => s.showApplyConfirm);
export const useExtractedColors = () => useLayoutPanelStore((s) => s.showExtractedColors);
export const useTemplatePicker = () => useLayoutPanelStore((s) => s.showTemplatePicker);
export const useVersionHistory = () => useLayoutPanelStore((s) => s.showVersionHistory);
export const useExportMenu = () => useLayoutPanelStore((s) => s.showExportMenu);
export const useComparisonView = () => useLayoutPanelStore((s) => s.showComparisonView);
export const useAnimationPanel = () => useLayoutPanelStore((s) => s.showAnimationPanel);
export const useSpecSheetPanel = () => useLayoutPanelStore((s) => s.showSpecSheetPanel);
export const useGridOverlay = () => useLayoutPanelStore((s) => s.showGridOverlay);
export const useKeyboardShortcuts = () => useLayoutPanelStore((s) => s.showKeyboardShortcuts);
export const useCodePreview = () => useLayoutPanelStore((s) => s.showCodePreview);
export const useComponentLibrary = () => useLayoutPanelStore((s) => s.showComponentLibrary);
export const useArchitectureTemplates = () =>
  useLayoutPanelStore((s) => s.showArchitectureTemplates);
export const useAnimationTimeline = () => useLayoutPanelStore((s) => s.showAnimationTimeline);
export const useBreakpointEditor = () => useLayoutPanelStore((s) => s.showBreakpointEditor);
export const useDarkModeEditor = () => useLayoutPanelStore((s) => s.showDarkModeEditor);
export const useLayerPanel = () => useLayoutPanelStore((s) => s.showLayerPanel);
export const usePerformanceReport = () => useLayoutPanelStore((s) => s.showPerformanceReport);
export const useDesignOptions = () => useLayoutPanelStore((s) => s.showDesignOptions);
export const useAdvancedMode = () => useLayoutPanelStore((s) => s.isAdvancedMode);

// Action hooks - uses useShallow to prevent unnecessary re-renders
export const usePanelActions = () =>
  useLayoutPanelStore(
    useShallow((s) => ({
      setPanel: s.setPanel,
      togglePanel: s.togglePanel,
      openPanel: s.openPanel,
      closePanel: s.closePanel,
      closeAllPanels: s.closeAllPanels,
      initTemplatePicker: s.initTemplatePicker,
    }))
  );
