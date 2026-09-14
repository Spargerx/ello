import type { ThreatType, Action } from "./api";

export interface DashboardStats {
  total_requests: number;
  blocked_requests: number;
  threat_count: number;
  high_risk_count: number;
  bola_count: number;
  request_rate: number;
}

export interface TimelinePoint {
  time: string;
  count: number;
}

export interface ThreatDistributionItem {
  name: string;
  value: number;
}

export interface EndpointThreatItem {
  path: string;
  threats: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
  timeline: TimelinePoint[];
  threat_distribution: ThreatDistributionItem[];
  endpoint_threats: EndpointThreatItem[];
  recent_events: any[];
}

export interface SimulatorBolaRequest {
  attacker_user_id: string;
  target_resource_id: string;
  protection_mode: string;
}

export interface SimulatorBolaResponse {
  request_id: string;
  success: boolean;
  status_code: number;
  action: Action;
  threat_type?: ThreatType;
  severity?: string;
  risk_score?: number;
  response_data?: any;
  decision_trace: any[];
}

export interface PoliciesResponse {
  protection_mode: string;
  bola: { enabled: boolean };
  ownership_validation: { enabled: boolean };
  rate_limiting: { enabled: boolean; requests: number; window_seconds: number };
  payload_detection: { enabled: boolean };
  audit_logging: { enabled: boolean };
  websocket_telemetry: { enabled: boolean };
}

export interface AnalyticsResponse {
  traffic: {
    total_requests: number;
    allowed_requests: number;
    blocked_requests: number;
    request_rate: number;
  };
  threats: { name: string; count: number }[];
  severity: { name: string; count: number }[];
  top_endpoints: { path: string; threats: number }[];
  top_users: { user_id: string; threats: number }[];
}

export interface EventListResponse {
  items: any[];
  page: number;
  page_size: number;
  total: number;
}

export interface TrafficFilters {
  method?: string;
  status_code?: number;
  action?: string;
  threat_type?: string;
  user_id?: string;
  path?: string;
}
