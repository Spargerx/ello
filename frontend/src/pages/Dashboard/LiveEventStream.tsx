import React from 'react';
import type { SecurityEvent } from '../../types/events';
import { StatusBadge, ActionBadge, SeverityBadge } from '../../components/common/Badges';

interface LiveEventStreamProps {
  events: SecurityEvent[];
  onEventClick: (event: SecurityEvent) => void;
}

const formatTime = (isoString: string) => {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const LiveEventStream: React.FC<LiveEventStreamProps> = ({ events, onEventClick }) => {
  if (events.length === 0) {
    return (
      <div className="live-event-stream empty">
        <div className="empty-message">
          <p>No security events recorded yet.</p>
          <span className="empty-subtext">Run an attack from Attack Lab to generate live security telemetry.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="live-event-stream">
      <h3 className="section-title">Live Security Events</h3>
      <div className="table-responsive">
        <table className="event-table">
          <thead>
            <tr>
              <th>TIME</th>
              <th>THREAT</th>
              <th>SEVERITY</th>
              <th>ACTION</th>
              <th>USER</th>
              <th>METHOD</th>
              <th>PATH</th>
              <th>RESOURCE</th>
              <th>RISK</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {events.map((evt) => (
              <tr 
                key={evt.event_id} 
                className={`event-row ${evt.action === 'BLOCK' ? 'blocked-row' : ''} ${evt.action === 'ALLOW' ? 'allow-row' : ''}`}
                onClick={() => onEventClick(evt)}
              >
                <td className="cell-time">{formatTime(evt.timestamp)}</td>
                <td>
                  {evt.threat_type ? (
                    <span className={`threat-label ${evt.threat_type === 'ACCESS_GRANTED' ? 'threat-granted' : ''}`}>{evt.threat_type}</span>
                  ) : (
                    <span className="muted">-</span>
                  )}
                </td>
                <td>
                  {evt.severity ? <SeverityBadge severity={evt.severity} /> : <span className="muted">-</span>}
                </td>
                <td>
                  <ActionBadge action={evt.action} />
                </td>
                <td>{evt.user_id || 'Anonymous'}</td>
                <td className="cell-method">{evt.method}</td>
                <td className="cell-path"><code>{evt.path}</code></td>
                <td>{evt.resource_id || '-'}</td>
                <td>{evt.risk_score}</td>
                <td>
                  <StatusBadge status={evt.status_code >= 400 ? 'error' : 'active'}>
                    {evt.status_code}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
