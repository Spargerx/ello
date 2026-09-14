import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { EventDetailModal } from '../../components/common/EventDetailModal';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/States';
import { api } from '../../api/services';
import type { SecurityEvent } from '../../types/events';
import type { TrafficFilters } from '../../types/security';
import './traffic.css';

export const Traffic: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [total, setTotal] = useState(0);
  
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Filters
  const [filters, setFilters] = useState<TrafficFilters>({});
  
  // Detail Modal
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);

  const fetchTraffic = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getTraffic(page, pageSize, filters);
      setEvents(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("Failed to fetch traffic:", err);
      setError("Unable to load traffic log.");
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchTraffic();
  }, [fetchTraffic]);

  const handleFilterChange = (key: keyof TrafficFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
    setPage(1); // Reset page on filter change
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="page traffic-page">
      <PageHeader 
        title="Traffic" 
        description="Live view of API requests and security decisions." 
      />

      <div className="traffic-controls">
        <div className="filter-group">
          <label>Method</label>
          <select 
            value={filters.method || ''} 
            onChange={(e) => handleFilterChange('method', e.target.value)}
          >
            <option value="">All</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Action</label>
          <select 
            value={filters.action || ''} 
            onChange={(e) => handleFilterChange('action', e.target.value)}
          >
            <option value="">All</option>
            <option value="ALLOW">ALLOW</option>
            <option value="BLOCK">BLOCK</option>
            <option value="DETECT">DETECT</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Threat Type</label>
          <select 
            value={filters.threat_type || ''} 
            onChange={(e) => handleFilterChange('threat_type', e.target.value)}
          >
            <option value="">All</option>
            <option value="BOLA">BOLA</option>
            <option value="RATE_LIMIT">Rate Limit</option>
            <option value="SQL_INJECTION">SQL Injection</option>
            <option value="ACCESS_GRANTED">Access Granted</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Path</label>
          <input 
            type="text" 
            placeholder="Search path..."
            value={filters.path || ''}
            onChange={(e) => handleFilterChange('path', e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <label>User ID</label>
          <input 
            type="text" 
            placeholder="e.g. U001"
            value={filters.user_id || ''}
            onChange={(e) => handleFilterChange('user_id', e.target.value)}
          />
        </div>
      </div>

      {loading && events.length === 0 ? (
        <LoadingState message="Loading traffic records..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchTraffic} />
      ) : events.length === 0 ? (
        <EmptyState message="No traffic recorded matching these filters." />
      ) : (
        <div className="traffic-table-container">
          <table className="traffic-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Method</th>
                <th>Path</th>
                <th>Status</th>
                <th>Action</th>
                <th>User</th>
                <th>Threat</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.event_id} onClick={() => setSelectedEvent(event)}>
                  <td>{new Date(event.timestamp).toLocaleString()}</td>
                  <td><strong>{event.method}</strong></td>
                  <td style={{ fontFamily: 'monospace' }}>{event.path}</td>
                  <td>
                    <span className={`status-badge ${event.status_code >= 400 ? 'error' : 'success'}`}>
                      {event.status_code}
                    </span>
                  </td>
                  <td>
                    <span className={`action-badge action-${event.action}`}>
                      {event.action}
                    </span>
                  </td>
                  <td>{event.user_id || 'Anonymous'}</td>
                  <td>
                    {event.threat_type && (event.threat_type as string) !== 'ACCESS_GRANTED' ? (
                      <span className="threat-tag">{event.threat_type}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  <td>
                    {(event.risk_score || 0) > 0 ? (
                      <strong style={{ color: (event.risk_score || 0) > 50 ? '#bf616a' : '#ebcb8b' }}>
                        {event.risk_score}
                      </strong>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="pagination">
            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} records
            </span>
            <div className="pagination-controls">
              <button 
                className="pagination-btn"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <button 
                className="pagination-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEvent && (
        <EventDetailModal 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
        />
      )}
    </div>
  );
};

export default Traffic;
