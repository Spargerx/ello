import React, { useEffect, useState, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import { ShieldAlert, Activity, CheckCircle } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/States';
import { api } from '../../api/services';
import type { AnalyticsResponse } from '../../types/security';
import { SecurityWebSocket } from '../../api/websocket';
import './analytics.css';

const WS_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';

const COLORS = {
  BOLA: '#bf616a',
  RATE_LIMIT: '#d08770',
  SQL_INJECTION: '#ebcb8b',
  COMMAND_INJECTION: '#b48ead',
  OTHER: '#81a1c1'
};

const SEVERITY_COLORS = {
  CRITICAL: '#bf616a',
  HIGH: '#d08770',
  MEDIUM: '#ebcb8b',
  LOW: '#a3be8c',
  INFO: '#81a1c1'
};

export const ThreatAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsResponse | null>(null);

  const fetchAnalytics = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      setError(null);
      const res = await api.getAnalytics();
      setData(res);
    } catch (err) {
      console.error("Failed to load analytics:", err);
      if (!quiet) setError("Unable to load security analytics.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();

    const ws = new SecurityWebSocket(
      `${WS_URL}/ws/security-events`,
      () => {
        // Quietly refresh analytics when a new event happens
        fetchAnalytics(true);
      },
      () => {} // fallback handled internally
    );
    ws.connect();

    return () => ws.disconnect();
  }, [fetchAnalytics]);

  if (loading && !data) return <LoadingState message="Aggregating analytics..." />;
  if (error) return <ErrorState message={error} onRetry={() => fetchAnalytics()} />;
  if (!data) return <EmptyState message="No analytics data available." />;

  const { traffic, threats, severity, top_endpoints, top_users } = data;

  return (
    <div className="page analytics-page">
      <PageHeader 
        title="Threat Analytics" 
        description="Authoritative metrics and distribution of API gateway traffic." 
      />

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-title">Total Requests</div>
          <div className="metric-value">
            <Activity size={24} color="var(--accent-primary)" />
            {traffic.total_requests.toLocaleString()}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Request Rate (req/s)</div>
          <div className="metric-value">
            <Activity size={24} color="#8fbcbb" />
            {traffic.request_rate}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Allowed Requests</div>
          <div className="metric-value">
            <CheckCircle size={24} color="#a3be8c" />
            {traffic.allowed_requests.toLocaleString()}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-title">Blocked Requests</div>
          <div className="metric-value">
            <ShieldAlert size={24} color="#bf616a" />
            {traffic.blocked_requests.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="charts-grid">
        {/* Threat Distribution */}
        <div className="chart-card">
          <h3>Threat Distribution</h3>
          {threats.length === 0 ? (
            <EmptyState message="No threats recorded." />
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={threats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {threats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || COLORS.OTHER} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Severity Distribution */}
        <div className="chart-card">
          <h3>Severity Distribution</h3>
          {severity.length === 0 ? (
            <EmptyState message="No severity data recorded." />
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severity}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {severity.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.name as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.INFO} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Endpoints */}
        <div className="chart-card">
          <h3>Top Threatened Endpoints</h3>
          {top_endpoints.length === 0 ? (
            <EmptyState message="No endpoint threats recorded." />
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top_endpoints} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="path" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} width={150} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)' }}
                  />
                  <Bar dataKey="threats" fill="#8fbcbb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Users */}
        <div className="chart-card">
          <h3>Top Attacking Users</h3>
          {top_users.length === 0 ? (
            <EmptyState message="No user threats recorded." />
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top_users} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="user_id" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)' }}
                  />
                  <Bar dataKey="threats" fill="#b48ead" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThreatAnalytics;
