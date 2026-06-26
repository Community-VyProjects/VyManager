import { apiClient } from "./client";

export interface BugReportStatus {
  enabled: boolean;
  connected: boolean;
  repo?: string | null;
}

export interface DeviceStart {
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export type DevicePollStatus = "pending" | "connected" | "expired" | "denied" | "error";

export interface DevicePoll {
  status: DevicePollStatus;
}

export interface Diagnostics {
  app_version?: string;
  vyos_version?: string;
  browser?: string;
  page?: string;
}

export interface ReportRequest {
  title: string;
  category: string;
  description: string;
  include_diagnostics: boolean;
  diagnostics?: Diagnostics;
  error_text?: string;
}

export interface ReportPreview {
  title: string;
  body: string;
}

export interface SubmitResult {
  url: string;
  number: number;
}

class BugReportService {
  async getStatus(): Promise<BugReportStatus> {
    return apiClient.get<BugReportStatus>("/vyos/bug-report/status");
  }

  async deviceStart(): Promise<DeviceStart> {
    return apiClient.post<DeviceStart>("/vyos/bug-report/github/device/start");
  }

  async devicePoll(): Promise<DevicePoll> {
    return apiClient.post<DevicePoll>("/vyos/bug-report/github/device/poll");
  }

  async preview(req: ReportRequest): Promise<ReportPreview> {
    return apiClient.post<ReportPreview>("/vyos/bug-report/preview", req);
  }

  async submit(req: ReportRequest): Promise<SubmitResult> {
    return apiClient.post<SubmitResult>("/vyos/bug-report/submit", req);
  }
}

export const bugReportService = new BugReportService();
