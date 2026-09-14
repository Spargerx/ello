import React from 'react';
import './common.css';
import type { Action, Severity } from '../../types/api';

export const StatusBadge: React.FC<{ status: 'active' | 'inactive' | 'error' | 'warning', children: React.ReactNode }> = ({ status, children }) => (
  <span className={`badge badge-${status}`}>
    <span className={`badge-dot bg-${status}`}></span>
    {children}
  </span>
);

export const ActionBadge: React.FC<{ action: Action }> = ({ action }) => {
  const getTheme = () => {
    switch (action) {
      case 'ALLOW': return 'success';
      case 'BLOCK': return 'danger';
      case 'DETECT': return 'warning';
      default: return 'inactive';
    }
  };
  return <span className={`badge badge-${getTheme()} action-badge`}>{action}</span>;
};

export const SeverityBadge: React.FC<{ severity: Severity }> = ({ severity }) => {
  const getTheme = () => {
    switch (severity) {
      case 'LOW': return 'info';
      case 'MEDIUM': return 'warning';
      case 'HIGH': return 'danger';
      case 'CRITICAL': return 'danger'; // Could have custom pulse style later
      default: return 'inactive';
    }
  };
  return <span className={`badge badge-${getTheme()}`}>{severity}</span>;
};
