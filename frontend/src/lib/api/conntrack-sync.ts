import { apiClient } from "./client";

export interface ConntrackSyncInterface {
  name: string;
  peer?: string | null;
  port?: number | null;
}

export interface ConntrackSyncFailoverMechanism {
  vrrp?: {
    sync_group?: string | null;
  } | null;
}

export interface ConntrackSyncConfig {
  accept_protocols: string[];
  disable_external_cache: boolean;
  disable_syslog: boolean;
  event_listen_queue_size?: number | null;
  expect_sync: string[];
  failover_mechanism?: ConntrackSyncFailoverMechanism | null;
  ignore_addresses: string[];
  interfaces: ConntrackSyncInterface[];
  listen_addresses: string[];
  mcast_group?: string | null;
  startup_resync: boolean;
  sync_queue_size?: number | null;
}

export interface ConntrackSyncCapabilities {
  version: string;
  features: Record<string, unknown>;
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

class ConntrackSyncService {
  async getCapabilities(): Promise<ConntrackSyncCapabilities> {
    return apiClient.get<ConntrackSyncCapabilities>("/vyos/conntrack-sync/capabilities");
  }

  async getConfig(refresh = false): Promise<ConntrackSyncConfig> {
    return apiClient.get<ConntrackSyncConfig>("/vyos/conntrack-sync/config", {
      refresh: refresh.toString(),
    });
  }

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/conntrack-sync/batch", {
      operations,
    });
    if (!result.success) throw new Error(result.error || "Operation failed");
    return result;
  }

  async saveConfig(original: ConntrackSyncConfig, updated: ConntrackSyncConfig): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];

    // accept_protocols — diff arrays
    const addedProtocols = updated.accept_protocols.filter((p) => !original.accept_protocols.includes(p));
    const removedProtocols = original.accept_protocols.filter((p) => !updated.accept_protocols.includes(p));
    for (const p of addedProtocols) ops.push({ op: "set_accept_protocol", value: p });
    for (const p of removedProtocols) ops.push({ op: "delete_accept_protocol", value: p });

    // expect_sync — diff arrays
    const addedExpect = updated.expect_sync.filter((p) => !original.expect_sync.includes(p));
    const removedExpect = original.expect_sync.filter((p) => !updated.expect_sync.includes(p));
    for (const p of addedExpect) ops.push({ op: "set_expect_sync", value: p });
    for (const p of removedExpect) ops.push({ op: "delete_expect_sync", value: p });

    // failover_mechanism.vrrp.sync_group
    const origGroup = original.failover_mechanism?.vrrp?.sync_group ?? null;
    const updGroup = updated.failover_mechanism?.vrrp?.sync_group ?? null;
    if (origGroup !== updGroup) {
      if (updGroup) {
        ops.push({ op: "set_failover_vrrp_sync_group", value: updGroup });
      } else {
        ops.push({ op: "delete_failover_mechanism" });
      }
    }

    // presence flags
    if (original.disable_external_cache !== updated.disable_external_cache) {
      ops.push({ op: updated.disable_external_cache ? "set_disable_external_cache" : "delete_disable_external_cache" });
    }
    if (original.disable_syslog !== updated.disable_syslog) {
      ops.push({ op: updated.disable_syslog ? "set_disable_syslog" : "delete_disable_syslog" });
    }
    if (original.startup_resync !== updated.startup_resync) {
      ops.push({ op: updated.startup_resync ? "set_startup_resync" : "delete_startup_resync" });
    }

    // queue sizes
    const origELQS = original.event_listen_queue_size ?? null;
    const updELQS = updated.event_listen_queue_size ?? null;
    if (origELQS !== updELQS) {
      if (updELQS !== null) {
        ops.push({ op: "set_event_listen_queue_size", value: String(updELQS) });
      } else {
        ops.push({ op: "delete_event_listen_queue_size" });
      }
    }

    const origSQS = original.sync_queue_size ?? null;
    const updSQS = updated.sync_queue_size ?? null;
    if (origSQS !== updSQS) {
      if (updSQS !== null) {
        ops.push({ op: "set_sync_queue_size", value: String(updSQS) });
      } else {
        ops.push({ op: "delete_sync_queue_size" });
      }
    }

    // mcast_group
    const origMcast = original.mcast_group ?? null;
    const updMcast = updated.mcast_group ?? null;
    if (origMcast !== updMcast) {
      if (updMcast) {
        ops.push({ op: "set_mcast_group", value: updMcast });
      } else {
        ops.push({ op: "delete_mcast_group" });
      }
    }

    // listen_addresses — diff arrays
    const addedListen = updated.listen_addresses.filter((a) => !original.listen_addresses.includes(a));
    const removedListen = original.listen_addresses.filter((a) => !updated.listen_addresses.includes(a));
    for (const a of addedListen) ops.push({ op: "set_listen_address", value: a });
    for (const a of removedListen) ops.push({ op: "delete_listen_address", value: a });

    // ignore_addresses — diff arrays
    const addedIgnore = updated.ignore_addresses.filter((a) => !original.ignore_addresses.includes(a));
    const removedIgnore = original.ignore_addresses.filter((a) => !updated.ignore_addresses.includes(a));
    for (const a of addedIgnore) ops.push({ op: "set_ignore_address", value: a });
    for (const a of removedIgnore) ops.push({ op: "delete_ignore_address", value: a });

    // interfaces — by name
    const origIfaceMap = new Map(original.interfaces.map((i) => [i.name, i]));
    const updIfaceMap = new Map(updated.interfaces.map((i) => [i.name, i]));

    // removed interfaces
    for (const [name] of origIfaceMap) {
      if (!updIfaceMap.has(name)) {
        ops.push({ op: "delete_interface", value: name });
      }
    }

    // added or changed interfaces
    for (const [name, updIface] of updIfaceMap) {
      const origIface = origIfaceMap.get(name);
      if (!origIface) {
        // new interface
        ops.push({ op: "set_interface", value: name });
        if (updIface.peer) ops.push({ op: "set_interface_peer", value: `${name},${updIface.peer}` });
        if (updIface.port != null) ops.push({ op: "set_interface_port", value: `${name},${updIface.port}` });
      } else {
        // existing — check peer
        const origPeer = origIface.peer ?? null;
        const updPeer = updIface.peer ?? null;
        if (origPeer !== updPeer) {
          if (updPeer) {
            ops.push({ op: "set_interface_peer", value: `${name},${updPeer}` });
          } else {
            ops.push({ op: "delete_interface_peer", value: name });
          }
        }
        // check port
        const origPort = origIface.port ?? null;
        const updPort = updIface.port ?? null;
        if (origPort !== updPort) {
          if (updPort != null) {
            ops.push({ op: "set_interface_port", value: `${name},${updPort}` });
          } else {
            ops.push({ op: "delete_interface_port", value: name });
          }
        }
      }
    }

    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deleteConntrackSync(): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_conntrack_sync" }]);
  }
}

export const conntrackSyncService = new ConntrackSyncService();
