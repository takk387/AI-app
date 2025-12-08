'use client';

import React from 'react';
import { type DeploymentInstructions } from '@/utils/exportApp';
import {
  PackageIcon,
  XIcon,
  CheckCircleIcon,
  RocketIcon,
  ClipboardIcon,
  InfoIcon,
  DownloadIcon,
  CopyIcon,
} from '../ui/Icons';

export interface DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  deploymentInstructions: DeploymentInstructions | null;
  onPlatformChange: (platform: 'vercel' | 'netlify' | 'github') => void;
  appName?: string;
}

export function DeploymentModal({
  isOpen,
  onClose,
  deploymentInstructions,
  onPlatformChange,
}: DeploymentModalProps) {
  if (!isOpen || !deploymentInstructions) return null;

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                <PackageIcon size={20} className="text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">App Exported Successfully!</h2>
                <p className="text-sm text-zinc-400">Ready to deploy to production</p>
              </div>
            </div>
            <button onClick={handleClose} className="btn-icon">
              <XIcon size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 px-6 py-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Success Message */}
            <div className="bg-green-600/10 border-l-2 border-green-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircleIcon size={20} className="text-green-400 mt-0.5" />
                <div>
                  <h3 className="text-zinc-100 font-medium mb-1">Download Started</h3>
                  <p className="text-sm text-zinc-400">
                    Your app has been packaged as a ZIP file with all necessary files, including
                    package.json, configuration files, and a README with deployment instructions.
                  </p>
                </div>
              </div>
            </div>

            {/* Deployment Options */}
            <div>
              <h3 className="text-zinc-100 font-medium mb-4 flex items-center gap-2">
                <RocketIcon size={16} className="text-zinc-400" />
                Deployment Options
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => onPlatformChange('vercel')}
                  className={`p-4 rounded-lg border transition-colors text-left ${
                    deploymentInstructions.platform === 'vercel'
                      ? 'bg-zinc-800 border-blue-600'
                      : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                  }`}
                >
                  <div className="text-xl mb-2 text-zinc-300">▲</div>
                  <div className="text-zinc-100 font-medium">Vercel</div>
                  <div className="text-xs text-zinc-500 mt-1">Recommended</div>
                </button>
                <button
                  onClick={() => onPlatformChange('netlify')}
                  className={`p-4 rounded-lg border transition-colors text-left ${
                    deploymentInstructions.platform === 'netlify'
                      ? 'bg-zinc-800 border-blue-600'
                      : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                  }`}
                >
                  <div className="text-xl mb-2 text-zinc-300">◆</div>
                  <div className="text-zinc-100 font-medium">Netlify</div>
                  <div className="text-xs text-zinc-500 mt-1">Easy Deploy</div>
                </button>
                <button
                  onClick={() => onPlatformChange('github')}
                  className={`p-4 rounded-lg border transition-colors text-left ${
                    deploymentInstructions.platform === 'github'
                      ? 'bg-zinc-800 border-blue-600'
                      : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                  }`}
                >
                  <div className="text-xl mb-2 text-zinc-300">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                  </div>
                  <div className="text-zinc-100 font-medium">GitHub</div>
                  <div className="text-xs text-zinc-500 mt-1">Version Control</div>
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <h3 className="text-zinc-100 font-medium mb-3 flex items-center gap-2">
                <ClipboardIcon size={16} className="text-zinc-400" />
                Deployment Steps
              </h3>
              <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-4">
                <ol className="space-y-3">
                  {deploymentInstructions.steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center text-xs text-blue-400 font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm text-zinc-300 leading-relaxed pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>

                {deploymentInstructions.cliCommand && (
                  <div className="mt-4 pt-4 border-t border-zinc-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-zinc-500">Quick Deploy Command:</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(deploymentInstructions.cliCommand || '');
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <CopyIcon size={12} />
                        Copy
                      </button>
                    </div>
                    <code className="block px-3 py-2 rounded-lg bg-zinc-900 text-green-400 text-sm font-mono">
                      {deploymentInstructions.cliCommand}
                    </code>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Resources */}
            <div className="bg-zinc-800/50 border-l-2 border-blue-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <InfoIcon size={18} className="text-blue-400 mt-0.5" />
                <div className="text-sm text-zinc-400">
                  <p className="font-medium text-zinc-200 mb-1">Tip:</p>
                  <p>
                    For the best experience, we recommend deploying to Vercel. It&apos;s optimized
                    for Next.js apps and provides automatic deployments, preview URLs, and
                    zero-config setup.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <DownloadIcon size={14} />
            <span>Check your downloads folder for the ZIP file</span>
          </div>
          <button onClick={handleClose} className="btn-primary">
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeploymentModal;
