import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface LogEntry {
  timestamp: string | null;
  facility: string | null;
  severity: string | null;
  hostname: string | null;
  process: string | null;
  message: string;
  raw: string;
}

export interface LogsResponse {
  entries: LogEntry[];
  total: number;
  has_more: boolean;
}

export interface GetLogsParams {
  lines?: number;
  filter_text?: string;
  process?: string;
}

export interface SearchLogsParams {
  query: string;
  lines?: number;
}

// ============================================================================
// Logs Service
// ============================================================================

class LogsService {
  /**
   * Get recent system logs from VyOS
   */
  async getLogs(params: GetLogsParams = {}): Promise<LogsResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params.lines) {
        queryParams.set("lines", params.lines.toString());
      }
      if (params.filter_text) {
        queryParams.set("filter_text", params.filter_text);
      }
      if (params.process) {
        queryParams.set("process", params.process);
      }

      const queryString = queryParams.toString();
      const url = `/vyos/logs${queryString ? `?${queryString}` : ""}`;

      return await apiClient.get<LogsResponse>(url);
    } catch (error: any) {
      const errorMessage =
        error?.details?.detail || error?.message || "Failed to fetch logs";
      throw new Error(errorMessage);
    }
  }

  /**
   * Get boot logs from VyOS
   */
  async getBootLogs(lines: number = 100): Promise<LogsResponse> {
    try {
      return await apiClient.get<LogsResponse>(
        `/vyos/logs/boot?lines=${lines}`
      );
    } catch (error: any) {
      const errorMessage =
        error?.details?.detail || error?.message || "Failed to fetch boot logs";
      throw new Error(errorMessage);
    }
  }

  /**
   * Search through recent logs
   */
  async searchLogs(params: SearchLogsParams): Promise<LogsResponse> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set("query", params.query);

      if (params.lines) {
        queryParams.set("lines", params.lines.toString());
      }

      return await apiClient.get<LogsResponse>(
        `/vyos/logs/search?${queryParams.toString()}`
      );
    } catch (error: any) {
      const errorMessage =
        error?.details?.detail || error?.message || "Failed to search logs";
      throw new Error(errorMessage);
    }
  }

  /**
   * Get list of unique processes that appear in recent logs
   */
  async getLogProcesses(): Promise<string[]> {
    try {
      const response = await apiClient.get<{ processes: string[] }>(
        "/vyos/logs/processes"
      );
      return response.processes;
    } catch (error: any) {
      const errorMessage =
        error?.details?.detail ||
        error?.message ||
        "Failed to fetch log processes";
      throw new Error(errorMessage);
    }
  }
}

export const logsService = new LogsService();
