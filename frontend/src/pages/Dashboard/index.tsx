import React, { useEffect, useState, useCallback, useRef } from 'react';
import { RefreshCw, Activity, ShieldAlert, ShieldX, AlertTriangle, Fingerprint } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from './StatCard';
import { DashboardCharts } from './DashboardCharts';
import { LiveEventStream } from './LiveEventStream';
import { EventDetailModal } from '../../components/common/EventDetailModal';
import { LoadingState, ErrorState } from '../../components/common/States';
import { api } from '../../api/services';
import type { DashboardResponse, DashboardStats } from '../../types/security';
import type { SecurityEvent } from '../../types/events';
import { SecurityWebSocket } from '../../api/websocket';
import './dashboard.css';

const WS_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [timeline, setTimeline] = useState<DashboardResponse['timeline']>([]);
  const [distribution, setDistribution] = useState<DashboardResponse['threat_distribution']>([]);
  const [topEndpoints, setTopEndpoints] = useState<DashboardResponse['endpoint_threats']>([]);
  
  const [liveEvents, setLiveEvents] = useState<SecurityEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  
  // Track seen event IDs to prevent WebSocket + REST duplication
  const seenEventIds = useRef<Set<string>>(new Set());

  const fetchDashboardState = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      setError(null);
      
      const [dashboardData, recentEvents] = await Promise.all([
        api.getDashboard(),
        api.getEvents(50)
      ]);
      
      setStats(dashboardData.stats);
      setTimeline(dashboardData.timeline);
      setDistribution(dashboardData.threat_distribution);
      setTopEndpoints(dashboardData.endpoint_threats);
      
      const newEvents = recentEvents.filter(e => !seenEventIds.current.has(e.event_id));
      newEvents.forEach(e => seenEventIds.current.add(e.event_id));
      
      setLiveEvents(prev => [...newEvents, ...prev].slice(0, 100));
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      if (!quiet) setError("Unable to load security telemetry. Check the gateway connection and try again.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardState();

    const ws = new SecurityWebSocket(
      `${WS_URL}/ws/security-events`,
      (event) => {
        if (seenEventIds.current.has(event.event_id)) return;
        seenEventIds.current.add(event.event_id);
        
        // Add to live events
        setLiveEvents(prev => [event, ...prev].slice(0, 100));
        
        // Update stats optimistically based on backend's actual metrics structure
        setStats(prevStats => {
          if (!prevStats) return null;
          
          let newStats = { ...prevStats };
          newStats.total_requests += 1;
          
          if (event.action === 'BLOCK') {
            newStats.blocked_requests += 1;
          }
          
          if (event.threat_type) {
            newStats.threat_count += 1;
          }

          if (event.severity === 'HIGH' || event.severity === 'CRITICAL') {
            newStats.high_risk_count += 1;
          }

          if (event.threat_type === 'BOLA') {
            newStats.bola_count += 1;
          }
          
          return newStats;
        });
        
        // Quietly reconcile full dashboard state so timeline and distribution update accurately
        fetchDashboardState(true);
      },
      () => {
        // wsStatus is handled globally by AppShell, but we could show a local indicator if desired
      }
    );

    ws.connect();
    
    return () => {
      ws.disconnect();
    };
  }, [fetchDashboardState]);

  if (loading && !stats) {
    return (
      <div className="page">
        <PageHeader title="Security Operations Center" description="Real-time visibility into API traffic, threats, and gateway enforcement." />
        <LoadingState message="Loading security telemetry..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <PageHeader title="Security Operations Center" description="Real-time visibility into API traffic, threats, and gateway enforcement." />
        <ErrorState message={error} onRetry={fetchDashboardState} />
      </div>
    );
  }

  return (
    <div className="page dashboard-page">
      <div className="dashboard-header-row">
        <PageHeader 
          title="Security Operations Center" 
          description="Real-time visibility into API traffic, threats, and gateway enforcement." 
        />
        <button className="btn btn-secondary icon-btn" onClick={() => fetchDashboardState(false)} title="Refresh Dashboard">
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="dashboard-content">
        {/* STAT CARDS */}
        <div className="stat-cards-container">
          <StatCard 
            label="TOTAL REQUESTS" 
            value={stats?.total_requests || 0} 
            icon={<Activity size={20} />} 
          />
          <StatCard 
            label="BLOCKED REQUESTS" 
            value={stats?.blocked_requests || 0} 
            icon={<ShieldX size={20} />} 
            highlight={true}
          />
          <StatCard 
            label="THREATS DETECTED" 
            value={stats?.threat_count || 0} 
            icon={<ShieldAlert size={20} />} 
            highlight={true}
          />
          <StatCard 
            label="HIGH RISK" 
            value={stats?.high_risk_count || 0} 
            icon={<AlertTriangle size={20} />} 
          />
          <StatCard 
            label="BOLA ATTEMPTS" 
            value={stats?.bola_count || 0} 
            icon={<Fingerprint size={20} />} 
          />
        </div>

        {/* CHARTS */}
        <DashboardCharts 
          timeline={timeline}
          threatDistribution={distribution}
          topEndpoints={topEndpoints}
        />

        {/* LIVE EVENTS */}
        <LiveEventStream 
          events={liveEvents} 
          onEventClick={setSelectedEvent} 
        />
      </div>

      {selectedEvent && (
        <EventDetailModal 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
        />
      )}
    </div>
  );
};

export default Dashboard;
