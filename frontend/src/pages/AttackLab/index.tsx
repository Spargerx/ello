import React, { useState } from 'react';
import { Play, Shield, Server, User, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { api } from '../../api/services';
import type { SimulatorBolaResponse } from '../../types/security';
import type { DecisionTraceStep } from '../../types/events';
import { AttackSweep } from './AttackSweep';
import './attackLab.css';

export const AttackLab: React.FC = () => {
  const [protectionMode, setProtectionMode] = useState<string>('ENFORCING');
  const [isAttacking, setIsAttacking] = useState(false);
  const [attackResult, setAttackResult] = useState<SimulatorBolaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAttack = async () => {
    setIsAttacking(true);
    setError(null);
    setAttackResult(null);
    
    try {
      const response = await api.runBolaSimulation({
        attacker_user_id: 'U001',
        target_resource_id: 'ACC002',
        protection_mode: protectionMode
      });
      
      setAttackResult(response);
    } catch (err) {
      console.error("Attack simulation failed:", err);
      setError("Failed to execute attack. Check backend connection.");
    } finally {
      setIsAttacking(false);
    }
  };

  const getTraceIcon = (step: DecisionTraceStep) => {
    if (step.status === 'FAIL') return <XCircle size={16} color="var(--color-danger)" />;
    if (step.status === 'DETECT') return <AlertTriangle size={16} color="#ebcb8b" />;
    return <CheckCircle size={16} color="#a3be8c" />;
  };

  return (
    <div className="page attack-lab-page">
      <PageHeader 
        title="BOLA Attack Lab" 
        description="Simulate a Broken Object Level Authorization attack against the backend security engine." 
      />

      <div className="attack-lab-content">
        {/* Left Column: Attack Configuration */}
        <div className="lab-panel">
          <div className="lab-panel-header">
            <h2><Shield size={20} /> Attack Scenario</h2>
          </div>
          
          <div className="mode-control">
            <select 
              value={protectionMode} 
              onChange={(e) => setProtectionMode(e.target.value)}
              disabled={isAttacking}
            >
              <option value="ENFORCING">ENFORCING</option>
              <option value="DETECTION_ONLY">DETECTION_ONLY</option>
            </select>
            <div className="mode-desc">
              {protectionMode === 'ENFORCING' 
                ? 'Gateway actively blocks detected threats (403)' 
                : 'Gateway flags threats but allows request (200)'}
            </div>
          </div>

          <div className="request-preview">
            <div className="req-line req-highlight">GET /api/accounts/ACC002</div>
            <div className="req-line">Host: api.ello.local</div>
            <div className="req-line">Authorization: Bearer <span className="req-token">eyJhbGciOiJIUzI1NiIsIn...</span></div>
          </div>

          <div className="visualization-diagram">
            <div className="diagram-node attacker">
              <User size={16} /> Alice (U001)
            </div>
            
            <div className="diagram-arrow">
              <span style={{ fontSize: '0.75rem', marginBottom: '2px' }}>requests</span>
              <div className="arrow-line"></div>
            </div>

            <div className="diagram-node target">
              <FileText size={16} /> Resource: ACC002
            </div>

            <div className="diagram-arrow">
              <span style={{ fontSize: '0.75rem', marginBottom: '2px' }}>owned by</span>
              <div className="arrow-line"></div>
            </div>

            <div className="diagram-node owner">
              <User size={16} /> Bob (U002)
            </div>

            <div className="diagram-violation">
              <AlertTriangle size={16} />
              OWNERSHIP MISMATCH
            </div>
          </div>

          {error && (
            <div className="error-message" style={{ marginTop: '1rem', backgroundColor: 'rgba(191,97,106,0.1)', color: 'var(--color-danger)', padding: '1rem', borderRadius: '4px' }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="attack-controls">
            <button 
              className="btn btn-primary icon-btn" 
              style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
              onClick={handleAttack}
              disabled={isAttacking}
            >
              <Play size={20} />
              <span>{isAttacking ? 'Simulating Attack...' : 'Launch BOLA Attack'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Execution Results */}
        <div className="lab-panel">
          <div className="lab-panel-header">
            <h2><Server size={20} /> Execution Results</h2>
          </div>

          {!attackResult && !isAttacking && (
            <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '3rem 1rem' }}>
              Launch the attack to observe the gateway's real-time security decision.
            </div>
          )}

          {isAttacking && (
            <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '3rem 1rem' }}>
              Awaiting gateway evaluation...
            </div>
          )}

          {attackResult && (
            <div className="result-panel">
              <div className={`result-header ${attackResult.action.toLowerCase()}`}>
                <div className="result-status-code">{attackResult.status_code}</div>
                <div className="result-action">
                  {attackResult.action === 'BLOCK' ? 'BLOCKED' : 
                   attackResult.action === 'DETECT' ? 'DETECTED' : 'ALLOWED'}
                </div>
              </div>

              <div className="result-meta">
                <div className="meta-item">
                  <div className="meta-label">Action Taken</div>
                  <div className="meta-value">{attackResult.action}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Threat Classification</div>
                  <div className="meta-value">{attackResult.threat_type || 'NONE'}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Severity</div>
                  <div className="meta-value">{attackResult.severity || 'N/A'}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Risk Score</div>
                  <div className="meta-value">{attackResult.risk_score || 0}/100</div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)', margin: '1rem 0 0.5rem 0', textTransform: 'uppercase' }}>
                  Decision Trace
                </h3>
                <div className="trace-container">
                  {attackResult.decision_trace.map((step, idx) => (
                    <div key={idx} className="trace-step">
                      <div className="trace-icon">
                        {getTraceIcon(step)}
                      </div>
                      <div className="trace-content">
                        <div className="trace-message">{step.step}</div>
                        {step.detail && <div className="trace-detail">{step.detail}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sweep section takes full width below */}
      <div className="attack-lab-content" style={{ display: 'block' }}>
        <AttackSweep />
      </div>
    </div>
  );
};

export default AttackLab;
