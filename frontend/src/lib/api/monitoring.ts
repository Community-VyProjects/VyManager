import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces - System Metrics
// ============================================================================

export interface CPUMetrics {
  usage_percent: number;
  load_average: number[];
}

export interface MemoryMetrics {
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  available_bytes: number;
  usage_percent: number;
  buffers_bytes: number;
  cached_bytes: number;
}

export interface DiskMetrics {
  filesystem: string;
  mount_point: string;
  total_bytes: number;
  used_bytes: number;
  available_bytes: number;
  usage_percent: number;
}

export interface SystemMetrics {
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics[];
  uptime: string;
  timestamp: string;
}

// ============================================================================
// TypeScript Interfaces - Interface Traffic
// ============================================================================

export interface InterfaceTraffic {
  name: string;
  rx_bytes: number;
  tx_bytes: number;
  rx_packets: number;
  tx_packets: number;
  rx_errors: number;
  tx_errors: number;
  rx_dropped: number;
  tx_dropped: number;
  rx_rate: number | null;
  tx_rate: number | null;
}

export interface InterfaceTrafficResponse {
  interfaces: InterfaceTraffic[];
  total: number;
  timestamp: string;
}

// ============================================================================
// TypeScript Interfaces - Conntrack
// ============================================================================

export interface Connection {
  protocol: string;
  state: string | null;
  src_ip: string;
  src_port: number | null;
  dst_ip: string;
  dst_port: number | null;
  packets: number;
  bytes: number;
  timeout: number | null;
}

export interface ConntrackResponse {
  connections: Connection[];
  total: number;
  limit: number;
  offset: number;
}

export interface ConntrackSummary {
  total_connections: number;
  by_protocol: Record<string, number>;
  by_state: Record<string, number>;
  timestamp: string;
}

export interface TopTalker {
  key: string;
  connections: number;
  bytes: number;
  packets: number;
}

export interface TopTalkersResponse {
  by_source_ip: TopTalker[];
  by_destination_ip: TopTalker[];
  by_destination_port: TopTalker[];
  by_bytes_source: TopTalker[];
  by_bytes_destination: TopTalker[];
  total_connections: number;
  total_bytes: number;
  timestamp: string;
}

// ============================================================================
// TypeScript Interfaces - Alerts
// ============================================================================

export type AlertType =
  | "INTERFACE_DOWN"
  | "HIGH_CPU"
  | "HIGH_MEMORY"
  | "HIGH_DISK"
  | "CONNECTION_THRESHOLD"
  | "INTERFACE_ERRORS"
  | "BGP_NEIGHBOR_DOWN"
  | "IPSEC_TUNNEL_DOWN"
  | "OPENVPN_TUNNEL_DOWN"
  | "WIREGUARD_PEER_DOWN"
  | "VRRP_STATE_CHANGE"
  | "VRRP_FAILOVER";

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface AlertRule {
  id: string;
  instanceId: string;
  name: string;
  description: string | null;
  type: AlertType;
  severity: AlertSeverity;
  enabled: boolean;
  conditions: Record<string, unknown>;
  notifyInApp: boolean;
  webhookUrl: string | null;
  telegramChatId: string | null;
  telegramBotToken: string | null;
  hasTelegram: boolean;
  cooldownSeconds: number;
  lastTriggeredAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertRulesResponse {
  rules: AlertRule[];
  total: number;
}

export interface CreateAlertRuleRequest {
  name: string;
  description?: string;
  type: AlertType;
  severity?: AlertSeverity;
  conditions: Record<string, unknown>;
  notifyInApp?: boolean;
  webhookUrl?: string;
  telegramChatId?: string;
  telegramBotToken?: string;
}

export interface UpdateAlertRuleRequest {
  name?: string;
  description?: string;
  severity?: AlertSeverity;
  enabled?: boolean;
  conditions?: Record<string, unknown>;
  notifyInApp?: boolean;
  webhookUrl?: string;
  telegramChatId?: string;
  telegramBotToken?: string;
  cooldownSeconds?: number;
}

export interface TestNotificationRequest {
  webhook_url?: string;
  telegram_chat_id?: string;
  telegram_bot_token?: string;
}

export interface TestNotificationResponse {
  success: boolean;
  message: string;
}

export interface AlertHistory {
  id: string;
  ruleId: string;
  ruleName?: string;
  instanceId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  details: Record<string, unknown> | null;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolved: boolean;
  resolvedAt: string | null;
  triggeredAt: string;
}

export interface AlertHistoryResponse {
  alerts: AlertHistory[];
  total: number;
  unacknowledgedCount: number;
}

export interface ActiveAlertsResponse {
  count: number;
  criticalCount: number;
  warningCount: number;
}

// ============================================================================
// TypeScript Interfaces - Metrics History
// ============================================================================

export type MetricType = "CPU" | "MEMORY" | "DISK" | "INTERFACE_RX" | "INTERFACE_TX" | "CONNTRACK";

export interface MetricDataPoint {
  timestamp: string;
  value: number;
  name?: string;
}

export interface MetricsSeries {
  type: MetricType;
  name?: string;
  data: MetricDataPoint[];
}

export interface MetricsHistoryResponse {
  series: MetricsSeries[];
  start_time: string;
  end_time: string;
  interval_seconds: number;
}

export interface MetricsSummary {
  type: MetricType;
  name?: string;
  min_value: number;
  max_value: number;
  avg_value: number;
  current_value?: number;
  data_points: number;
}

export interface MetricsSummaryResponse {
  summaries: MetricsSummary[];
  period_hours: number;
}

// ============================================================================
// API Service
// ============================================================================

class MonitoringService {
  // -------------------------------------------------------------------------
  // System Metrics
  // -------------------------------------------------------------------------

  /**
   * Get comprehensive system metrics (CPU, memory, disk, uptime)
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    return apiClient.get<SystemMetrics>("/monitoring/metrics/system");
  }

  /**
   * Get CPU metrics only
   */
  async getCPUMetrics(): Promise<CPUMetrics> {
    return apiClient.get<CPUMetrics>("/monitoring/metrics/cpu");
  }

  /**
   * Get memory metrics only
   */
  async getMemoryMetrics(): Promise<MemoryMetrics> {
    return apiClient.get<MemoryMetrics>("/monitoring/metrics/memory");
  }

  /**
   * Get disk metrics only
   */
  async getDiskMetrics(): Promise<DiskMetrics[]> {
    return apiClient.get<DiskMetrics[]>("/monitoring/metrics/disk");
  }

  // -------------------------------------------------------------------------
  // Interface Traffic
  // -------------------------------------------------------------------------

  /**
   * Get interface traffic statistics with rate calculation
   */
  async getInterfaceTraffic(): Promise<InterfaceTrafficResponse> {
    return apiClient.get<InterfaceTrafficResponse>("/monitoring/interfaces/traffic");
  }

  /**
   * Get traffic for a single interface
   */
  async getSingleInterfaceTraffic(interfaceName: string): Promise<InterfaceTraffic> {
    return apiClient.get<InterfaceTraffic>(`/monitoring/interfaces/traffic/${interfaceName}`);
  }

  /**
   * Clear the rate calculation cache
   */
  async clearTrafficCache(): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>("/monitoring/interfaces/traffic/cache");
  }

  // -------------------------------------------------------------------------
  // Connection Tracking
  // -------------------------------------------------------------------------

  /**
   * Get conntrack table with pagination and filtering
   */
  async getConntrackTable(params?: {
    limit?: number;
    offset?: number;
    protocol?: string;
    state?: string;
  }): Promise<ConntrackResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());
    if (params?.protocol) searchParams.set("protocol", params.protocol);
    if (params?.state) searchParams.set("state", params.state);

    const query = searchParams.toString();
    return apiClient.get<ConntrackResponse>(`/monitoring/conntrack${query ? `?${query}` : ""}`);
  }

  /**
   * Get conntrack summary statistics
   */
  async getConntrackSummary(): Promise<ConntrackSummary> {
    return apiClient.get<ConntrackSummary>("/monitoring/conntrack/summary");
  }

  /**
   * Get top talkers analysis from connection tracking
   */
  async getTopTalkers(limit: number = 10): Promise<TopTalkersResponse> {
    return apiClient.get<TopTalkersResponse>(`/monitoring/conntrack/top-talkers?limit=${limit}`);
  }

  // -------------------------------------------------------------------------
  // Alert Rules
  // -------------------------------------------------------------------------

  /**
   * Get all alert rules
   */
  async getAlertRules(): Promise<AlertRulesResponse> {
    return apiClient.get<AlertRulesResponse>("/monitoring/alerts/rules");
  }

  /**
   * Create a new alert rule
   */
  async createAlertRule(data: CreateAlertRuleRequest): Promise<AlertRule> {
    return apiClient.post<AlertRule>("/monitoring/alerts/rules", data);
  }

  /**
   * Update an alert rule
   */
  async updateAlertRule(ruleId: string, data: UpdateAlertRuleRequest): Promise<AlertRule> {
    return apiClient.put<AlertRule>(`/monitoring/alerts/rules/${ruleId}`, data);
  }

  /**
   * Delete an alert rule
   */
  async deleteAlertRule(ruleId: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/monitoring/alerts/rules/${ruleId}`);
  }

  // -------------------------------------------------------------------------
  // Alert History
  // -------------------------------------------------------------------------

  /**
   * Get alert history with optional filtering
   */
  async getAlertHistory(params?: {
    limit?: number;
    offset?: number;
    acknowledged?: boolean;
    severity?: AlertSeverity;
  }): Promise<AlertHistoryResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());
    if (params?.acknowledged !== undefined) searchParams.set("acknowledged", params.acknowledged.toString());
    if (params?.severity) searchParams.set("severity", params.severity);

    const query = searchParams.toString();
    return apiClient.get<AlertHistoryResponse>(`/monitoring/alerts/history${query ? `?${query}` : ""}`);
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(`/monitoring/alerts/history/${alertId}/acknowledge`, {});
  }

  /**
   * Get count of active (unacknowledged) alerts
   */
  async getActiveAlerts(): Promise<ActiveAlertsResponse> {
    return apiClient.get<ActiveAlertsResponse>("/monitoring/alerts/active");
  }

  /**
   * Test notification delivery (webhook or Telegram)
   */
  async testNotification(data: TestNotificationRequest): Promise<TestNotificationResponse> {
    return apiClient.post<TestNotificationResponse>("/monitoring/alerts/test-notification", data);
  }

  // -------------------------------------------------------------------------
  // Metrics History
  // -------------------------------------------------------------------------

  /**
   * Get historical metrics data for graphing
   */
  async getMetricsHistory(params: {
    metric_type: MetricType;
    name?: string;
    hours?: number;
    interval?: number;
  }): Promise<MetricsHistoryResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set("metric_type", params.metric_type);
    if (params.name) searchParams.set("name", params.name);
    if (params.hours) searchParams.set("hours", params.hours.toString());
    if (params.interval) searchParams.set("interval", params.interval.toString());

    return apiClient.get<MetricsHistoryResponse>(`/monitoring/history?${searchParams.toString()}`);
  }

  /**
   * Get summary statistics for all metrics
   */
  async getMetricsSummary(hours: number = 24): Promise<MetricsSummaryResponse> {
    return apiClient.get<MetricsSummaryResponse>(`/monitoring/history/summary?hours=${hours}`);
  }

  /**
   * Get list of interfaces with historical data
   */
  async getHistoricalInterfaces(): Promise<{ interfaces: string[] }> {
    return apiClient.get<{ interfaces: string[] }>("/monitoring/history/interfaces");
  }
}

export const monitoringService = new MonitoringService();
