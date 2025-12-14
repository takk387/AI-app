'use client';

import React from 'react';
import { HeaderDropdown, DropdownItem } from '../ui/HeaderDropdown';
import {
  FolderIcon,
  PlusIcon,
  AppsIcon,
  DownloadIcon,
  ShareIcon,
  FileIcon,
  CodeIcon,
  ArchiveIcon,
  ClipboardIcon,
} from '../ui/Icons';

interface ProjectDropdownProps {
  onNewProject?: () => void;
  onMyApps?: () => void;
  onExportHTML?: () => void;
  onExportReact?: () => void;
  onExportZip?: () => void;
  onCopyToClipboard?: () => void;
  onShare?: () => void;
  appCount?: number;
  showShare?: boolean;
}

export const ProjectDropdown: React.FC<ProjectDropdownProps> = ({
  onNewProject,
  onMyApps,
  onExportHTML,
  onExportReact,
  onExportZip,
  onCopyToClipboard,
  onShare,
  appCount = 0,
  showShare = true,
}) => {
  const items: DropdownItem[] = [
    {
      id: 'new-app',
      label: 'New App',
      description: 'Start fresh with a new project',
      icon: <PlusIcon size={16} />,
      shortcut: 'Ctrl+N',
      onClick: onNewProject,
    },
    {
      id: 'my-apps',
      label: 'My Apps',
      description: 'Browse saved projects',
      icon: <AppsIcon size={16} />,
      onClick: onMyApps,
      badge: appCount > 0 ? appCount : undefined,
      dividerAfter: true,
    },
    {
      id: 'export',
      label: 'Export',
      description: 'Download or share your app',
      icon: <DownloadIcon size={16} />,
      subItems: [
        {
          id: 'export-html',
          label: 'Export as HTML',
          description: 'Single file preview',
          icon: <FileIcon size={16} />,
          onClick: onExportHTML,
        },
        {
          id: 'export-react',
          label: 'Export as React',
          description: 'Full component code',
          icon: <CodeIcon size={16} />,
          onClick: onExportReact,
        },
        {
          id: 'export-zip',
          label: 'Export as ZIP',
          description: 'Complete project bundle',
          icon: <ArchiveIcon size={16} />,
          onClick: onExportZip,
        },
        {
          id: 'copy-clipboard',
          label: 'Copy to Clipboard',
          description: 'Quick code copy',
          icon: <ClipboardIcon size={16} />,
          onClick: onCopyToClipboard,
        },
      ],
    },
  ];

  // Conditionally add Share
  if (showShare && onShare) {
    items.push({
      id: 'share',
      label: 'Share',
      description: 'Generate shareable link',
      icon: <ShareIcon size={16} />,
      onClick: onShare,
    });
  }

  return (
    <HeaderDropdown
      trigger={
        <span className="flex items-center gap-2">
          <FolderIcon size={16} />
          <span className="hidden sm:inline">Project</span>
        </span>
      }
      label="Project menu"
      items={items}
      align="left"
    />
  );
};

export default ProjectDropdown;
