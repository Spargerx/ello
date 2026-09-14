import React from 'react';
import './common.css';
import { AlertCircle, Loader, FileQuestion } from 'lucide-react';

export const LoadingState: React.FC<{ message?: string }> = ({ message = "Loading data..." }) => (
  <div className="state-container">
    <Loader className="state-icon spin" />
    <p className="state-text">{message}</p>
  </div>
);

export const ErrorState: React.FC<{ message?: string, onRetry?: () => void }> = ({ message = "An error occurred.", onRetry }) => (
  <div className="state-container error">
    <AlertCircle className="state-icon" />
    <p className="state-text">{message}</p>
    {onRetry && <button onClick={onRetry} className="btn btn-outline-danger mt-sm">Retry</button>}
  </div>
);

export const EmptyState: React.FC<{ message?: string, icon?: React.ReactNode }> = ({ message = "No data available.", icon = <FileQuestion /> }) => (
  <div className="state-container empty">
    <div className="state-icon">{icon}</div>
    <p className="state-text">{message}</p>
  </div>
);
