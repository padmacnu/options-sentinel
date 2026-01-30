import React from 'react';

/**
 * TextField component with full accessibility support
 * Following React Aria patterns for text inputs
 */
export const TextField = ({ 
  label, 
  value, 
  onChange, 
  onKeyDown,
  placeholder,
  type = 'text',
  className = '',
  id,
  ariaLabel,
  ariaDescribedBy,
  autoComplete = 'off',
  maxLength,
  hideLabel = false,
  hint
}) => {
  const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <div className="space-y-1">
      <label 
        htmlFor={inputId} 
        className={hideLabel ? 'sr-only' : 'text-xs text-slate-500 block'}
      >
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel || label}
        aria-describedby={ariaDescribedBy || hintId}
        autoComplete={autoComplete}
        maxLength={maxLength}
        className={`bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 w-full text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
      />
      {hint && (
        <span id={hintId} className="sr-only">{hint}</span>
      )}
    </div>
  );
};
