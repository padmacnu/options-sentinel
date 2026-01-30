import React, { useState } from 'react';

/**
 * Tooltip component with keyboard and mouse support
 * Shows on hover and focus for accessibility
 */
export const Tooltip = ({ children, content, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="group relative inline-block">
      <span 
        className="text-xs text-slate-500 cursor-help border-b border-dotted border-slate-500"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        tabIndex={0}
        role="tooltip"
        aria-label={content}
      >
        {children}
      </span>
      {isVisible && (
        <div className={`absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 ${className}`}>
          <div className="text-xs text-slate-300 leading-relaxed">
            {content}
          </div>
        </div>
      )}
    </div>
  );
};
