'use client';

interface SectionHeaderProps {
  title: string;
  description?: string;
}

/**
 * Section header with title and optional description
 */
export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="mb-6 pb-4 border-b border-white/10">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
    </div>
  );
}

export default SectionHeader;
