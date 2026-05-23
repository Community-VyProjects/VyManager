import { apiClient } from "./client";

export interface EventFilter {
  pattern?: string | null;
  syslog_identifier?: string | null;
}

export interface EventEnvironmentVar {
  name: string;
  value?: string | null;
}

export interface EventScript {
  path?: string | null;
  arguments?: string | null;
  environment: EventEnvironmentVar[];
}

export interface EventHandlerEntry {
  name: string;
  filter: EventFilter;
  script: EventScript;
}

export interface EventHandlerConfig {
  events: EventHandlerEntry[];
}

export interface EventHandlerCapabilities {
  version: string;
  features: {
    filter_pattern: { supported: boolean; description: string };
    filter_syslog_identifier: { supported: boolean; description: string };
    script_path: { supported: boolean; description: string };
    script_arguments: { supported: boolean; description: string };
    script_environment: { supported: boolean; description: string };
  };
  version_info: { is_1_4: boolean; is_1_5: boolean };
}

export interface BatchOperation {
  op: string;
  value?: string | null;
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

export interface SaveEventFields {
  filter: EventFilter;
  script: EventScript;
}

class EventHandlerService {
  async getCapabilities(): Promise<EventHandlerCapabilities> {
    return apiClient.get<EventHandlerCapabilities>("/vyos/event-handler/capabilities");
  }

  async getConfig(refresh = false): Promise<EventHandlerConfig> {
    return apiClient.get<EventHandlerConfig>("/vyos/event-handler/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/event-handler/batch", {
      operations,
    });
    if (!result.success) {
      throw new Error(result.error || "Operation failed");
    }
    return result;
  }

  async saveEvent(name: string, fields: SaveEventFields): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [{ op: "delete_event", value: name }];

    if (fields.filter.pattern) {
      ops.push({ op: "set_event_filter_pattern", value: `${name},${fields.filter.pattern}` });
    }
    if (fields.filter.syslog_identifier) {
      ops.push({ op: "set_event_filter_syslog_identifier", value: `${name},${fields.filter.syslog_identifier}` });
    }
    if (fields.script.path) {
      ops.push({ op: "set_event_script_path", value: `${name},${fields.script.path}` });
    }
    if (fields.script.arguments) {
      ops.push({ op: "set_event_script_arguments", value: `${name},${fields.script.arguments}` });
    }
    for (const envVar of fields.script.environment) {
      if (envVar.name && envVar.value != null) {
        ops.push({ op: "set_event_script_environment_value", value: `${name},${envVar.name},${envVar.value}` });
      }
    }

    return this.batch(ops);
  }

  async deleteEvent(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_event", value: name }]);
  }
}

export const eventHandlerService = new EventHandlerService();
