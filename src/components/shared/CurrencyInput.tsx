"use client";

import { useState } from "react";

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
  size?: "lg" | "md";
}

export default function CurrencyInput({
  value,
  onChange,
  label,
  placeholder = "0",
  size = "lg",
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(
    value > 0 ? value.toLocaleString("en-NG") : ""
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    const num = parseInt(raw, 10) || 0;
    setDisplayValue(num > 0 ? num.toLocaleString("en-NG") : "");
    onChange(num);
  };

  const isLg = size === "lg";

  return (
    <div className="relative group">
      {label && (
        <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2 ml-1 font-semibold">
          {label}
        </label>
      )}
      <div
        className={`flex items-center bg-surface-container-lowest border border-outline-variant/15 rounded-xl shadow-sm group-focus-within:border-primary/40 transition-colors ${
          isLg ? "px-5 py-4" : "px-4 py-3"
        }`}
      >
        <span
          className={`font-headline font-bold text-primary mr-3 ${
            isLg ? "text-3xl" : "text-xl"
          }`}
        >
          ₦
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full bg-transparent border-none p-0 font-headline font-bold focus:ring-0 text-on-surface ${
            isLg ? "text-3xl" : "text-xl"
          }`}
        />
      </div>
    </div>
  );
}
