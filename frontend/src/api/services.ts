import { fetchJson } from "./client";
import type { SecurityEvent } from "../types/events";
import type { 
  DashboardResponse, 
  SimulatorBolaRequest, 
  SimulatorBolaResponse,
  PoliciesResponse,
  AnalyticsResponse,
  EventListResponse,
  TrafficFilters
} from "../types/security";

export const api = {
  // Dashboard
  getDashboard: () => fetchJson<DashboardResponse>("/api/dashboard"),
  
  // Events
  getEvents: async (limit: number = 50): Promise<SecurityEvent[]> => {
    const response = await fetchJson<EventListResponse>(`/api/events?limit=${limit}`);
    return (response.items as SecurityEvent[]) || [];
  },
  getEvent: (eventId: string) => fetchJson<SecurityEvent>(`/api/events/${eventId}`),
  
  // Simulator
  runBolaSimulation: (req: SimulatorBolaRequest) => 
    fetchJson<SimulatorBolaResponse>("/api/simulator/bola", {
      method: "POST",
      body: JSON.stringify(req)
    }),
    
  // Policies
  getPolicies: () => fetchJson<PoliciesResponse>("/api/policies"),
  
  // Traffic
  getTraffic: (page: number = 1, pageSize: number = 20, filters?: TrafficFilters) => {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    
    if (filters) {
      if (filters.method) params.append("method", filters.method);
      if (filters.status_code) params.append("status_code", filters.status_code.toString());
      if (filters.action) params.append("action", filters.action);
      if (filters.threat_type) params.append("threat_type", filters.threat_type);
      if (filters.user_id) params.append("user_id", filters.user_id);
      if (filters.path) params.append("path", filters.path);
    }
    
    return fetchJson<EventListResponse>(`/api/traffic?${params.toString()}`);
  },

  // Analytics
  getAnalytics: () => fetchJson<AnalyticsResponse>("/api/analytics"),

  // Health
  getHealth: () => fetchJson<{status: string}>("/health"),
};
