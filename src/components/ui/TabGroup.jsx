import React from 'react';

/**
 * TabGroup component following React Aria design patterns
 * Provides accessible tab navigation with keyboard support
 */
export const TabGroup = ({ children, className = '', ariaLabel }) => {
  return (
    <div 
      className={`flex bg-slate-900 p-1 rounded-2xl border border-slate-800 ${className}`}
      role="tablist" 
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
};

export const Tab = ({ 
  isSelected, 
  onSelect, 
  children, 
  className = '',
  ariaControls 
}) => {
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <button
      role="tab"
      aria-selected={isSelected}
      aria-controls={ariaControls}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      tabIndex={isSelected ? 0 : -1}
      className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        isSelected 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
          : 'text-slate-500 hover:text-slate-300'
      } ${className}`}
    >
      {children}
    </button>
  );
};
