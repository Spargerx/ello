import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/States';
import { api } from '../../api/services';
import type { PoliciesResponse } from '../../types/security';
import { Shield, Zap, Search, Activity, Users, Database, ArrowDown } from 'lucide-react';
import './policies.css';

export const Policies: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [policies, setPolicies] = useState<PoliciesResponse | null>(null);
  
  const navigate = useNavigate();

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getPolicies();
      setPolicies(res);
    } catch (err) {
      console.error("Failed to fetch policies:", err);
      setError("Unable to load gateway policies.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  if (loading) return <LoadingState message="Loading active policies..." />;
  if (error) return <ErrorState message={error} onRetry={fetchPolicies} />;
  if (!policies) return <EmptyState message="No policies found." />;

  const isEnforcing = policies.protection_mode === 'active' || policies.protection_mode === 'ENFORCING';
  const modeClass = isEnforcing ? 'enforcing' : 'detection';
  const modeDisplay = isEnforcing ? 'ENFORCING' : 'DETECTION ONLY';
  const modeDesc = isEnforcing 
    ? 'Threats are detected and blocked according to security policy.' 
    : 'Threats are detected and logged but requests are allowed to continue.';

  return (
    <div className="page policies-page">
      <PageHeader 
        title="Gateway Policies" 
        description="Active security controls protecting API traffic." 
      />

      <div className={`protection-banner ${modeClass}`}>
        <div className="protection-info">
          <h2>
            Protection Mode
            <span className="mode-badge">{modeDisplay}</span>
          </h2>
          <p>{modeDesc}</p>
        </div>
      </div>

      <div className="policies-grid">
        {/* BOLA */}
        <div className="policy-card">
          <div className="policy-header">
            <div className="policy-title-group">
              <Users size={20} color="var(--accent-primary)" />
              <h3 className="policy-title">BOLA Protection</h3>
            </div>
            {policies.bola?.enabled && (
              <div className="status-indicator">
                <div className="status-dot"></div>
                ACTIVE
              </div>
            )}
          </div>
          <p className="policy-desc">
            Validates authenticated users against resource ownership before protected data is returned. Detects cross-user access attempts.
          </p>
          <div className="policy-action">
            <button className="policy-btn" onClick={() => navigate('/attack-lab')}>
              Test this control &rarr;
            </button>
          </div>
        </div>

        {/* JWT Auth */}
        <div className="policy-card">
          <div className="policy-header">
            <div className="policy-title-group">
              <Shield size={20} color="var(--accent-primary)" />
              <h3 className="policy-title">JWT Authentication</h3>
            </div>
            <div className="status-indicator">
              <div className="status-dot"></div>
              ACTIVE
            </div>
          </div>
          <p className="policy-desc">
            Validates API identity and token claims before protected requests proceed.
          </p>
        </div>

        {/* Rate Limiting */}
        <div className="policy-card">
          <div className="policy-header">
            <div className="policy-title-group">
              <Activity size={20} color="var(--accent-primary)" />
              <h3 className="policy-title">Rate Limiting</h3>
            </div>
            {policies.rate_limiting?.enabled && (
              <div className="status-indicator">
                <div className="status-dot"></div>
                ACTIVE
              </div>
            )}
          </div>
          <p className="policy-desc">
            Restricts the number of requests a client can make within a specific time window.
          </p>
          {policies.rate_limiting?.enabled && (
            <div className="policy-config">
              {policies.rate_limiting.requests} requests / {policies.rate_limiting.window_seconds}s
            </div>
          )}
        </div>

        {/* Payload / Injection Detection */}
        <div className="policy-card">
          <div className="policy-header">
            <div className="policy-title-group">
              <Search size={20} color="var(--accent-primary)" />
              <h3 className="policy-title">Payload Detection</h3>
            </div>
            {policies.payload_detection?.enabled && (
              <div className="status-indicator">
                <div className="status-dot"></div>
                ACTIVE
              </div>
            )}
          </div>
          <p className="policy-desc">
            Scans incoming request payloads for injection patterns such as SQLi.
          </p>
        </div>

        {/* Security Event Logging */}
        <div className="policy-card">
          <div className="policy-header">
            <div className="policy-title-group">
              <Database size={20} color="var(--accent-primary)" />
              <h3 className="policy-title">Security Event Logging</h3>
            </div>
            {policies.audit_logging?.enabled && (
              <div className="status-indicator">
                <div className="status-dot"></div>
                ACTIVE
              </div>
            )}
          </div>
          <p className="policy-desc">
            Security decisions are persisted as SecurityEvents for investigation and analytics.
          </p>
        </div>

        {/* Live Security Events (WebSocket) */}
        <div className="policy-card">
          <div className="policy-header">
            <div className="policy-title-group">
              <Zap size={20} color="var(--accent-primary)" />
              <h3 className="policy-title">Live Security Events</h3>
            </div>
            {policies.websocket_telemetry?.enabled && (
              <div className="status-indicator">
                <div className="status-dot"></div>
                ACTIVE
              </div>
            )}
          </div>
          <p className="policy-desc">
            Security events are broadcast to connected SOC clients through WebSocket in real-time.
          </p>
        </div>
      </div>

      <div className="pipeline-viz">
        <h3>Gateway Pipeline</h3>
        <div className="pipeline-steps">
          <div className="step-box">Incoming Request</div>
          <div className="step-arrow"><ArrowDown size={16} /></div>
          <div className="step-box">JWT Validation</div>
          <div className="step-arrow"><ArrowDown size={16} /></div>
          <div className="step-box">Payload Scan</div>
          <div className="step-arrow"><ArrowDown size={16} /></div>
          <div className="step-box">Rate Limit</div>
          <div className="step-arrow"><ArrowDown size={16} /></div>
          <div className="step-box">Resource Extraction</div>
          <div className="step-arrow"><ArrowDown size={16} /></div>
          <div className="step-box">BOLA / Authorization</div>
          <div className="step-arrow"><ArrowDown size={16} /></div>
          <div className="step-box">Risk Assessment</div>
          <div className="step-arrow"><ArrowDown size={16} /></div>
          <div className="step-box">Policy Decision</div>
          <div className="step-arrow"><ArrowDown size={16} /></div>
          <div className="step-box" style={{ background: 'var(--bg-surface)', borderColor: 'var(--accent-primary)' }}>
            ALLOW / BLOCK / DETECT
          </div>
        </div>
      </div>
    </div>
  );
};

export default Policies;
