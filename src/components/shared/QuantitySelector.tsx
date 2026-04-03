"use client";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  size?: "sm" | "lg";
}

export default function QuantitySelector({
  value,
  onChange,
  min = 0,
  max = 999,
  label,
  size = "lg",
}: QuantitySelectorProps) {
  const decrease = () => onChange(Math.max(min, value - 1));
  const increase = () => onChange(Math.min(max, value + 1));

  if (size === "sm") {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={decrease}
          disabled={value <= min}
          className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary disabled:opacity-30 active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-sm">remove</span>
        </button>
        <span className={`text-lg font-bold ${value > 0 ? "text-primary" : "text-on-surface"}`}>
          {value}
        </span>
        <button
          onClick={increase}
          disabled={value >= max}
          className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary disabled:opacity-30 active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-sm">add</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <span className="text-on-surface-variant uppercase tracking-widest text-xs font-medium">
          {label}
        </span>
      )}
      <div className="flex items-center gap-8">
        <button
          onClick={decrease}
          disabled={value <= min}
          className="w-16 h-16 bg-surface-container-highest flex items-center justify-center rounded-full text-primary active:scale-90 transition-all disabled:opacity-30"
        >
          <span className="material-symbols-outlined text-3xl font-bold">
            remove
          </span>
        </button>
        <div className="text-center">
          <span className="block text-4xl font-bold text-on-surface">
            {value}
          </span>
        </div>
        <button
          onClick={increase}
          disabled={value >= max}
          className="w-16 h-16 bg-primary text-on-primary flex items-center justify-center rounded-full active:scale-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-30"
        >
          <span className="material-symbols-outlined text-3xl font-bold">
            add
          </span>
        </button>
      </div>
    </div>
  );
}
