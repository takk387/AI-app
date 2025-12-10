'use client';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  description?: string;
  presets?: string[];
}

/**
 * Color picker component with presets
 */
export function ColorPicker({ value, onChange, label, description, presets }: ColorPickerProps) {
  return (
    <div className="py-3">
      <div className="mb-2">
        <label className="text-white font-medium">{label}</label>
        {description && <p className="text-sm text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {presets && presets.length > 0 && (
        <div className="flex gap-2 mt-2">
          {presets.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                value === color ? 'border-white scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ColorPicker;
