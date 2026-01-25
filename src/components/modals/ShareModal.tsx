'use client';

import { useState, useCallback } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  appId: string;
  appTitle: string;
  initialShareState?: {
    isPublic: boolean;
    previewSlug: string | null;
  };
}

export default function ShareModal({
  isOpen,
  onClose,
  appId,
  appTitle,
  initialShareState,
}: ShareModalProps) {
  const [isPublic, setIsPublic] = useState(initialShareState?.isPublic ?? false);
  const [previewSlug, setPreviewSlug] = useState(initialShareState?.previewSlug);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = previewSlug ? `${window.location.origin}/preview/${previewSlug}` : null;

  const handleToggleShare = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isPublic) {
        // Disable sharing
        const response = await fetch(`/api/apps/${appId}/share`, {
          method: 'DELETE',
        });
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error);
        }

        setIsPublic(false);
      } else {
        // Enable sharing
        const response = await fetch(`/api/apps/${appId}/share`, {
          method: 'POST',
        });
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error);
        }

        setIsPublic(true);
        setPreviewSlug(data.previewSlug);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sharing');
    } finally {
      setIsLoading(false);
    }
  }, [appId, isPublic]);

  const handleCopyLink = useCallback(async () => {
    if (!previewUrl) return;

    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy link');
    }
  }, [previewUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Share App</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* App Title */}
          <div className="text-sm text-slate-400">
            Sharing <span className="text-white font-medium">{appTitle}</span>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-success-400"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-slate-400"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              )}
              <div>
                <div className="text-white font-medium">{isPublic ? 'Public' : 'Private'}</div>
                <div className="text-xs text-slate-400">
                  {isPublic ? 'Anyone with the link can view' : 'Only you can access'}
                </div>
              </div>
            </div>
            <button
              onClick={handleToggleShare}
              disabled={isLoading}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isPublic ? 'bg-success-600' : 'bg-slate-600'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  isPublic ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Share Link */}
          {isPublic && previewUrl && (
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Share Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={previewUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2 bg-garden-600 hover:bg-garden-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  {copied ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-error-900/20 border border-error-800 rounded-lg text-error-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
