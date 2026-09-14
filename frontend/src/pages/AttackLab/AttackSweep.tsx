import React, { useState } from 'react';
import { Play, AlertTriangle } from 'lucide-react';
import { api } from '../../api/services';
import type { SimulatorBolaResponse } from '../../types/security';

interface SweepTarget {
  resource: string;
  ownerName: string;
  ownerId: string;
  expectedStatus: number;
}

const SWEEP_TARGETS: SweepTarget[] = [
  { resource: 'ACC001', ownerName: 'Alice', ownerId: 'U001', expectedStatus: 200 },
  { resource: 'ACC002', ownerName: 'Bob', ownerId: 'U002', expectedStatus: 403 },
  { resource: 'ACC003', ownerName: 'Admin', ownerId: 'U003', expectedStatus: 403 }
];

export const AttackSweep: React.FC = () => {
  const [isSweeping, setIsSweeping] = useState(false);
  const [results, setResults] = useState<Record<string, SimulatorBolaResponse>>({});
  const [error, setError] = useState<string | null>(null);

  const runSweep = async () => {
    setIsSweeping(true);
    setResults({});
    setError(null);
    
    try {
      // Run sequentially to clearly show progress and avoid rate limiting/race conditions
      const newResults: Record<string, SimulatorBolaResponse> = {};
      
      for (const target of SWEEP_TARGETS) {
        const res = await api.runBolaSimulation({
          attacker_user_id: 'U001',
          target_resource_id: target.resource,
          protection_mode: 'ENFORCING'
        });
        
        newResults[target.resource] = res;
        setResults({ ...newResults }); // Force re-render with partial results
        
        // Small delay for visual effect
        await new Promise(r => setTimeout(r, 400));
      }
      
    } catch (err) {
      console.error("Sweep failed:", err);
      setError("Failed to execute BOLA Sweep. Check backend connection.");
    } finally {
      setIsSweeping(false);
    }
  };

  return (
    <div className="lab-panel">
      <div className="lab-panel-header">
        <h2>BOLA Ownership Sweep</h2>
        <button 
          className="btn btn-primary icon-btn" 
          onClick={runSweep}
          disabled={isSweeping}
        >
          <Play size={16} />
          <span>{isSweeping ? 'Sweeping...' : 'Run Sweep'}</span>
        </button>
      </div>
      
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
        Systematically tests Alice's token against multiple resources to verify strict ownership validation.
      </p>

      {error && (
        <div className="error-message">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <table className="sweep-table">
        <thead>
          <tr>
            <th>Target Resource</th>
            <th>Resource Owner</th>
            <th>Result</th>
            <th>Status Code</th>
          </tr>
        </thead>
        <tbody>
          {SWEEP_TARGETS.map(target => {
            const res = results[target.resource];
            
            return (
              <tr key={target.resource}>
                <td>{target.resource}</td>
                <td>{target.ownerName} ({target.ownerId})</td>
                <td>
                  {!res && isSweeping && <span>Testing...</span>}
                  {!res && !isSweeping && <span style={{ color: 'var(--color-text-muted)' }}>-</span>}
                  {res && (
                    <span className={`sweep-status ${res.action === 'ALLOW' ? 'pass' : 'fail'}`}>
                      {res.action}
                    </span>
                  )}
                </td>
                <td>
                  {res ? (
                    <span style={{ color: res.status_code === 200 ? '#a3be8c' : 'var(--color-danger)', fontWeight: 'bold' }}>
                      {res.status_code}
                    </span>
                  ) : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
