import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import type { 
  TimelinePoint, 
  ThreatDistributionItem, 
  EndpointThreatItem 
} from '../../types/security';

const THREAT_COLORS: Record<string, string> = {
  BOLA: 'var(--color-danger)',
  RATE_LIMIT: 'var(--color-warning)',
  SQL_INJECTION: 'var(--color-accent-purple)',
  COMMAND_INJECTION: 'var(--color-accent-blue)',
  OTHER: 'var(--color-border)'
};

const formatTime = (isoString: string) => {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

interface DashboardChartsProps {
  timeline: TimelinePoint[];
  threatDistribution: ThreatDistributionItem[];
  topEndpoints: EndpointThreatItem[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  timeline,
  threatDistribution,
  topEndpoints
}) => {
  // Format timeline data
  const formattedTimeline = timeline.map(pt => ({
    ...pt,
    formattedTime: formatTime(pt.time)
  }));

  // Format endpoint data
  const formattedEndpoints = topEndpoints.map(ep => ({
    name: ep.path,
    value: ep.threats
  }));

  return (
    <div className="dashboard-charts-grid">
      {/* Timeline */}
      <div className="chart-card timeline-chart">
        <h3 className="chart-title">Request & Threat Timeline</h3>
        <div className="chart-container">
          {formattedTimeline.length === 0 ? (
            <div className="chart-empty">No activity recorded yet</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis 
                  dataKey="formattedTime" 
                  stroke="var(--color-text-secondary)" 
                  fontSize={12} 
                />
                <YAxis stroke="var(--color-text-secondary)" fontSize={12} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="count" name="Activity" stroke="var(--color-accent-blue)" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Threat Distribution */}
      <div className="chart-card distribution-chart">
        <h3 className="chart-title">Threat Distribution</h3>
        <div className="chart-container">
          {threatDistribution.length === 0 ? (
            <div className="chart-empty">No threats detected</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={threatDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                >
                  {threatDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={THREAT_COLORS[entry.name] || THREAT_COLORS.OTHER} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Endpoint Ranking */}
      <div className="chart-card endpoint-chart">
        <h3 className="chart-title">Endpoint Threat Ranking</h3>
        <div className="chart-container">
          {formattedEndpoints.length === 0 ? (
            <div className="chart-empty">No threats detected</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedEndpoints} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="var(--color-text-secondary)" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="var(--color-text-secondary)" fontSize={12} width={120} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  cursor={{fill: 'var(--color-surface-hover)'}}
                />
                <Bar dataKey="value" name="Threat Count" fill="var(--color-accent-purple)">
                  {formattedEndpoints.map((_, index) => (
                    <Cell key={`cell-${index}`} fill="var(--color-accent-purple)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
