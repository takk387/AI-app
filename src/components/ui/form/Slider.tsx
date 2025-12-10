'use client';

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  label: string;
  description?: string;
  formatValue?: (value: number) => string;
}

/**
 * Range slider component with label and value display
 */
export function Slider({
  value,
  onChange,
  min,
  max,
  step,
  label,
  description,
  formatValue,
}: SliderProps) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <label className="text-white font-medium">{label}</label>
          {description && <p className="text-sm text-slate-400 mt-0.5">{description}</p>}
        </div>
        <span className="text-blue-400 font-mono text-sm">
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  );
}

export default Slider;
