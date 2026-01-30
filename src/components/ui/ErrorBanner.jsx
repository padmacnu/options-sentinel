import React from 'react';

/**
 * Accessible error banner with proper ARIA attributes
 */
export const ErrorBanner = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div 
      className="bg-red-900/20 border border-red-500 rounded-lg p-3 mb-4" 
      role="alert" 
      aria-live="assertive"
    >
      <div className="flex items-start justify-between">
        <p className="text-sm text-red-400 flex-1">
          ⚠️ {message}
        </p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-300 ml-2 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};
