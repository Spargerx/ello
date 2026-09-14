export type ProtectionMode = "ENFORCING" | "DETECTION_ONLY";

export type Action = "ALLOW" | "BLOCK" | "DETECT";

export type ThreatType =
  | "BOLA"
  | "RATE_LIMIT"
  | "SQL_INJECTION"
  | "COMMAND_INJECTION"
  | "OTHER";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}
