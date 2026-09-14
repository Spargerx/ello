import React from 'react';
import './common.css';

export const PageHeader: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="page-header">
    <h1 className="page-title">{title}</h1>
    <p className="page-description">{description}</p>
  </div>
);
