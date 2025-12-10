'use client';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  description?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password';
}

/**
 * Text input component with label
 */
export function TextInput({
  value,
  onChange,
  label,
  description,
  placeholder,
  type = 'text',
}: TextInputProps) {
  return (
    <div className="py-3">
      <div className="mb-2">
        <label className="text-white font-medium">{label}</label>
        {description && <p className="text-sm text-slate-400 mt-0.5">{description}</p>}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

export default TextInput;
