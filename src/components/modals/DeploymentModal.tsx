"use client";

import React from 'react';
import { getDeploymentInstructions, type DeploymentInstructions } from '@/utils/exportApp';

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
  appName = 'app',
}: DeploymentModalProps) {
  if (!isOpen || !deploymentInstructions) return null;

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-white/10 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-green-500/20 to-blue-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📦</span>
              <div>
                <h2 className="text-2xl font-bold text-white">App Exported Successfully!</h2>
                <p className="text-sm text-slate-300 mt-1">Ready to deploy to production</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            {/* Success Message */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <h3 className="text-white font-semibold mb-1">Download Started</h3>
                  <p className="text-sm text-slate-300">
                    Your app has been packaged as a ZIP file with all necessary files, including package.json, configuration files, and a README with deployment instructions.
                  </p>
                </div>
              </div>
            </div>

            {/* Deployment Options */}
            <div>
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span>🚀</span> Deployment Options
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => onPlatformChange('vercel')}
                  className={`p-4 rounded-xl border transition-all ${
                    deploymentInstructions.platform === 'vercel'
                      ? 'bg-black/40 border-blue-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="text-2xl mb-2">▲</div>
                  <div className="text-white font-medium">Vercel</div>
                  <div className="text-xs text-slate-400 mt-1">Recommended</div>
                </button>
                <button
                  onClick={() => onPlatformChange('netlify')}
                  className={`p-4 rounded-xl border transition-all ${
                    deploymentInstructions.platform === 'netlify'
                      ? 'bg-black/40 border-blue-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="text-2xl mb-2">◆</div>
                  <div className="text-white font-medium">Netlify</div>
                  <div className="text-xs text-slate-400 mt-1">Easy Deploy</div>
                </button>
                <button
                  onClick={() => onPlatformChange('github')}
                  className={`p-4 rounded-xl border transition-all ${
                    deploymentInstructions.platform === 'github'
                      ? 'bg-black/40 border-blue-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="text-2xl mb-2">🐙</div>
                  <div className="text-white font-medium">GitHub</div>
                  <div className="text-xs text-slate-400 mt-1">Version Control</div>
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span>📋</span> Deployment Steps
              </h3>
              <div className="bg-black/20 rounded-xl border border-white/10 p-4">
                <ol className="space-y-3">
                  {deploymentInstructions.steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-xs text-blue-400 font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm text-slate-300 leading-relaxed pt-0.5">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>

                {deploymentInstructions.cliCommand && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400">Quick Deploy Command:</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(deploymentInstructions.cliCommand || '');
                          alert('Command copied to clipboard!');
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Copy
                      </button>
                    </div>
                    <code className="block px-3 py-2 rounded-lg bg-black/40 text-green-400 text-sm font-mono">
                      {deploymentInstructions.cliCommand}
                    </code>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Resources */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">💡</span>
                <div className="text-sm text-slate-300">
                  <p className="font-semibold text-white mb-1">Tip:</p>
                  <p>
                    For the best experience, we recommend deploying to Vercel. It&apos;s optimized for Next.js apps and provides automatic deployments, preview URLs, and zero-config setup.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/20 flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>📦</span>
            <span>Check your downloads folder for the ZIP file</span>
          </div>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeploymentModal;
