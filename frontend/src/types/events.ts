import type { Action, ThreatType, Severity } from "./api";

export interface DecisionTraceStep {
  step: string;
  status: "PASS" | "FAIL" | "DETECT" | "ERROR" | "SKIP" | "BLOCK" | "ALLOW";
  detail: string;
}

export interface SecurityEvent {
  event_id: string;
  request_id: string;
  timestamp: string;
  source_ip: string;
  user_id?: string;
  username?: string;
  role?: string;
  method: string;
  path: string;
  resource_id?: string;
  resource_owner?: string;
  threat_type?: ThreatType;
  severity?: Severity;
  risk_score?: number;
  action: Action;
  status_code: number;
  reason?: string;
  details?: Record<string, any>;
  decision_trace?: DecisionTraceStep[];
}
