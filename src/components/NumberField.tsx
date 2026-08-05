import { useRef } from 'react';

interface NumberFieldProps {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: string;
  prefix?: string;
}

// Numeric input that forbids negatives, strips leading zeros, and auto-selects
// the placeholder zero on focus so the cashier can type a clean number.
export function NumberField({ value, onChange, className = 'input', placeholder, min = 0, max, step, prefix }: NumberFieldProps) {
  const ref = useRef<HTMLInputElement>(null);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (value === 0 || value === 0.0) {
      e.target.select();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange(Math.max(0, min ?? 0));
      return;
    }
    // Reject anything that isn't a non-negative number (no '-' / no 'e')
    if (!/^\d*\.?\d*$/.test(raw)) return;
    const cleaned = raw.replace(/^0+(?=\d)/, '');
    const parsed = Number(cleaned);
    if (isNaN(parsed) || parsed < 0) return;
    const floor = Math.max(0, min ?? 0);
    const clamped = max !== undefined ? Math.min(parsed, max) : parsed;
    onChange(Math.max(floor, clamped));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Block the minus sign and exponential notation at the source
    if (e.key === '-' || e.key === 'e' || e.key === 'E') {
      e.preventDefault();
    }
  };

  return (
    <div className="relative">
      {prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium">{prefix}</span>}
      <input
        ref={ref}
        type="number"
        value={value === 0 ? '' : value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder ?? '0'}
        min={Math.max(0, min ?? 0)}
        max={max}
        step={step}
        className={`${className} ${prefix ? 'pl-10' : ''} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
      />
    </div>
  );
}
