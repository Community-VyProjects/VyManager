import type { ContainerConfig, ContainerCapabilities } from "./api/container";

// ─── Contributor guide ────────────────────────────────────────────────────────
//
// Adding a new app requires exactly two steps:
//
//   1. Drop an icon in  public/app-icons/<app-id>.svg
//   2. Add an entry to  APP_CATALOG below with an installConfig
//
// The GenericAppWizard renders the install UI automatically. No React needed.
// For apps that require custom deploy logic, register a wizard component in
// apps-registry.tsx instead.
//
// ─── Full installConfig reference ─────────────────────────────────────────────
//
// {
//   // User-configurable fields rendered in Step 1 (Basic).
//   // Reference values elsewhere as "${fieldName}".
//   fields: [
//     { name: "timezone", label: "Timezone", type: "text",
//       default: "UTC", placeholder: "America/New_York",
//       description: "e.g. America/New_York, Europe/London, UTC" },
//     { name: "password", label: "Admin Password", type: "text", required: true },
//     { name: "port",     label: "Web Port",        type: "number", default: 8080 },
//     { name: "mode",     label: "Mode",            type: "select",
//       default: "bridge", options: ["bridge", "host", "none"] },
//     { name: "debug",    label: "Enable Debug",    type: "checkbox", default: false },
//   ],
//
//   // Network step — omit this section to skip the network step entirely.
//   network: {
//     allowHost:     true,       // offer "Host Networking" option
//     allowExisting: true,       // offer "Use Existing Network"  (default: true)
//     allowNew:      true,       // offer "Create New Network"    (default: true)
//     defaultMode:   "existing", // "host" | "existing" | "new"
//     allowStaticIp: true,       // let user enter a static IP when attaching
//     allowMac:      true,       // let user enter a MAC address (VyOS 1.5+)
//   },
//
//   // Container metadata & runtime
//   description:  "My App — managed by VyManager",
//   restart:      "always",      // "no" | "on-failure" | "always"
//   logDriver:    "journald",    // VyOS 1.5+ — "k8s-file" | "journald" | "none"
//   memory:       "512",         // MB as string, supports "${fieldName}" templates
//   sharedMemory: "64",          // MB
//   cpuQuota:     "0.5",         // fractional CPU cores, e.g. "0.5" = 50%
//   uid:          "1000",
//   gid:          "1000",
//   hostname:     "${containerName}", // supports "${fieldName}" templates
//   command:      "/usr/bin/my-app",
//   entrypoint:   "/entrypoint.sh",
//   arguments:    "--config /etc/app/config.yml",
//
//   // Security
//   privileged:   false,
//   allowHostPid: false,
//   capabilities: [
//     // Supported values: "net-admin" | "net-bind-service" | "net-raw" |
//     //   "mknod" | "setpcap" | "sys-admin" | "sys-module" | "sys-nice" | "sys-time"
//     "net-admin",
//     "net-bind-service",
//   ],
//
//   // Kernel parameters
//   sysctl: [
//     { name: "net.ipv4.ip_forward",       value: "1" },
//     { name: "net.ipv4.ip_nonlocal_bind", value: "1" },
//   ],
//
//   // Storage — source path is always /config/containers/{containerName}/{volumeName}
//   volumes: [
//     { name: "data",   destination: "/data" },
//     { name: "config", destination: "/etc/app",     mode: "ro" },
//     { name: "logs",   destination: "/var/log/app", propagation: "shared" },
//     // propagation values: "shared" | "slave" | "private" |
//     //                     "rshared" | "rslave" | "rprivate"
//   ],
//   devices: [
//     { name: "dri", source: "/dev/dri/renderD128", destination: "/dev/dri/renderD128" },
//   ],
//   tmpfs: [        // VyOS 1.5+ only
//     { name: "cache", destination: "/tmp/cache", size: "100m" },
//   ],
//
//   // Ports — automatically skipped when host networking is selected
//   ports: [
//     { name: "http",  source: 80,  destination: 80,  protocol: "tcp" },
//     { name: "https", source: 443, destination: 443, protocol: "tcp" },
//     { name: "dns",   source: 53,  destination: 53,  protocol: "udp" },
//     { name: "bound", source: 80,  destination: 80,  protocol: "tcp",
//       listenAddresses: ["192.168.1.1"] },
//   ],
//
//   // DNS servers added to the container
//   nameServers: ["1.1.1.1", "8.8.8.8"],
//
//   // Environment variables — values support "${fieldName}" templates
//   environment: [
//     { name: "TZ",       value: "${timezone}" },
//     { name: "PASSWORD", value: "${password}" },
//     { name: "PUID",     value: "1000" },
//   ],
//   labels: [
//     { name: "com.example.managed-by", value: "vymanager" },
//   ],
//
//   // Health check — VyOS 1.5+ only
//   healthCheck: {
//     command:  "CMD /bin/health.sh",
//     interval: "30",  // seconds
//     retry:    3,
//     timeout:  "10",  // seconds
//   },
// }
// ─────────────────────────────────────────────────────────────────────────────

export interface AppField {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "checkbox";
  default?: string | number | boolean;
  placeholder?: string;
  description?: string;
  options?: string[];
  required?: boolean;
}

export interface AppInstallConfig {
  fields?: AppField[];

  network?: {
    allowHost?: boolean;
    allowExisting?: boolean;
    allowNew?: boolean;
    defaultMode?: "host" | "existing" | "new";
    allowStaticIp?: boolean;
    allowMac?: boolean;
  };

  description?: string;
  restart?: string;
  logDriver?: string;
  memory?: string;
  sharedMemory?: string;
  cpuQuota?: string;
  uid?: string;
  gid?: string;
  hostname?: string;
  command?: string;
  entrypoint?: string;
  arguments?: string;

  privileged?: boolean;
  allowHostPid?: boolean;
  capabilities?: string[];

  sysctl?: Array<{ name: string; value: string }>;

  volumes?: Array<{
    name: string;
    destination: string;
    mode?: "ro" | "rw";
    propagation?: string;
  }>;
  devices?: Array<{
    name: string;
    source: string;
    destination: string;
  }>;
  tmpfs?: Array<{
    name: string;
    destination: string;
    size?: string;
  }>;

  ports?: Array<{
    name: string;
    source: number;
    destination: number;
    protocol?: "tcp" | "udp";
    listenAddresses?: string[];
  }>;

  nameServers?: string[];

  environment?: Array<{ name: string; value: string }>;
  labels?: Array<{ name: string; value: string }>;

  healthCheck?: {
    command?: string;
    interval?: string;
    retry?: number;
    timeout?: string;
  };
}

export interface AppDef {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  tags: string[];
  dockerImage: string;
  defaultContainerName: string;
  iconPath?: string;
  installConfig?: AppInstallConfig;
}

export interface WizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ContainerConfig;
  capabilities: ContainerCapabilities | null;
  onComplete: () => void;
  app: AppDef;
}

export const APP_CATALOG: AppDef[] = [
  {
    id: "adguard-home",
    name: "AdGuard Home",
    tagline: "Network-wide ad & tracker blocking",
    description:
      "Block ads and tracking on every device in your network. AdGuard Home acts as a DNS server with built-in content filtering — no client-side software needed.",
    category: "DNS",
    tags: ["dns", "ad-blocking", "privacy", "security"],
    dockerImage: "adguard/adguardhome:latest",
    defaultContainerName: "adguard",
    iconPath: "/app-icons/adguard-home.svg",
    installConfig: {
      fields: [
        {
          name: "memory",
          label: "Memory (MB)",
          type: "number",
          default: 2048,
          placeholder: "2048",
        },
        {
          name: "timezone",
          label: "Timezone",
          type: "text",
          default: "America/Chicago",
          placeholder: "America/New_York",
          description: "e.g. America/New_York, Europe/London, UTC",
        },
      ],
      network: {
        allowHost: true,
        allowExisting: true,
        allowNew: true,
        defaultMode: "host",
      },
      description: "AdGuard Home — network-wide ad blocking",
      restart: "on-failure",
      memory: "${memory}",
      environment: [{ name: "TZ", value: "${timezone}" }],
      volumes: [{ name: "conf", destination: "/opt/adguardhome/conf" }],
    },
  },
  {
    id: "nginx-proxy-manager",
    name: "Nginx Proxy Manager",
    tagline: "Reverse proxy with a beautiful UI",
    description:
      "Expose web services on your network with free SSL, powered by Let's Encrypt. Manage proxy hosts, redirections, and streams through a clean web interface.",
    category: "Proxy",
    tags: ["proxy", "ssl", "nginx", "letsencrypt", "reverse-proxy"],
    dockerImage: "docker.io/jc21/nginx-proxy-manager",
    defaultContainerName: "npm",
    iconPath: "/app-icons/nginx-proxy-manager.svg",
    installConfig: {
      network: {
        allowExisting: true,
        allowNew: true,
        defaultMode: "existing",
        allowStaticIp: true,
        allowMac: true,
      },
      description: "Nginx Proxy Manager",
      restart: "always",
      volumes: [
        { name: "data",        destination: "/data" },
        { name: "letsencrypt", destination: "/etc/letsencrypt" },
      ],
    },
  },
];
