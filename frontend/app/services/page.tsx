"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import {
  Loader2,
  Network,
  Shield,
  Server,
  Globe,
  AlertCircle,
  Clock,
  Key,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface ServiceStatus {
  active: boolean;
  description?: string;
  stats?: Record<string, any>;
}

interface DHCPLease {
  ip_address: string;
  mac_address: string;
  state: string;
  lease_start: string;
  lease_end: string;
  remaining: string;
  pool: string;
  hostname: string;
  origin: string;
}

interface HTTPSConfig {
  "listen-address"?: string[];
  port?: number;
  certificates?: {
    certificate?: {
      [key: string]: {
        certificate?: string;
        private?: {
          "key-file"?: string;
        };
      };
    };
  };
  api?: {
    keys?: {
      id?: {
        [key: string]: {
          key?: string;
        };
      };
    };
  };
  "allow-client"?: {
    address?: string[];
    network?: string[];
  };
}

interface NTPServer {
  name: string;
  pool?: boolean;
  noselect?: boolean;
  prefer?: boolean;
}

interface NTPConfig {
  server?: Record<string, any>;
  "allow-clients"?: {
    address?: string[];
    network?: string[];
  };
  "listen-address"?: string[];
}

export default function ServicesPage() {
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [httpsConfig, setHttpsConfig] = useState<HTTPSConfig | null>(null);
  const [ntpConfig, setNtpConfig] = useState<NTPConfig | null>(null);
  const [ntpStatus, setNtpStatus] = useState<any>(null);
  const [httpsStatus, setHttpsStatus] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [servicesStatus, setServicesStatus] = useState<
    Record<string, ServiceStatus>
  >({
    dhcp: { active: false, description: "DHCP Server" },
    ntp: { active: false, description: "NTP Service" },
    ssh: { active: false, description: "SSH Service" },
    https: { active: false, description: "HTTPS Service" },
  });
  const [dhcpLeases, setDhcpLeases] = useState<Record<string, DHCPLease[]>>({});
  const [dhcpNetworks, setDhcpNetworks] = useState<any[]>([]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const fetchDhcpLeases = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/dhcp/leases`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDhcpLeases(data.leases);
          return data.leases;
        }
      }
      return {};
    } catch (error) {
      console.error("Error fetching DHCP leases:", error);
      return {};
    }
  };

  const fetchNTPStatus = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/ntp/status`);

      if (!response.ok) {
        if (response.status === 404) {
          return;
        }
        throw new Error(
          `Server returned ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.success === true) {
        setNtpStatus(data.data);
        setServicesStatus(prev => ({
          ...prev,
          ntp: {
            ...prev.ntp,
            stats: {
              ...prev.ntp.stats
            }
          }
        }));
      } else {
        throw new Error(data.error || "Failed to load NTP status");
      }
    } catch (error) {
      console.error("Error fetching NTP status:", error);
    }
  };

  const getApiKeys = () => {
    const keys: { id: string; key: string }[] = [];

    if (!httpsConfig?.api?.keys?.id) return keys;

    Object.entries(httpsConfig.api.keys.id).forEach(([id, keyData]) => {
      if (keyData.key) {
        keys.push({
          id,
          key: keyData.key,
        });
      }
    });

    return keys;
  };

  const getCertificates = () => {
    const certs: { name: string; info: any }[] = [];

    if (!httpsConfig?.certificates?.certificate) return certs;

    Object.entries(httpsConfig.certificates.certificate).forEach(
      ([name, certData]) => {
        certs.push({
          name,
          info: certData,
        });
      }
    );

    return certs;
  };

  const getAllowedClients = (): string[] => {
    const clients: string[] = [];

    if (!httpsConfig || !httpsConfig["allow-client"]) return clients;

    if (httpsConfig["allow-client"].address) {
      clients.push(
        ...(Array.isArray(httpsConfig["allow-client"].address)
          ? httpsConfig["allow-client"].address
          : [httpsConfig["allow-client"].address])
      );
    }

    if (httpsConfig["allow-client"].network) {
      clients.push(
        ...(Array.isArray(httpsConfig["allow-client"].network)
          ? httpsConfig["allow-client"].network
          : [httpsConfig["allow-client"].network])
      );
    }

    return clients;
  };

  const parseDhcpNetworks = (configData: any) => {
    if (!configData?.service?.["dhcp-server"]?.["shared-network-name"]) {
      return [];
    }

    const networks = [];
    const dhcpConfig = configData.service["dhcp-server"];

    for (const [networkName, networkConfig] of Object.entries<any>(
      dhcpConfig["shared-network-name"]
    )) {
      if (networkConfig.subnet) {
        for (const [subnet, subnetConfig] of Object.entries<any>(
          networkConfig.subnet
        )) {
          const [_, mask] = subnet.split("/");
          const totalIPs = Math.pow(2, 32 - parseInt(mask));

          let rangeStart = "";
          let rangeStop = "";

          if (subnetConfig.range && subnetConfig.range["0"]) {
            rangeStart = subnetConfig.range["0"].start || "";
            rangeStop = subnetConfig.range["0"].stop || "";
          }

          networks.push({
            name: networkName,
            subnet,
            totalIPs,
            defaultRouter: subnetConfig["default-router"] || "",
            domainName: subnetConfig["domain-name"] || "",
            nameServer: subnetConfig["name-server"] || "",
            rangeStart,
            rangeStop,
          });
        }
      }
    }

    return networks;
  };

  const getNtpServers = (): NTPServer[] => {
    if (!ntpConfig || !ntpConfig.server) return [];

    return Object.entries(ntpConfig.server).map(([name, config]) => ({
      name,
      pool: "pool" in config,
      noselect: "noselect" in config,
      prefer: "prefer" in config,
    }));
  };

  const getClientNetworks = (): string[] => {
    if (!ntpConfig || !ntpConfig["allow-clients"]) return [];

    const networks: string[] = [];

    if (ntpConfig["allow-clients"].address) {
      networks.push(...ntpConfig["allow-clients"].address);
    }

    if (ntpConfig["allow-clients"].network) {
      networks.push(...ntpConfig["allow-clients"].network);
    }

    return networks;
  };

  const fetchConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const response = await fetch(`${apiUrl}/api/config`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `Server error: ${response.status} ${response.statusText}`,
        }));

        console.error("Error response:", errorData);

        toast({
          variant: "destructive",
          title: "Error connecting to VyOS router",
          description:
            errorData.error ||
            `Server returned ${response.status} ${response.statusText}`,
        });

        setIsConnected(false);
        setIsLoadingConfig(false);
        return;
      }

      const data = await response.json();

      if (data.success === true && data.data) {
        setConfig(data.data);
        setIsConnected(true);

        // Fetch DHCP leases and update networks
        const leases = await fetchDhcpLeases();
        const networks = parseDhcpNetworks(data.data);
        setDhcpNetworks(networks);

        // Update service statuses based on config
        updateServiceStatuses(data.data, leases, networks);

        // HTTPS
        const https = data.data.service?.https || null;
        setHttpsConfig(https);

        // NTP
        const ntp = data.data.service?.ntp || null;
        setNtpConfig(ntp);

        // Fetch NTP status
        await fetchNTPStatus();

        toast({
          title: "Configuration loaded",
          description: "Successfully loaded VyOS configuration",
        });
      } else {
        console.error("API error:", data);
        toast({
          variant: "destructive",
          title: "Error loading VyOS configuration",
          description: data.error || "Could not load VyOS configuration",
        });
        setIsConnected(false);
      }
    } catch (error) {
      console.error("Error fetching configuration:", error);
      toast({
        variant: "destructive",
        title: "Connection error",
        description:
          "Could not connect to the API server. Please check that the backend is running.",
      });
      setIsConnected(false);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const updateServiceStatuses = (
    configData: any,
    leases: Record<string, DHCPLease[]>,
    networks: any[]
  ) => {
    const updatedStatuses = { ...servicesStatus };

    // DHCP status
    const dhcpActive = !!configData.service?.["dhcp-server"];
    updatedStatuses.dhcp = {
      active: dhcpActive,
      description: "DHCP Server",
      stats: {
        pools: networks.length,
        leases: Object.values(leases).reduce(
          (count, poolLeases) => count + poolLeases.length,
          0
        ),
      },
    };

    // NTP status
    const ntpActive = !!configData.service?.ntp;
    updatedStatuses.ntp = {
      active: ntpActive,
      description: "NTP Time Service",
      stats: {
        servers: ntpActive ? Object.keys(configData.service.ntp.server || {}).length : 0,
        synced: false, // Will be updated by fetchNTPStatus
        clients: ntpActive ? 
          (configData.service.ntp["allow-clients"]?.address?.length || 0) + 
          (configData.service.ntp["allow-clients"]?.network?.length || 0) : 0
      }
    };

    // SSH status
    updatedStatuses.ssh.active = !!configData.service?.ssh;
    if (updatedStatuses.ssh.active) {
      updatedStatuses.ssh.stats = {
        port: configData.service.ssh.port || 22,
        "disable-password-authentication":
          configData.service.ssh["disable-password-authentication"] || false,
      };
    }

    // HTTPS status
    updatedStatuses.https.active = !!configData.service?.https;
    if (updatedStatuses.https.active) {
      updatedStatuses.https.stats = {
        port: configData.service.https.port || 443,
        apiEnabled: !!configData.service.https.api,
        certificates: configData.service.https.certificates ? 
          Object.keys(configData.service.https.certificates.certificate || {}).length : 0
      };
    }

    setServicesStatus(updatedStatuses);
  };

  const fetchServiceStatus = async (serviceName: string) => {
    try {
      const response = await fetch(
        `${apiUrl}/api/service/status/${serviceName}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setServicesStatus((prev) => ({
            ...prev,
            [serviceName]: {
              ...prev[serviceName],
              active: data.data.active,
              stats: { ...prev[serviceName].stats, ...(data.data.stats || {}) },
            },
          }));
        }
      }
    } catch (error) {
      console.error(`Error fetching ${serviceName} status:`, error);
    }
  };

  useEffect(() => {
    fetchConfig();

    // Fetch individual service statuses
    Object.keys(servicesStatus).forEach((service) => {
      fetchServiceStatus(service);
    });
  }, []);

  const navigateToTab = (tab: string, e: React.MouseEvent) => {
    e.preventDefault();
    window.history.pushState(null, "", `#${tab}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading VyOS configuration...</p>
        </div>
      </div>
    );
  }

  // Calculate total DHCP leases
  const totalDhcpLeases = servicesStatus.dhcp.stats?.leases || 0;

  return (
    <div className="container p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-cyan-400">Services</h1>
        <p className="text-slate-400">
          Quickly view service status and manage them
        </p>
      </div>
      <br />

      <div className="justify-center">
        {!isConnected && (
          <Alert
            variant="destructive"
            className="mb-6 bg-red-900 border-red-800 text-red-100"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Not connected to VyOS router. Some features may be unavailable.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {/* DHCP Service Card */}
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg hover:shadow-cyan-900/20">
            <CardHeader className="pb-2 border-b border-slate-700">
              <CardTitle className="text-cyan-400">DHCP</CardTitle>
              <CardDescription className="text-slate-400">
                {servicesStatus.dhcp.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md bg-slate-900 p-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Status</span>
                    <Badge
                      className={
                        servicesStatus.dhcp.active
                          ? "bg-green-700"
                          : "bg-red-700"
                      }
                    >
                      {servicesStatus.dhcp.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">
                      Pools Configured
                    </span>
                    <span className="text-white font-medium">
                      {dhcpNetworks.length}
                    </span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">
                      Active Leases
                    </span>
                    <span className="text-white font-medium">
                      {totalDhcpLeases}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                variant="ghost"
                className="w-full text-xs gap-1 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800"
                onClick={(e) => navigateToTab("dhcp", e)}
              >
                <Network className="h-3 w-3" />
                Manage DHCP
              </Button>
            </CardFooter>
          </Card>

          {/* NTP Service Card */}
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg hover:shadow-blue-900/20">
            <CardHeader className="pb-2 border-b border-slate-700">
              <CardTitle className="text-blue-400">NTP</CardTitle>
              <CardDescription className="text-slate-400">
                {servicesStatus.ntp.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md bg-slate-900 p-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Status</span>
                    <Badge
                      className={
                        servicesStatus.ntp.active
                          ? "bg-green-700"
                          : "bg-red-700"
                      }
                    >
                      {servicesStatus.ntp.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">
                      Configured Servers
                    </span>
                    <span className="text-white font-medium">
                      {servicesStatus.ntp.stats?.servers || 0}
                    </span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Client Networks</span>
                    <span className="text-white font-medium">
                      {servicesStatus.ntp.stats?.clients || 0}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                variant="ghost"
                className="w-full text-xs gap-1 text-blue-400 hover:text-blue-300 hover:bg-slate-800"
                onClick={(e) => navigateToTab("ntp", e)}
              >
                <Clock className="h-3 w-3" />
                Manage NTP
              </Button>
            </CardFooter>
          </Card>

          {/* SSH Service Card */}
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg hover:shadow-green-900/20">
            <CardHeader className="pb-2 border-b border-slate-700">
              <CardTitle className="text-green-400">SSH</CardTitle>
              <CardDescription className="text-slate-400">
                {servicesStatus.ssh.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md bg-slate-900 p-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Status</span>
                    <Badge
                      className={
                        servicesStatus.ssh.active
                          ? "bg-green-700"
                          : "bg-red-700"
                      }
                    >
                      {servicesStatus.ssh.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Port</span>
                    <span className="text-white font-medium">
                      {servicesStatus.ssh.stats?.port ||
                        config?.service?.ssh?.port ||
                        22}
                    </span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">
                      Password Auth
                    </span>
                    <Badge
                      className={
                        !servicesStatus.ssh.stats?.[
                          "disable-password-authentication"
                        ]
                          ? "bg-green-700"
                          : "bg-red-700"
                      }
                    >
                      {!servicesStatus.ssh.stats?.[
                        "disable-password-authentication"
                      ]
                        ? "Enabled"
                        : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                variant="ghost"
                className="w-full text-xs gap-1 text-green-400 hover:text-green-300 hover:bg-slate-800"
                onClick={(e) => navigateToTab("ssh", e)}
              >
                <Key className="h-3 w-3" />
                Manage SSH
              </Button>
            </CardFooter>
          </Card>

          {/* HTTPS Service Card */}
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg hover:shadow-red-900/20">
            <CardHeader className="pb-2 border-b border-slate-700">
              <CardTitle className="text-red-400">HTTPS</CardTitle>
              <CardDescription className="text-slate-400">
                {servicesStatus.https.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md bg-slate-900 p-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Status</span>
                    <Badge
                      className={
                        servicesStatus.https.active
                          ? "bg-green-700"
                          : "bg-red-700"
                      }
                    >
                      {servicesStatus.https.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Port</span>
                    <span className="text-white font-medium">
                      {servicesStatus.https.stats?.port ||
                        config?.service?.https?.port ||
                        443}
                    </span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">API Access</span>
                    <Badge
                      className={
                        getApiKeys().length > 0 ? "bg-green-700" : "bg-red-700"
                      }
                    >
                      {getApiKeys().length > 0
                        ? "Configured"
                        : "Not Configured"}
                    </Badge>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">Certificates</span>
                    <Badge
                      className={
                        getCertificates().length > 0
                          ? "bg-green-700"
                          : "bg-red-700"
                      }
                    >
                      {getCertificates().length > 0
                        ? "Configured"
                        : "Not Configured"}
                    </Badge>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-400">
                      Client Access Rules
                    </span>
                    <Badge
                      className={
                        getAllowedClients().length > 0
                          ? "bg-green-700"
                          : "bg-amber-700"
                      }
                    >
                      {getAllowedClients().length > 0
                        ? `${getAllowedClients().length} Rules`
                        : "Any"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                variant="ghost"
                className="w-full text-xs gap-1 text-red-400 hover:text-red-300 hover:bg-slate-800"
                onClick={(e) => navigateToTab("https", e)}
              >
                <Globe className="h-3 w-3" />
                Manage HTTPS
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}