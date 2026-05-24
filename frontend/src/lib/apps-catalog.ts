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
//   // Files exposed in the container row's file-browser action (folder icon).
//   // When present, a folder icon appears in the container's action buttons.
//   // Clicking it opens a file list modal; selecting a file loads its contents
//   // into a text editor. Saving backs up the existing file to <filename>.bak
//   // before writing the new content via SSH.
//   // Paths support "${containerName}" templates — always use the template
//   // rather than a hard-coded name so the path stays correct if the user
//   // renames the container at install time.
//   editableFiles: [
//     { path: "/config/containers/${containerName}/data/config.conf", label: "Main Config" },
//   ],
//
//   // Files to create (if absent) after directories are set up.
//   // Parent directories are created automatically via mkdir -p before touch runs.
//   // Values support "${fieldName}" templates — always use "${containerName}" rather
//   // than a hard-coded name so the path stays correct if the user renames the container.
//   initFiles: [
//     "/config/containers/${containerName}/data/ips-config/ips-rules.conf",
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
    source: number | string;
    destination: number | string;
    protocol?: "tcp" | "udp";
    listenAddresses?: string[];
  }>;

  nameServers?: string[];

  environment?: Array<{ name: string; value: string }>;
  labels?: Array<{ name: string; value: string }>;
  initFiles?: string[];

  // Files exposed in the container row's file-browser action (folder icon).
  // Each entry needs a display label and a path. Paths support "${containerName}"
  // templates — always use the template rather than a hard-coded container name.
  editableFiles?: Array<{ path: string; label: string }>;

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
  order?: number;
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
    id: "adguard-dnsproxy-doq",
    name: "AdGuard DNS Proxy DoQ",
    tagline: "Local DNS-over-QUIC upstream proxy for VyOS PowerDNS",
    description:
      "Runs AdGuard dnsproxy locally on VyOS so the built-in PowerDNS Recursor can forward queries to an encrypted DNS-over-QUIC upstream for deployments where PowerDNS remains the LAN DNS server.",
    category: "DNS",
    tags: ["dns", "doq", "dns-over-quic", "encrypted-dns", "privacy"],
    dockerImage: "docker.io/adguard/dnsproxy:latest",
    defaultContainerName: "adguard-dnsproxy",
    iconPath: "/app-icons/adguard-home.svg",
    installConfig: {
      fields: [
        {
          name: "memory",
          label: "Memory (MB)",
          type: "number",
          default: 128,
          placeholder: "128",
          description:
            "dnsproxy is lightweight; increase only for unusually high query volume.",
        },
        {
          name: "listenAddress",
          label: "Local Listen Address",
          type: "text",
          default: "127.0.0.1",
          placeholder: "127.0.0.1",
          description:
            "Use 127.0.0.1 when PowerDNS on VyOS will forward to this container locally.",
          required: true,
        },
        {
          name: "listenPort",
          label: "Local Listen Port",
          type: "number",
          default: 5300,
          placeholder: "5300",
          description:
            "Port dnsproxy listens on locally. Avoid 53 because VyOS PowerDNS normally owns LAN DNS.",
          required: true,
        },
        {
          name: "upstream",
          label: "DoQ Upstream",
          type: "text",
          default: "quic://dns.adguard-dns.com",
          placeholder: "quic://dns.adguard-dns.com",
          description: "Encrypted upstream DNS resolver.",
          required: true,
        },
        {
          name: "bootstrap1",
          label: "Bootstrap DNS 1",
          type: "text",
          default: "94.140.14.14:53",
          placeholder: "94.140.14.14:53",
          description:
            "Bootstrap resolver used to resolve the upstream hostname before encrypted DNS is established.",
          required: true,
        },
        {
          name: "bootstrap2",
          label: "Bootstrap DNS 2",
          type: "text",
          default: "94.140.15.15:53",
          placeholder: "94.140.15.15:53",
          description:
            "Second bootstrap resolver. Kept required because the generic wizard cannot conditionally omit arguments.",
          required: true,
        },
        {
          name: "upstreamMode",
          label: "Upstream Mode",
          type: "select",
          default: "load_balance",
          options: ["load_balance", "parallel", "fastest_addr"],
          description: "dnsproxy upstream selection mode.",
        },
        {
          name: "timeout",
          label: "Upstream Timeout",
          type: "text",
          default: "5s",
          placeholder: "5s",
          description: "Timeout for outbound DNS queries.",
          required: true,
        },
      ],
      network: {
        allowHost: true,
        allowExisting: false,
        allowNew: false,
        defaultMode: "host",
        allowStaticIp: false,
        allowMac: false,
      },
      description: "AdGuard dnsproxy DoQ upstream proxy for VyOS PowerDNS",
      restart: "always",
      logDriver: "journald",
      memory: "${memory}",
      privileged: false,
      allowHostPid: false,
      capabilities: [],
      arguments:
        "-l ${listenAddress} -p ${listenPort} -u ${upstream} -b ${bootstrap1} -b ${bootstrap2} --upstream-mode=${upstreamMode} --timeout=${timeout}",
      labels: [
        { name: "com.vymanager.app", value: "adguard-dnsproxy-doq" },
        { name: "com.vymanager.role", value: "dns-upstream-proxy" },
      ],
    },
  },
  {
    id: "nprobe",
    name: "nProbe",
    tagline: "NetFlow/IPFIX collector with embedded IPS",
    description:
      "ntop nProbe is a high-performance NetFlow v5/v9/IPFIX probe and collector with embedded IPS capabilities.",
    category: "Network Monitoring",
    tags: ["netflow", "ipfix", "ips", "monitoring", "ntop", "network-probe"],
    dockerImage: "ntop/nprobe:latest",
    defaultContainerName: "nprobe",
    iconPath: "/app-icons/nprobe.png",
    installConfig: {
      fields: [
        {
          name: "memory",
          label: "Memory (MB)",
          type: "number",
          default: 512,
          placeholder: "512",
          description: "Memory limit. Increase for high-traffic environments.",
        },
        {
          name: "nfqueue",
          label: "NF_QUEUE",
          type: "number",
          default: 25,
          placeholder: "2055",
          description: "Set the NF queue to use in your firewall rules",
          required: true,
        },
      ],
      network: {
        allowHost: true,
        allowExisting: false,
        allowNew: false,
        defaultMode: "host",
        allowStaticIp: false,
        allowMac: false,
      },
      description: "nProbe — NetFlow/IPFIX probe with IPS",
      restart: "always",
      memory: "${memory}",
      privileged: false,
      allowHostPid: false,
      capabilities: ["net-admin", "sys-admin"],
      arguments:
        "-i nf:${nfqueue} --ips-mode /data/nprobe/ips-config/ips-rules.conf -n none -b 1",
      volumes: [{ name: "data", destination: "/data/nprobe" }],
      initFiles: ["/config/containers/${containerName}/data/ips-rules.conf"],
      editableFiles: [
        {
          path: "/config/containers/${containerName}/data/ips-rules.conf",
          label: "IPS Rules",
        },
      ],
      labels: [{ name: "com.vymanager.app", value: "nprobe" }],
    },
  },
  {
    id: "ntopng",
    name: "ntopng",
    tagline: "High‑performance web‑based network traffic monitoring",
    description:
      "ntop ntopng is a network traffic probe that shows network usage, supports NetFlow/sFlow, packet analysis, and provides a modern web interface. Ideal for deep inspection of your VyOS router traffic.",
    category: "Network Monitoring",
    tags: ["monitoring", "netflow", "traffic-analysis", "ntop", "packet"],
    dockerImage: "ntop/ntopng:latest",
    defaultContainerName: "ntopng",
    iconPath: "/app-icons/ntopng.png",
    installConfig: {
      fields: [
        {
          name: "memory",
          label: "Memory (MB)",
          type: "number",
          default: 1024,
          placeholder: "1024",
          description:
            "ntopng can use significant memory when tracking many flows.",
        },
        {
          name: "interface",
          label: "Network Interface",
          type: "text",
          default: "eth0",
          placeholder: "eth0",
          description: "Interface to monitor (e.g., eth0, bond0, eth1).",
          required: true,
        },
        {
          name: "webPort",
          label: "Web Interface Port",
          type: "number",
          default: 3000,
          placeholder: "3000",
          description: "Port for the ntopng web UI.",
          required: true,
        },
      ],
      network: {
        allowHost: true,
        allowExisting: false,
        allowNew: false,
        defaultMode: "host",
        allowStaticIp: false,
        allowMac: false,
      },
      description: "ntopng — realtime network traffic analysis",
      restart: "always",
      logDriver: "journald",
      memory: "${memory}",
      privileged: false,
      capabilities: ["net-admin", "net-raw", "sys-admin"],
      arguments:
        "-i ${interface} -w ${webPort} --data-dir /var/lib/ntopng --license-file /etc/ntopng-license/ntopng.license",
      volumes: [
        { name: "data", destination: "/var/lib/ntopng" },
        { name: "license", destination: "/etc/ntopng-license" },
      ],
      initFiles: ["/config/containers/${containerName}/license/ntopng.license"],
      editableFiles: [
        {
          path: "/config/containers/${containerName}/license/ntopng.license",
          label: "License File",
        },
      ],
      labels: [{ name: "com.vymanager.app", value: "ntopng" }],
    },
  },
  {
    id: "pihole",
    name: "Pi‑hole",
    tagline: "Network‑wide ad blocking",
    description:
      "Block ads and trackers for all devices on your network using DNS‑based filtering. Pi‑hole includes a web interface.",
    category: "DNS",
    tags: ["dns", "ad-blocking", "privacy", "pihole", "filtering"],
    dockerImage: "pihole/pihole:latest",
    defaultContainerName: "pihole",
    iconPath: "/app-icons/pihole.svg",
    installConfig: {
      fields: [
        {
          name: "password",
          label: "Admin Password",
          type: "text",
          default: "",
          placeholder: "set a secure password",
          description: "Password for the web admin interface.",
          required: false,
        },
        {
          name: "timezone",
          label: "Timezone",
          type: "text",
          default: "UTC",
          placeholder: "America/New_York",
          description: "e.g., America/Chicago, Europe/London",
        },
        {
          name: "memory",
          label: "Memory (MB)",
          type: "number",
          default: 512,
          placeholder: "512",
        },
        {
          name: "webPort",
          label: "Web Interface Port",
          type: "number",
          default: 80,
          placeholder: "80",
          description: "Port for the Pi‑hole web UI.",
          required: true,
        },
      ],
      network: {
        allowHost: true,
        allowExisting: true,
        allowNew: true,
        defaultMode: "existing",
        allowStaticIp: true,
        allowMac: true,
      },
      description: "Pi‑hole – network‑wide ad blocking",
      restart: "always",
      logDriver: "journald",
      memory: "${memory}",
      environment: [
        { name: "TZ", value: "${timezone}" },
        { name: "FTLCONF_webserver_api_password", value: "${password}" },
        { name: "FTLCONF_webserver_port", value: "${webPort}" },
      ],
      volumes: [
        { name: "etc-pihole", destination: "/etc/pihole" },
        { name: "etc-dnsmasq", destination: "/etc/dnsmasq.d" },
      ],
      labels: [{ name: "com.vymanager.app", value: "pihole" }],
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
        { name: "data", destination: "/data" },
        { name: "letsencrypt", destination: "/etc/letsencrypt" },
      ],
    },
  },
  {
    id: "technitium-dns",
    name: "Technitium DNS Server",
    tagline: "Feature-rich self-hosted DNS server with web console",
    description:
      "A fully-featured open source DNS server with a web console on port 5380. Supports DNS-over-HTTPS, DNS-over-TLS, DNSSEC, zone management, ad blocking, and query logging.",
    category: "DNS",
    tags: [
      "dns",
      "dns-server",
      "self-hosted",
      "doh",
      "dot",
      "dnssec",
      "ad-blocking",
      "technitium",
    ],
    dockerImage: "technitium/dns-server:latest",
    defaultContainerName: "technitium-dns",
    iconPath: "/app-icons/technitium.png",
    installConfig: {
      fields: [
        {
          name: "serverDomain",
          label: "Server Domain",
          type: "text",
          default: "dns-server",
          placeholder: "dns-server",
          description:
            "Primary domain name this DNS server uses to identify itself.",
          required: true,
        },
      ],
      network: {
        allowHost: true,
        allowExisting: true,
        allowNew: true,
        defaultMode: "existing",
        allowStaticIp: true,
        allowMac: true,
      },
      description: "Technitium DNS Server — self-hosted DNS with web console",
      restart: "always",
      environment: [
        { name: "DNS_SERVER_DOMAIN", value: "${serverDomain}" },
        {
          name: "DNS_SERVER_LOG_FOLDER_PATH",
          value: "/var/log/technitium/dns",
        },
      ],
      volumes: [
        { name: "config", destination: "/etc/dns" },
        { name: "logs", destination: "/var/log/technitium/dns" },
      ],
      sysctl: [{ name: "net.ipv4.ip_local_port_range", value: "1024 65535" }],
    },
  },
];
