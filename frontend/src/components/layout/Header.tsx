import React, { useEffect, useState } from 'react';
import { StatusBadge } from '../common/Badges';
import { api } from '../../api/services';
import './layout.css';

interface HeaderProps {
  wsStatus: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR';
}

export const Header: React.FC<HeaderProps> = ({ wsStatus }) => {
  const [backendHealth, setBackendHealth] = useState<'checking' | 'connected' | 'error'>('checking');
  const [protectionMode, setProtectionMode] = useState<string>('UNKNOWN');

  useEffect(() => {
    // Initial fetch
    const checkHealth = async () => {
      try {
        const h = await api.getHealth();
        setBackendHealth(h.status === 'ok' ? 'connected' : 'error');
        
        const p = await api.getPolicies();
        setProtectionMode(p.protection_mode.toUpperCase());
      } catch (e) {
        setBackendHealth('error');
      }
    };
    checkHealth();
    
    // Poll every 10 seconds for health to not be aggressive
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="app-header">
      <div className="header-left">
        {/* Could put page title here later based on route */}
      </div>
      
      <div className="header-right">
        {/* Protection Status */}
        <StatusBadge status={protectionMode === 'ACTIVE' ? 'active' : (protectionMode === 'MONITOR' ? 'warning' : 'inactive')}>
          PROTECTION {protectionMode === 'ACTIVE' ? 'ACTIVE' : (protectionMode === 'MONITOR' ? 'DETECTION ONLY' : protectionMode)}
        </StatusBadge>

        <div className="header-divider"></div>

        {/* Backend REST Status */}
        <StatusBadge status={backendHealth === 'connected' ? 'active' : (backendHealth === 'error' ? 'error' : 'warning')}>
          BACKEND {backendHealth.toUpperCase()}
        </StatusBadge>

        {/* WS Status */}
        <StatusBadge status={wsStatus === 'CONNECTED' ? 'active' : (wsStatus === 'ERROR' || wsStatus === 'DISCONNECTED' ? 'error' : 'warning')}>
          WS {wsStatus}
        </StatusBadge>
      </div>
    </header>
  );
};
