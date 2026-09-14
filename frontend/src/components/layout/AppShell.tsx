import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import './layout.css';

interface AppShellProps {
  children: React.ReactNode;
  wsStatus: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR';
}

export const AppShell: React.FC<AppShellProps> = ({ children, wsStatus }) => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <Header wsStatus={wsStatus} />
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
};
