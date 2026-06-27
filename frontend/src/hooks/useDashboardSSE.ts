"use client";

import { useEffect, useRef, useState } from "react";
import { InterfaceCounter } from "@/lib/api/show";
import { QoSStatsResponse } from "@/lib/api/qos";
import { OpenVpnStatus } from "@/lib/api/openvpn";
import { IPSecStatus } from "@/lib/api/ipsec";

// ============================================================================
// Types
// ============================================================================

export type SSEStatus = "disconnected" | "connecting" | "connected" | "error";

export interface InterfaceCountersData {
  interfaces: InterfaceCounter[];
  total: number;
}

export interface SystemMemoryData {
  total: string | null;
  free: string | null;
  used: string | null;
}

export interface SystemVersionData {
  version?: string | null;
  release_train?: string | null;
  release_flavor?: string | null;
  built_by?: string | null;
  built_on?: string | null;
  build_uuid?: string | null;
  build_commit_id?: string | null;
  architecture?: string | null;
  boot_via?: string | null;
  system_type?: string | null;
  secure_boot?: string | null;
  hardware_vendor?: string | null;
  hardware_model?: string | null;
  hardware_s_n?: string | null;
  [key: string]: string | null | undefined;
}

export interface DiskPartition {
  filesystem: string;
  size: string;
  used: string;
  available: string;
  use_percent: string;
  mounted_on?: string;
}

export interface LoadData {
  uptime: string | null;
  load_1min: number | null;
  load_5min: number | null;
  load_15min: number | null;
}

export interface SystemInfoData {
  memory: SystemMemoryData;
  version: SystemVersionData;
  disk: DiskPartition[];
  load: LoadData | null;
}

export interface WireGuardPeerData {
  name: string;
  public_key: string | null;
  allowed_ips: string[];
  endpoint: string | null;
  latest_handshake: string | null;
  latest_handshake_seconds: number | null;
  transfer_rx: string | null;
  transfer_tx: string | null;
  status: "connected" | "idle" | "never";
}

export interface WireGuardInterfaceData {
  name: string;
  description: string | null;
  addresses: string[];
  port: string | null;
  disabled: boolean;
  peers: WireGuardPeerData[];
}

export interface WireGuardPeersData {
  interfaces: WireGuardInterfaceData[];
  total: number;
}

export interface VrrpGroupData {
  name: string;
  interface: string | null;
  vrid: number | null;
  state: string | null;          // "MASTER" | "BACKUP" | "FAULT"
  priority: number | null;
  last_transition: string | null;
}

export interface VrrpStatusData {
  groups: VrrpGroupData[];
  total: number;
}

export interface BgpPeerData {
  neighbor: string;
  remote_as: number | null;
  state: string | null;          // "Established" | "Active" | "Connect" | "Idle" | ...
  established: boolean;
  uptime: string | null;
  msg_rcvd: number | null;
  msg_sent: number | null;
  pfx_rcd: number | null;
  pfx_snt: number | null;
}

export interface BgpAddressFamilyData {
  afi: string;                   // raw key, e.g. "ipv4_unicast"
  label: string;                 // display label, e.g. "IPv4 Unicast"
  router_id: string | null;
  local_as: number | null;
  vrf_name: string | null;
  rib_count: number | null;
  peers: BgpPeerData[];
}

export interface BgpStatusData {
  address_families: BgpAddressFamilyData[];
  total_peers: number;
  established_peers: number;
}

export interface DashboardSSEData {
  interfaceCounters: InterfaceCountersData | null;
  systemInfo: SystemInfoData | null;
  wireguardPeers: WireGuardPeersData | null;
  qosStats: QoSStatsResponse | null;
  openvpnStatus: OpenVpnStatus | null;
  vrrpStatus: VrrpStatusData | null;
  bgpStatus: BgpStatusData | null;
  ipsecStatus: IPSecStatus | null;
}

export interface DashboardSSEState {
  status: SSEStatus;
  data: DashboardSSEData;
  error: string | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useDashboardSSE(): DashboardSSEState {
  const [status, setStatus] = useState<SSEStatus>("disconnected");
  const [data, setData] = useState<DashboardSSEData>({ interfaceCounters: null, systemInfo: null, wireguardPeers: null, qosStats: null, openvpnStatus: null, vrrpStatus: null, bgpStatus: null, ipsecStatus: null });
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset status while (re)subscribing to the stream
    setStatus("connecting");

    const es = new EventSource("/api/vyos/show/stream");
    esRef.current = es;

    es.addEventListener("connected", () => {
      setStatus("connected");
      setError(null);
    });

    es.addEventListener("interface-counters", (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as InterfaceCountersData;
        setData((prev) => ({ ...prev, interfaceCounters: payload }));
      } catch {
        // Ignore malformed payloads
      }
    });

    es.addEventListener("system-info", (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as SystemInfoData;
        setData((prev) => ({ ...prev, systemInfo: payload }));
      } catch {
        // Ignore malformed payloads
      }
    });

    es.addEventListener("wireguard-peers", (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as WireGuardPeersData;
        setData((prev) => ({ ...prev, wireguardPeers: payload }));
      } catch {
        // Ignore malformed payloads
      }
    });

    es.addEventListener("qos-stats", (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as QoSStatsResponse;
        setData((prev) => ({ ...prev, qosStats: payload }));
      } catch {
        // Ignore malformed payloads
      }
    });

    es.addEventListener("openvpn-status", (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as OpenVpnStatus;
        setData((prev) => ({ ...prev, openvpnStatus: payload }));
      } catch {
        // Ignore malformed payloads
      }
    });

    es.addEventListener("vrrp-status", (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as VrrpStatusData;
        setData((prev) => ({ ...prev, vrrpStatus: payload }));
      } catch {
        // Ignore malformed payloads
      }
    });

    es.addEventListener("bgp-status", (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as BgpStatusData;
        setData((prev) => ({ ...prev, bgpStatus: payload }));
      } catch {
        // Ignore malformed payloads
      }
    });

    es.addEventListener("ipsec-status", (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as IPSecStatus;
        setData((prev) => ({ ...prev, ipsecStatus: payload }));
      } catch {
        // Ignore malformed payloads
      }
    });

    es.addEventListener("error", (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { channel: string; message: string };
        setError(`${payload.channel}: ${payload.message}`);
      } catch {
        // Ignore malformed payloads
      }
    });

    es.onerror = () => {
      // EventSource auto-reconnects; update status to show it's recovering
      setStatus("error");
    };

    return () => {
      es.close();
      esRef.current = null;
      setStatus("disconnected");
    };
  }, []);

  return { status, data, error };
}
