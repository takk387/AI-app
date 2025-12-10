'use client';

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  description?: string;
  placeholder?: string;
  rows?: number;
}

/**
 * Multi-line text area component with label
 */
export function TextArea({
  value,
  onChange,
  label,
  description,
  placeholder,
  rows = 4,
}: TextAreaProps) {
  return (
    <div className="py-3">
      <div className="mb-2">
        <label className="text-white font-medium">{label}</label>
        {description && <p className="text-sm text-slate-400 mt-0.5">{description}</p>}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
    </div>
  );
}

export default TextArea;
