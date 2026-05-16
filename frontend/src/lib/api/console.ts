import { apiClient, resolveWsBase } from "./client";

export interface ConsoleStatus {
  configured: boolean;
  ssh_port: number;
  ssh_username: string | null;
}

class ConsoleService {
  async getStatus(): Promise<ConsoleStatus> {
    return apiClient.get<ConsoleStatus>("/vyos/console/status");
  }

  createConsoleSocket(): WebSocket {
    return new WebSocket(`${resolveWsBase()}/vyos/console/ws/shell`);
  }
}

export const consoleService = new ConsoleService();
