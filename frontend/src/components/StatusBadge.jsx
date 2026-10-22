import React from 'react';
import { STATUS_CONFIG } from '../config';

export function StatusBadge({ status, className = '' }) {
  const currentConfig = STATUS_CONFIG[status] || {
    label: status ? status.replace('_', ' ') : 'Unknown',
    bgClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentConfig.bgClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${currentConfig.dotClass}`} />
      {currentConfig.label}
    </span>
  );
}
