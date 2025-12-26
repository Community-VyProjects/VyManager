// Common API response types
export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}

export interface BatchOperation {
  op: string;
  value?: unknown;
  value2?: unknown;
}

export interface BatchRequest {
  identifier: string;
  rule_number?: number;
  operations: BatchOperation[];
}