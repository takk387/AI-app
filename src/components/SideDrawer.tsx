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
  LayoutIcon,
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
  const setCurrentLayoutManifest = useAppStore((state) => state.setCurrentLayoutManifest);
  const setNewAppStagePlan = useAppStore((state) => state.setNewAppStagePlan);
  const setDynamicPhasePlan = useAppStore((state) => state.setDynamicPhasePlan);
  const setCurrentComponent = useAppStore((state) => state.setCurrentComponent);

  const handleStartNewProject = () => {
    // Clear all project state INCLUDING currentComponent (critical for modal to show)
    setAppConcept(null);
    setCurrentLayoutManifest(null);
    setNewAppStagePlan(null);
    setDynamicPhasePlan(null);
    setCurrentComponent(null);
    // Navigate to AI Builder (naming modal will appear)
    router.push('/app');
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
          icon: <LayoutIcon size={18} />,
          label: 'Dashboard',
          description: 'View all projects',
          onClick: () => {
            router.push('/app/dashboard');
            onClose();
          },
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
            <span className="w-2 h-2 rounded-full bg-success-400" />
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
            className="fixed right-0 top-0 h-full w-80 max-w-[85vw] backdrop-blur-xl border-l z-50 flex flex-col"
            style={{ background: 'var(--nav-bg)', borderColor: 'var(--border-color)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Menu
              </h2>
              <div className="flex items-center gap-2">
                {/* Theme Toggle - Quick Access */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {resolvedTheme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <XIcon size={20} />
                </button>
              </div>
            </div>

            {/* User Section */}
            {user && (
              <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-garden-500 to-gold-500 flex items-center justify-center">
                    <UserIcon size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {user.email}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Free Plan
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Menu Sections */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {menuSections.map((section) => (
                <div key={section.title}>
                  <h3
                    className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <button
                        key={item.label}
                        onClick={item.onClick}
                        disabled={item.disabled}
                        className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left"
                        style={{
                          opacity: item.disabled ? 0.5 : 1,
                          cursor: item.disabled ? 'not-allowed' : 'pointer',
                        }}
                        onMouseEnter={(e) =>
                          !item.disabled && (e.currentTarget.style.background = 'var(--hover-bg)')
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ color: 'var(--text-secondary)' }}>{item.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm font-medium"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {item.label}
                            </span>
                            {item.badge}
                          </div>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {item.description}
                          </span>
                        </div>
                        {item.toggle && (
                          <div
                            className="w-8 h-5 rounded-full transition-colors"
                            style={{
                              backgroundColor:
                                resolvedTheme === 'dark'
                                  ? 'var(--garden-600, #059669)'
                                  : 'var(--bg-tertiary)',
                            }}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white transform transition-transform mt-0.5 ${
                                resolvedTheme === 'dark' ? 'translate-x-3.5' : 'translate-x-0.5'
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
            <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl hover:bg-error-600/20 hover:text-error-400 transition-colors"
                  style={{ color: 'var(--text-secondary)', background: 'var(--hover-bg)' }}
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
