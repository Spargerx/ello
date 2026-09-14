import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { SecurityWebSocket } from './api/websocket';
import type { WebSocketStatus } from './api/websocket';
import Dashboard from './pages/Dashboard';
import AttackLab from './pages/AttackLab';
import Traffic from './pages/Traffic';
import ThreatAnalytics from './pages/ThreatAnalytics';
import Policies from './pages/Policies';
import type { SecurityEvent } from './types/events';

const WS_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';

function App() {
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>('DISCONNECTED');
  // We'll store events globally later, but for now we just handle WS connection
  const [, setLatestEvent] = useState<SecurityEvent | null>(null);

  useEffect(() => {
    // Only connect if we need live events (in Phase 4, we establish foundation)
    const ws = new SecurityWebSocket(
      `${WS_URL}/ws/security-events`,
      (event) => {
        setLatestEvent(event);
      },
      (status) => {
        setWsStatus(status);
      }
    );

    ws.connect();

    return () => {
      ws.disconnect();
    };
  }, []);

  return (
    <Router>
      <AppShell wsStatus={wsStatus}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/attack-lab" element={<AttackLab />} />
          <Route path="/traffic" element={<Traffic />} />
          <Route path="/analytics" element={<ThreatAnalytics />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </Router>
  );
}

export default App;
