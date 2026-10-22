import React from 'react';

export function LoadingSpinner({ size = 'md', text = 'Loading...' }) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-3" role="status">
      <svg
        className={`animate-spin text-indigo-600 ${sizeMap[size] || sizeMap.md}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {text && <span className="text-sm font-medium text-slate-500 animate-pulse">{text}</span>}
      <span className="sr-only">Loading content</span>
    </div>
  );
}

export function ItemCardSkeleton() {
  return (
    <div className="card-premium overflow-hidden animate-pulse flex flex-col">
      <div className="h-48 bg-slate-200" />
      <div className="p-5 flex-1 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="w-16 h-5 bg-slate-200 rounded-full" />
          <div className="w-20 h-5 bg-slate-200 rounded-full" />
        </div>
        <div className="w-3/4 h-6 bg-slate-200 rounded-lg" />
        <div className="w-full h-4 bg-slate-200 rounded" />
        <div className="w-5/6 h-4 bg-slate-200 rounded" />
        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="w-24 h-4 bg-slate-200 rounded" />
          <div className="w-16 h-4 bg-slate-200 rounded" />
        </div>
      </div>
    </div>
  );
}
