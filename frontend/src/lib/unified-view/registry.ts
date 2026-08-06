// ─── Contributor guide ────────────────────────────────────────────────────────
//
// Adding a new unified view requires exactly two steps:
//
//   1. Add a data fetcher function (if needed) in the appropriate API service
//   2. Add an entry to UNIFIED_VIEW_REGISTRY below with your configuration
//
// The UnifiedView component renders the UI automatically based on the registry.
// No React components needed for simple cases. For complex custom UI, you can
// provide a custom renderer component in the registry entry.
//
// ─── Full UnifiedViewConfig reference ─────────────────────────────────────────────
//
// {
//   id: string;                    // Unique identifier for this unified view type
//   title: string;                 // Dialog title
//   icon?: LucideIcon;             // Icon to display in the title
//
//   // Optional: Fetch additional data when the unified view opens
//   dataFetcher?: (data: unknown) => Promise<unknown>;
//
//   // Optional: Transform the input data before rendering
//   dataTransformer?: (data: unknown) => unknown;
//
//   // Sections that appear before tabs (e.g., basic info)
//   headerSections?: UnifiedViewSection[];
//
//   // Tabs configuration - if omitted, renders a single view
//   tabs?: UnifiedViewTab[];
//
//   // Sections that appear after tabs (if no tabs, these are the main content)
//   sections?: UnifiedViewSection[];
// }
//
// ─── UnifiedViewTab reference ─────────────────────────────────────────────────────
//
// {
//   id: string;                    // Tab identifier
//   label: string;                  // Tab label
//   icon?: LucideIcon;             // Icon for the tab
//   sections: UnifiedViewSection[];   // Sections in this tab
// }
//
// ─── UnifiedViewSection reference ────────────────────────────────────────────────
//
// {
//   type: 'info' | 'list' | 'custom';
//   title?: string | ((data: unknown) => string);
//   icon?: LucideIcon;
//   description?: string | ((data: unknown) => string);
//
//   // For 'info' type: Display key-value pairs
//   fields?: Array<{
//     label: string;
//     value: string | number | boolean | undefined;
//     format?: 'text' | 'badge' | 'badge-array';
//   }> | ((data: unknown) => Array<{
//     label: string;
//     value: string | number | boolean | undefined;
//     format?: 'text' | 'badge' | 'badge-array';
//   }>);
//
//   // For 'list' type: Display a list of items
//   items?: Array<{
//     id: string;
//     title: string;
//     subtitle?: string;
//     badge?: string | { text: string; variant?: 'default' | 'secondary' | 'destructive' };
//   }> | ((data: unknown) => Array<{
//     id: string;
//     title: string;
//     subtitle?: string;
//     badge?: string | { text: string; variant?: 'default' | 'secondary' | 'destructive' };
//   }>);
//   emptyMessage?: string;
//   emptyIcon?: LucideIcon;
//
//   // For 'custom' type: Provide a custom React component
//   component?: React.ComponentType<{ data: unknown }>;
// }
// ─────────────────────────────────────────────────────────────────────────────

import type { LucideIcon } from "lucide-react";
import { Network, Users, Activity, Shield, Route, Wifi, Database } from "lucide-react";
import { dhcpService, type DHCPLease } from "@/lib/api/dhcp";

export interface UnifiedViewField {
  label: string;
  value: string | number | boolean | undefined;
  format?: "text" | "badge" | "badge-array";
}

export interface UnifiedViewListItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string | { text: string; variant?: "default" | "secondary" | "destructive" };
}

export interface UnifiedViewSection {
  type: "info" | "list" | "custom";
  title?: string | ((data: unknown) => string);
  icon?: LucideIcon;
  description?: string | ((data: unknown) => string);
  fields?: UnifiedViewField[] | ((data: unknown) => UnifiedViewField[]);
  items?: UnifiedViewListItem[] | ((data: unknown) => UnifiedViewListItem[]);
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  component?: React.ComponentType<{ data: unknown }>;
}

export interface UnifiedViewTab {
  id: string;
  label: string;
  icon?: LucideIcon;
  sections: UnifiedViewSection[];
}

export interface UnifiedViewConfig {
  id: string;
  title: string;
  icon?: LucideIcon;
  dataFetcher?: (data: unknown) => Promise<unknown>;
  dataTransformer?: (data: unknown) => unknown;
  // Sections that appear before tabs (e.g., basic info)
  headerSections?: UnifiedViewSection[];
  tabs?: UnifiedViewTab[];
  // Sections that appear after tabs (if no tabs, these are the main content)
  sections?: UnifiedViewSection[];
}

// ============================================================================
// Data Fetchers
// ============================================================================

async function fetchLeasesForSubnet(data: unknown): Promise<{ leases: DHCPLease[] }> {
  try {
    const leasesData = await dhcpService.getLeases();
    const { network, subnet } = data as {
      network: { name: string };
      subnet: { subnet: string };
    };
    
    // Filter leases for this subnet
    const subnetLeases = leasesData.leases.filter(
      (lease) => network.name === lease.pool || subnet.subnet === lease.pool
    );
    
    return { leases: subnetLeases };
  } catch (error) {
    console.error("Failed to fetch leases:", error);
    return { leases: [] };
  }
}

// ============================================================================
// Unified View Registry
// ============================================================================

export const UNIFIED_VIEW_REGISTRY: UnifiedViewConfig[] = [
  {
    id: "subnet",
    title: "Subnet Overview",
    icon: Network,
    dataFetcher: fetchLeasesForSubnet,
    headerSections: [
      {
        type: "info",
        title: (data: unknown) => {
          const { subnet } = data as { subnet: { subnet: string } };
          return `Subnet: ${subnet.subnet}`;
        },
        icon: Network,
        description: (data: unknown) => {
          const { network } = data as { network: { name: string } };
          return `DHCP subnet in shared network "${network.name}"`;
        },
        fields: (data: unknown) => {
          const { subnet } = data as {
            subnet?: {
              default_router?: string;
              lease?: string;
              name_servers?: string[];
            };
          };
          if (!subnet) return [];
          return [
            {
              label: "Default Router",
              value: subnet.default_router,
              format: "text",
            },
            {
              label: "Lease Time",
              value: subnet.lease,
              format: "text",
            },
            {
              label: "DNS Servers",
              value: subnet.name_servers?.join(", ") || "",
              format: "badge-array",
            },
          ];
        },
      },
    ],
    tabs: [
      {
        id: "clients",
        label: "Clients",
        icon: Users,
        sections: [
          {
            type: "list",
            title: "Active Leases",
            icon: Activity,
            description: "Currently active DHCP leases for this subnet",
            items: (data: unknown) => {
              const { leases } = data as { leases?: DHCPLease[] };
              if (!leases || !Array.isArray(leases)) return [];
              return leases.map((lease) => ({
                id: lease.ip_address,
                title: lease.hostname || lease.ip_address,
                subtitle: `IP: ${lease.ip_address} | MAC: ${lease.mac_address}`,
                badge: {
                  text: lease.state,
                  variant: lease.state === "active" ? "default" : "secondary",
                },
              }));
            },
            emptyMessage: "No active leases for this subnet",
            emptyIcon: Activity,
          },
          {
            type: "list",
            title: "Static Mappings",
            icon: Users,
            description: "Configured static DHCP mappings",
            items: (data: unknown) => {
              const { subnet } = data as {
                subnet?: {
                  static_mappings?: Array<{
                    name: string;
                    ip_address?: string;
                    mac_address?: string;
                    disable?: boolean;
                  }>;
                };
              };
              if (!subnet?.static_mappings || !Array.isArray(subnet.static_mappings)) return [];
              return subnet.static_mappings.map((mapping) => ({
                id: mapping.name,
                title: mapping.name,
                subtitle: `IP: ${mapping.ip_address || "Not set"} | MAC: ${mapping.mac_address || "Not set"}`,
                badge: {
                  text: mapping.disable ? "Disabled" : "Enabled",
                  variant: mapping.disable ? "destructive" : "default",
                },
              }));
            },
            emptyMessage: "No static mappings for this subnet",
            emptyIcon: Users,
          },
        ],
      }
    ],
  },
  {
    id: "client",
    title: "Client Overview",
    icon: Database,
    headerSections: [
      {
        type: "info",
        title: (data: unknown) => {
          const { peer } = data as { peer: { name: string } };
          return `WireGuard Peer: ${peer.name}`;
        },
        icon: Database,
        description: (data: unknown) => {
          const { interface: wgInterface } = data as { interface: { name: string } };
          return `Peer on interface ${wgInterface.name}`;
        },
        fields: (data: unknown) => {
          const { peer } = data as {
            peer: {
              public_key?: string;
              address?: string;
              port?: string | number;
              allowed_ips: string[];
              description?: string;
            };
          };
          return [
            {
              label: "Public Key",
              value: peer.public_key,
              format: "text",
            },
            {
              label: "Endpoint",
              value: peer.address && peer.port ? `${peer.address}:${peer.port}` : undefined,
              format: "text",
            },
            {
              label: "Allowed IPs",
              value: peer.allowed_ips.join(", "),
              format: "badge-array",
            },
            {
              label: "Description",
              value: peer.description,
              format: "text",
            },
          ];
        },
      },
    ],
  },
];

// Helper function to get a unified view config by ID
export function getUnifiedViewConfig(id: string): UnifiedViewConfig | undefined {
  return UNIFIED_VIEW_REGISTRY.find((config) => config.id === id);
}

// Helper function to get all unified view IDs
export function getUnifiedViewIds(): string[] {
  return UNIFIED_VIEW_REGISTRY.map((config) => config.id);
}
