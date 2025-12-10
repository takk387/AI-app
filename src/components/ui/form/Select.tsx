'use client';

interface SelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
  description?: string;
}

/**
 * Select dropdown component with label
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  description,
}: SelectProps<T>) {
  return (
    <div className="py-3">
      <div className="mb-2">
        <label className="text-white font-medium">{label}</label>
        {description && <p className="text-sm text-slate-400 mt-0.5">{description}</p>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default Select;
