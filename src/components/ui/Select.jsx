import React from 'react';

/**
 * Select component with proper accessibility
 * Following React Aria patterns for form controls
 */
export const Select = ({ 
  label, 
  value, 
  onChange, 
  options = [], 
  placeholder,
  className = '',
  id,
  ariaLabel,
  renderOption
}) => {
  const selectId = id || `select-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  
  return (
    <div className="space-y-2">
      {label && (
        <label 
          htmlFor={selectId} 
          className="text-xs text-slate-500 block"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        value={value}
        onChange={onChange}
        aria-label={ariaLabel || label}
        className={`bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 w-full text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => {
          const { value: optValue, label: optLabel, key } = 
            typeof option === 'object' 
              ? option 
              : { value: option, label: option, key: option };
          
          return (
            <option key={key || optValue} value={optValue}>
              {renderOption ? renderOption(option) : optLabel}
            </option>
          );
        })}
      </select>
    </div>
  );
};
