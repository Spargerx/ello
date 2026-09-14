import React from 'react';
import { X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { SecurityEvent } from '../../types/events';
import { ActionBadge, SeverityBadge, StatusBadge } from './Badges';

interface EventDetailModalProps {
  event: SecurityEvent;
  onClose: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({ event, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Security Event Details</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="detail-grid">
            <div className="detail-group">
              <label>Event ID</label>
              <div className="detail-value text-mono">{event.event_id}</div>
            </div>
            <div className="detail-group">
              <label>Request ID</label>
              <div className="detail-value text-mono">{event.request_id}</div>
            </div>
            <div className="detail-group">
              <label>Timestamp</label>
              <div className="detail-value">{new Date(event.timestamp).toLocaleString()}</div>
            </div>
            
            <div className="detail-group">
              <label>User</label>
              <div className="detail-value">{event.user_id || 'Anonymous'}</div>
            </div>
            <div className="detail-group">
              <label>Role</label>
              <div className="detail-value">{event.role || '-'}</div>
            </div>
            
            <div className="detail-group">
              <label>Target</label>
              <div className="detail-value text-mono">
                {event.method} {event.path}
              </div>
            </div>
            
            <div className="detail-group">
              <label>Resource</label>
              <div className="detail-value">{event.resource_id || '-'}</div>
            </div>
            <div className="detail-group">
              <label>Resource Owner</label>
              <div className="detail-value">{event.resource_owner || '-'}</div>
            </div>

            <div className="detail-group">
              <label>Threat Type</label>
              <div className="detail-value">
                {event.threat_type ? <span className="threat-label">{event.threat_type}</span> : '-'}
              </div>
            </div>
            
            <div className="detail-group">
              <label>Severity</label>
              <div className="detail-value">
                {event.severity ? <SeverityBadge severity={event.severity} /> : '-'}
              </div>
            </div>
            
            <div className="detail-group">
              <label>Risk Score</label>
              <div className="detail-value">
                <span className={`risk-score ${(event.risk_score || 0) >= 70 ? 'high' : (event.risk_score || 0) >= 40 ? 'medium' : 'low'}`}>
                  {event.risk_score || 0}
                </span>
              </div>
            </div>

            <div className="detail-group">
              <label>Final Action</label>
              <div className="detail-value">
                <ActionBadge action={event.action} />
              </div>
            </div>

            <div className="detail-group">
              <label>Status Code</label>
              <div className="detail-value">
                <StatusBadge status={event.status_code >= 400 ? 'error' : 'active'}>
                  {event.status_code}
                </StatusBadge>
              </div>
            </div>

            <div className="detail-group full-width">
              <label>Reason</label>
              <div className="detail-value">{event.reason || '-'}</div>
            </div>
          </div>

          <div className="decision-trace-section">
            <h3>Decision Trace</h3>
            <div className="trace-timeline">
              {(event.decision_trace || []).map((step, idx) => {
                let icon;
                let statusClass = '';
                
                if (step.status === 'PASS') {
                  icon = <CheckCircle size={16} />;
                  statusClass = 'trace-pass';
                } else if (step.status === 'FAIL') {
                  icon = <XCircle size={16} />;
                  statusClass = 'trace-fail';
                } else if (step.status === 'DETECT') {
                  icon = <AlertTriangle size={16} />;
                  statusClass = 'trace-action';
                } else if (step.status === 'ERROR') {
                  icon = <XCircle size={16} />;
                  statusClass = 'trace-fail';
                } else {
                  icon = <span className="dot" />;
                }

                return (
                  <div key={idx} className={`trace-step ${statusClass}`}>
                    <div className="trace-icon">{icon}</div>
                    <div className="trace-content">
                      <span className="trace-name">{step.step}</span>
                      <span className="trace-details">
                        {step.detail && (
                          <span className="trace-detail-tag">
                            {step.detail}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
