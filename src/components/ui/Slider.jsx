import React from 'react';

/**
 * Slider component with accessibility features
 * Supports keyboard navigation and screen readers
 */
export const Slider = ({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max = 100, 
  step = 1,
  formatValue,
  className = '',
  id,
  ariaLabel
}) => {
  const sliderId = id || `slider-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  const displayValue = formatValue ? formatValue(value) : value;

  return (
    <div className="space-y-2">
      {label && (
        <label 
          htmlFor={sliderId} 
          className="text-xs text-slate-500 block"
        >
          {label}: {displayValue}
        </label>
      )}
      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        aria-label={ariaLabel || label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={displayValue}
        className={`w-full accent-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black ${className}`}
      />
    </div>
  );
};
