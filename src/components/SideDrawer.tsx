'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAppStore } from '@/store/useAppStore';
import { useThemeContext } from '@/contexts/ThemeContext';
import {
  XIcon,
  FileIcon,
  UserIcon,
  SettingsIcon,
  HelpIcon,
  LogoutIcon,
  SunIcon,
  MoonIcon,
  HistoryIcon,
  FolderIcon,
  ExportIcon,
  PlusIcon,
} from './ui/Icons';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: React.ReactNode | null;
  toggle?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onShowSettings?: () => void;
  onShowHistory?: () => void;
  onShowLibrary?: () => void;
  onExport?: () => void;
  versionCount?: number;
  appCount?: number;
}

export function SideDrawer({
  isOpen,
  onClose,
  onShowSettings,
  onShowHistory,
  onShowLibrary,
  onExport,
  versionCount = 0,
  appCount = 0,
}: SideDrawerProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { resolvedTheme, toggleTheme } = useThemeContext();

  // Documentation state
  const showDocumentationPanel = useAppStore((state) => state.showDocumentationPanel);
  const setShowDocumentationPanel = useAppStore((state) => state.setShowDocumentationPanel);
  const currentDocumentation = useAppStore((state) => state.currentDocumentation);

  // State clearing for new project
  const setAppConcept = useAppStore((state) => state.setAppConcept);
  const setCurrentLayoutDesign = useAppStore((state) => state.setCurrentLayoutDesign);
  const setNewAppStagePlan = useAppStore((state) => state.setNewAppStagePlan);
  const setDynamicPhasePlan = useAppStore((state) => state.setDynamicPhasePlan);

  const handleStartNewProject = () => {
    // Clear all project state
    setAppConcept(null);
    setCurrentLayoutDesign(null);
    setNewAppStagePlan(null);
    setDynamicPhasePlan(null);
    // Navigate to wizard
    router.push('/app/wizard');
    onClose();
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    onClose();
  };

  const menuSections: MenuSection[] = [
    {
      title: 'Project',
      items: [
        {
          icon: <PlusIcon size={18} />,
          label: 'Start New Project',
          description: 'Begin with the wizard',
          onClick: handleStartNewProject,
        },
        {
          icon: <FileIcon size={18} />,
          label: 'Project Docs',
          description: currentDocumentation ? 'View documentation' : 'No docs yet',
          onClick: () => {
            setShowDocumentationPanel(!showDocumentationPanel);
            onClose();
          },
          badge: currentDocumentation ? (
            <span className="w-2 h-2 rounded-full bg-green-400" />
          ) : null,
        },
        {
          icon: <HistoryIcon size={18} />,
          label: 'Version History',
          description: `${versionCount} versions`,
          onClick: () => {
            onShowHistory?.();
            onClose();
          },
          disabled: versionCount === 0,
        },
        {
          icon: <FolderIcon size={18} />,
          label: 'App Library',
          description: `${appCount} saved apps`,
          onClick: () => {
            onShowLibrary?.();
            onClose();
          },
        },
        {
          icon: <ExportIcon size={18} />,
          label: 'Export Project',
          description: 'Download as ZIP',
          onClick: () => {
            onExport?.();
            onClose();
          },
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: resolvedTheme === 'dark' ? <MoonIcon size={18} /> : <SunIcon size={18} />,
          label: 'Theme',
          description: resolvedTheme === 'dark' ? 'Dark mode' : 'Light mode',
          onClick: toggleTheme,
          toggle: true,
        },
        {
          icon: <SettingsIcon size={18} />,
          label: 'Settings',
          description: 'App preferences',
          onClick: () => {
            onShowSettings?.();
            onClose();
          },
        },
      ],
    },
    {
      title: 'Help',
      items: [
        {
          icon: <HelpIcon size={18} />,
          label: 'Documentation',
          description: 'Learn how to use',
          onClick: () => {
            window.open('/docs', '_blank');
            onClose();
          },
        },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-80 max-w-[85vw] bg-[#0a0a0f]/95 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">Menu</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <XIcon size={20} />
              </button>
            </div>

            {/* User Section */}
            {user && (
              <div className="p-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-garden-500 to-gold-500 flex items-center justify-center">
                    <UserIcon size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user.email}</p>
                    <p className="text-xs text-slate-500">Free Plan</p>
                  </div>
                </div>
              </div>
            )}

            {/* Menu Sections */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {menuSections.map((section) => (
                <div key={section.title}>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <button
                        key={item.label}
                        onClick={item.onClick}
                        disabled={item.disabled}
                        className={`
                          w-full flex items-center gap-3 p-3 rounded-xl
                          transition-colors text-left
                          ${
                            item.disabled
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:bg-slate-800/50'
                          }
                        `}
                      >
                        <div className="text-slate-400">{item.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{item.label}</span>
                            {item.badge}
                          </div>
                          <span className="text-xs text-slate-500">{item.description}</span>
                        </div>
                        {item.toggle && (
                          <div
                            className={`w-8 h-5 rounded-full transition-colors ${
                              theme === 'dark' ? 'bg-garden-600' : 'bg-slate-700'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white transform transition-transform mt-0.5 ${
                                theme === 'dark' ? 'translate-x-3.5' : 'translate-x-0.5'
                              }`}
                            />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800">
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800/50 hover:bg-red-600/20 text-slate-400 hover:text-red-400 transition-colors"
                >
                  <LogoutIcon size={18} />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    router.push('/login');
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-garden-600 hover:bg-garden-500 text-white transition-colors"
                >
                  <UserIcon size={18} />
                  <span className="text-sm font-medium">Sign In</span>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default SideDrawer;
