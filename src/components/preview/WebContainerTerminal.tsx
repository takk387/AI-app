'use client';

import React, { useRef, useEffect } from 'react';

interface WebContainerTerminalProps {
  output: string[];
  className?: string;
  maxLines?: number;
}

/**
 * Terminal display component for WebContainer output
 * Shows npm install progress, dev server logs, etc.
 */
export function WebContainerTerminal({
  output,
  className = '',
  maxLines = 100,
}: WebContainerTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  // Trim to max lines
  const displayOutput = output.slice(-maxLines);

  return (
    <div
      ref={terminalRef}
      className={`bg-zinc-900 text-zinc-100 font-mono text-xs p-3 overflow-auto ${className}`}
    >
      {displayOutput.length === 0 ? (
        <span className="text-zinc-500">Waiting for output...</span>
      ) : (
        displayOutput.map((line, index) => (
          <div key={index} className="whitespace-pre-wrap break-all">
            {formatLine(line)}
          </div>
        ))
      )}
    </div>
  );
}

/**
 * Format terminal line with basic ANSI color support
 */
function formatLine(line: string): React.ReactNode {
  // Strip most ANSI codes but preserve some basic ones
  // This is a simplified approach - full ANSI support would be more complex
  const cleaned = line
    .replace(/\x1b\[\d+m/g, '') // Remove color codes
    .replace(/\x1b\[\d+;\d+m/g, '') // Remove combined codes
    .replace(/\x1b\[K/g, '') // Remove clear line
    .replace(/\r/g, ''); // Remove carriage returns

  // Highlight npm progress indicators
  if (cleaned.includes('npm WARN')) {
    return <span className="text-yellow-400">{cleaned}</span>;
  }
  if (cleaned.includes('npm ERR')) {
    return <span className="text-red-400">{cleaned}</span>;
  }
  if (cleaned.includes('added') && cleaned.includes('packages')) {
    return <span className="text-green-400">{cleaned}</span>;
  }
  if (cleaned.includes('Local:') || cleaned.includes('ready')) {
    return <span className="text-cyan-400">{cleaned}</span>;
  }

  return cleaned;
}

export default WebContainerTerminal;
