"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Plus, X, Info } from "lucide-react";
import { dhcpService, type DHCPCapabilitiesResponse, type DHCPRange } from "@/lib/api/dhcp";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Validation helper functions
const isValidIPv4 = (ip: string): boolean => {
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Regex);
  if (!match) return false;
  return match.slice(1).every(octet => {
    const num = parseInt(octet);
    return num >= 0 && num <= 255;
  });
};

const isValidCIDR = (cidr: string): boolean => {
  const parts = cidr.split('/');
  if (parts.length !== 2) return false;
  const [ip, prefix] = parts;
  if (!isValidIPv4(ip)) return false;
  const prefixNum = parseInt(prefix);
  return prefixNum >= 0 && prefixNum <= 32;
};

const isValidDomain = (domain: string): boolean => {
  // Allow FQDN and simple hostnames
  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  return domainRegex.test(domain) && domain.length <= 253;
};

const ipToNumber = (ip: string): number => {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
};

const isIPInSubnet = (ip: string, subnet: string): boolean => {
  if (!isValidIPv4(ip) || !isValidCIDR(subnet)) return false;
  const [subnetIP, prefixStr] = subnet.split('/');
  const prefix = parseInt(prefixStr);
  const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
  const ipNum = ipToNumber(ip);
  const subnetNum = ipToNumber(subnetIP);
  return (ipNum & mask) === (subnetNum & mask);
};

const isValidIPRange = (start: string, stop: string, subnet: string): boolean => {
  if (!isValidIPv4(start) || !isValidIPv4(stop)) return false;
  if (!isIPInSubnet(start, subnet) || !isIPInSubnet(stop, subnet)) return false;
  return ipToNumber(start) <= ipToNumber(stop);
};

interface CreateDHCPServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: DHCPCapabilitiesResponse | null;
  existingNetwork?: string;
}

export function CreateDHCPServerModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingNetwork,
}: CreateDHCPServerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mode selection
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [existingNetworks, setExistingNetworks] = useState<string[]>([]);

  // Basic fields
  const [networkName, setNetworkName] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [subnet, setSubnet] = useState("");
  const [subnetId, setSubnetId] = useState("");
  const [defaultRouter, setDefaultRouter] = useState("");
  const [domainName, setDomainName] = useState("");
  const [lease, setLease] = useState("86400"); // 24 hours default

  // DNS fields
  const [nameServers, setNameServers] = useState<string[]>([""]);
  const [domainSearch, setDomainSearch] = useState<string[]>([]);

  // DHCP Pool fields
  const [ranges, setRanges] = useState<DHCPRange[]>([{ range_id: "0", start: "", stop: "" }]);
  const [excludes, setExcludes] = useState<string[]>([]);

  // Advanced options
  const [bootfileName, setBootfileName] = useState("");
  const [bootfileServer, setBootfileServer] = useState("");
  const [tftpServerName, setTftpServerName] = useState("");
  const [timeServers, setTimeServers] = useState<string[]>([]);
  const [ntpServers, setNtpServers] = useState<string[]>([]);
  const [winsServers, setWinsServers] = useState<string[]>([]);
  const [timeOffset, setTimeOffset] = useState("");
  const [clientPrefixLength, setClientPrefixLength] = useState("");
  const [wpadUrl, setWpadUrl] = useState("");

  // Options
  const [pingCheck, setPingCheck] = useState(false);
  const [enableFailover, setEnableFailover] = useState(false);

  useEffect(() => {
    if (open) {
      // Set mode based on whether existingNetwork is provided
      if (existingNetwork) {
        setMode("existing");
        setSelectedNetwork(existingNetwork);
      } else {
        setMode("new");
        setSelectedNetwork("");
      }
      calculateNextSubnetId();
      loadExistingNetworks();
    }
  }, [open, existingNetwork]);

  const loadExistingNetworks = async () => {
    try {
      const config = await dhcpService.getConfig();
      setExistingNetworks(config.shared_networks.map(n => n.name));
    } catch (err) {
      console.error("Failed to load existing networks:", err);
    }
  };

  const calculateNextSubnetId = async () => {
    if (!capabilities?.has_subnet_id) return;

    try {
      const config = await dhcpService.getConfig();
      const usedIds = new Set<number>();

      // Collect all used subnet IDs
      config.shared_networks.forEach((network) => {
        network.subnets.forEach((subnet) => {
          if (subnet.subnet_id) {
            usedIds.add(subnet.subnet_id);
          }
        });
      });

      // Find the lowest available ID starting from 1
      let nextId = 1;
      while (usedIds.has(nextId)) {
        nextId++;
      }

      setSubnetId(nextId.toString());
    } catch (err) {
      console.error("Failed to calculate next subnet ID:", err);
      setSubnetId("1");
    }
  };

  const resetForm = () => {
    setMode("new");
    setNetworkName("");
    setSelectedNetwork("");
    setSubnet("");
    setSubnetId("");
    setDefaultRouter("");
    setDomainName("");
    setLease("86400");
    setNameServers([""]);
    setDomainSearch([]);
    setRanges([{ range_id: "0", start: "", stop: "" }]);
    setExcludes([]);
    setBootfileName("");
    setBootfileServer("");
    setTftpServerName("");
    setTimeServers([]);
    setNtpServers([]);
    setWinsServers([]);
    setTimeOffset("");
    setClientPrefixLength("");
    setWpadUrl("");
    setPingCheck(false);
    setEnableFailover(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): boolean => {
    // Network name validation
    if (mode === "new") {
      if (!networkName.trim()) {
        setError("Network name is required");
        return false;
      }
    } else {
      if (!selectedNetwork) {
        setError("Please select an existing network");
        return false;
      }
    }

    // Subnet validation
    if (!subnet.trim()) {
      setError("Subnet is required");
      return false;
    }
    if (!isValidCIDR(subnet.trim())) {
      setError("Invalid subnet CIDR format. Use format like 192.168.1.0/24");
      return false;
    }

    // Default router validation
    if (!defaultRouter.trim()) {
      setError("Default router (gateway) is required");
      return false;
    }
    if (!isValidIPv4(defaultRouter.trim())) {
      setError("Invalid default router IP address");
      return false;
    }
    if (!isIPInSubnet(defaultRouter.trim(), subnet.trim())) {
      setError("Default router must be within the subnet");
      return false;
    }

    // Name servers validation
    const validNameServers = nameServers.filter((ns) => ns.trim());
    if (validNameServers.length === 0) {
      setError("At least one name server is required");
      return false;
    }
    for (const ns of validNameServers) {
      if (!isValidIPv4(ns.trim())) {
        setError(`Invalid name server IP address: ${ns}`);
        return false;
      }
    }

    // Domain name validation
    if (!domainName.trim()) {
      setError("Domain name is required");
      return false;
    }
    if (!isValidDomain(domainName.trim())) {
      setError("Invalid domain name format");
      return false;
    }

    // Domain search validation
    for (const ds of domainSearch.filter(d => d.trim())) {
      if (!isValidDomain(ds.trim())) {
        setError(`Invalid domain search format: ${ds}`);
        return false;
      }
    }

    // Lease validation
    if (!lease.trim()) {
      setError("Lease time is required");
      return false;
    }
    const leaseNum = parseInt(lease);
    if (isNaN(leaseNum) || leaseNum <= 0) {
      setError("Lease time must be a positive number");
      return false;
    }

    // DHCP ranges validation
    const validRanges = ranges.filter((r) => (r.start ?? "").trim() && (r.stop ?? "").trim());
    if (validRanges.length === 0) {
      setError("At least one DHCP range with start and stop addresses is required");
      return false;
    }
    for (const range of validRanges) {
      const start = (range.start ?? "").trim();
      const stop = (range.stop ?? "").trim();
      if (!isValidIPRange(start, stop, subnet.trim())) {
        setError(`Invalid DHCP range: ${start} - ${stop}. Both IPs must be valid, within subnet, and start must be <= stop`);
        return false;
      }
    }

    // Exclude addresses validation
    for (const exclude of excludes.filter(e => e.trim())) {
      if (!isValidIPv4(exclude.trim())) {
        setError(`Invalid exclude IP address: ${exclude}`);
        return false;
      }
      if (!isIPInSubnet(exclude.trim(), subnet.trim())) {
        setError(`Exclude address ${exclude} must be within the subnet`);
        return false;
      }
    }

    // Time servers validation
    for (const ts of timeServers.filter(t => t.trim())) {
      if (!isValidIPv4(ts.trim())) {
        setError(`Invalid time server IP address: ${ts}`);
        return false;
      }
    }

    // NTP servers validation (must be IP addresses, not FQDNs)
    for (const ntp of ntpServers.filter(n => n.trim())) {
      if (!isValidIPv4(ntp.trim())) {
        setError(`Invalid NTP server IP address: ${ntp}. NTP servers must be IP addresses, not hostnames`);
        return false;
      }
    }

    // WINS servers validation
    for (const wins of winsServers.filter(w => w.trim())) {
      if (!isValidIPv4(wins.trim())) {
        setError(`Invalid WINS server IP address: ${wins}`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const targetNetworkName = mode === "new" ? networkName.trim() : selectedNetwork;

      // Calculate subnet ID if needed for VyOS 1.5
      let calculatedSubnetId: number | undefined = undefined;
      if (capabilities?.has_subnet_id) {
        if (subnetId) {
          calculatedSubnetId = parseInt(subnetId);
        } else {
          // Auto-calculate if not already set
          const config = await dhcpService.getConfig();
          const usedIds = new Set<number>();
          config.shared_networks.forEach((network) => {
            network.subnets.forEach((s) => {
              if (s.subnet_id) usedIds.add(s.subnet_id);
            });
          });
          let nextId = 1;
          while (usedIds.has(nextId)) nextId++;
          calculatedSubnetId = nextId;
        }
      }

      await dhcpService.createSubnet({
        network_name: targetNetworkName,
        subnet: subnet.trim(),
        subnet_id: calculatedSubnetId,
        default_router: defaultRouter.trim(),
        name_servers: nameServers.filter((ns) => ns.trim()),
        domain_name: domainName.trim(),
        lease: lease.trim(),
        ranges: ranges.filter((r) => r.start && r.stop),
        excludes: excludes.filter((e) => e.trim()),
        domain_search: domainSearch.filter((ds) => ds.trim()),
        ping_check: capabilities?.fields.ping_check.supported && pingCheck,
        enable_failover: capabilities?.fields.enable_failover.supported && enableFailover,
        bootfile_name: capabilities?.fields.bootfile_name.supported ? (bootfileName.trim() || undefined) : undefined,
        bootfile_server: capabilities?.fields.bootfile_server.supported ? (bootfileServer.trim() || undefined) : undefined,
        tftp_server_name: capabilities?.fields.tftp_server_name.supported ? (tftpServerName.trim() || undefined) : undefined,
        time_servers: capabilities?.fields.time_servers.supported ? timeServers.filter((ts) => ts.trim()) : [],
        ntp_servers: capabilities?.fields.ntp_servers.supported ? ntpServers.filter((ntp) => ntp.trim()) : [],
        wins_servers: capabilities?.fields.wins_servers.supported ? winsServers.filter((wins) => wins.trim()) : [],
        time_offset: capabilities?.fields.time_offset.supported ? (timeOffset.trim() || undefined) : undefined,
        client_prefix_length: capabilities?.fields.client_prefix_length.supported ? (clientPrefixLength.trim() || undefined) : undefined,
        wpad_url: capabilities?.fields.wpad_url.supported ? (wpadUrl.trim() || undefined) : undefined,
      });

      handleClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to create DHCP server");
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for array management
  const addNameServer = () => setNameServers([...nameServers, ""]);
  const updateNameServer = (index: number, value: string) => {
    const updated = [...nameServers];
    updated[index] = value;
    setNameServers(updated);
  };
  const removeNameServer = (index: number) => {
    setNameServers(nameServers.filter((_, i) => i !== index));
  };

  const addDomainSearch = () => setDomainSearch([...domainSearch, ""]);
  const updateDomainSearch = (index: number, value: string) => {
    const updated = [...domainSearch];
    updated[index] = value;
    setDomainSearch(updated);
  };
  const removeDomainSearch = (index: number) => {
    setDomainSearch(domainSearch.filter((_, i) => i !== index));
  };

  const addRange = () => {
    const nextId = ranges.length.toString();
    setRanges([...ranges, { range_id: nextId, start: "", stop: "" }]);
  };
  const updateRange = (index: number, field: "start" | "stop", value: string) => {
    const updated = [...ranges];
    updated[index][field] = value;
    setRanges(updated);
  };
  const removeRange = (index: number) => {
    setRanges(ranges.filter((_, i) => i !== index));
  };

  const addExclude = () => setExcludes([...excludes, ""]);
  const updateExclude = (index: number, value: string) => {
    const updated = [...excludes];
    updated[index] = value;
    setExcludes(updated);
  };
  const removeExclude = (index: number) => {
    setExcludes(excludes.filter((_, i) => i !== index));
  };

  const addTimeServer = () => setTimeServers([...timeServers, ""]);
  const updateTimeServer = (index: number, value: string) => {
    const updated = [...timeServers];
    updated[index] = value;
    setTimeServers(updated);
  };
  const removeTimeServer = (index: number) => {
    setTimeServers(timeServers.filter((_, i) => i !== index));
  };

  const addNtpServer = () => setNtpServers([...ntpServers, ""]);
  const updateNtpServer = (index: number, value: string) => {
    const updated = [...ntpServers];
    updated[index] = value;
    setNtpServers(updated);
  };
  const removeNtpServer = (index: number) => {
    setNtpServers(ntpServers.filter((_, i) => i !== index));
  };

  const addWinsServer = () => setWinsServers([...winsServers, ""]);
  const updateWinsServer = (index: number, value: string) => {
    const updated = [...winsServers];
    updated[index] = value;
    setWinsServers(updated);
  };
  const removeWinsServer = (index: number) => {
    setWinsServers(winsServers.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === "new" ? "Create DHCP Server" : "Add DHCP Subnet"}
          </DialogTitle>
          <DialogDescription>
            {mode === "new"
              ? "Configure a new DHCP server with subnet and options"
              : "Add a new subnet to an existing DHCP shared network"
            }
          </DialogDescription>
        </DialogHeader>

        {/* Mode Selection - only show when not adding to existing network */}
        {!existingNetwork && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Mode</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="new"
                    checked={mode === "new"}
                    onChange={(e) => setMode(e.target.value as "new")}
                    className="text-primary"
                  />
                  <span className="text-sm">Create new shared network</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="existing"
                    checked={mode === "existing"}
                    onChange={(e) => setMode(e.target.value as "existing")}
                    className="text-primary"
                  />
                  <span className="text-sm">Add subnet to existing network</span>
                </label>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5 flex-shrink-0">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="dns">DNS</TabsTrigger>
            <TabsTrigger value="pool">DHCP Pool</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 pr-4 min-h-0">
            {/* Basic Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div>
                  <Label className="required">
                    Shared Network Name
                  </Label>
                  {mode === "new" ? (
                    <Input
                      value={networkName}
                      onChange={(e) => setNetworkName(e.target.value)}
                      placeholder="e.g., LAN"
                    />
                  ) : (
                    <select
                      value={selectedNetwork}
                      onChange={(e) => setSelectedNetwork(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select existing network...</option>
                      {existingNetworks.map((network) => (
                        <option key={network} value={network}>
                          {network}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {mode === "new"
                      ? "Logical group name for this DHCP configuration"
                      : "Select an existing shared network to add this subnet to"
                    }
                  </p>
                </div>

                <div>
                  <Label htmlFor="subnet" className="required">
                    Subnet (CIDR)
                  </Label>
                  <Input
                    id="subnet"
                    value={subnet}
                    onChange={(e) => setSubnet(e.target.value)}
                    placeholder="e.g., 192.168.1.0/24"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter subnet in CIDR notation (e.g., 192.168.1.0/24)
                  </p>
                </div>

                <div>
                  <Label htmlFor="defaultRouter" className="required">
                    Default Router (Gateway)
                  </Label>
                  <Input
                    id="defaultRouter"
                    value={defaultRouter}
                    onChange={(e) => setDefaultRouter(e.target.value)}
                    placeholder="e.g., 192.168.1.1"
                  />
                </div>

                <div>
                  <Label htmlFor="domainName" className="required">
                    Domain Name
                  </Label>
                  <Input
                    id="domainName"
                    value={domainName}
                    onChange={(e) => setDomainName(e.target.value)}
                    placeholder="e.g., local.lan"
                  />
                </div>

                <div>
                  <Label htmlFor="lease" className="required">
                    Lease Time (seconds)
                  </Label>
                  <Input
                    id="lease"
                    type="number"
                    value={lease}
                    onChange={(e) => setLease(e.target.value)}
                    placeholder="86400"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Default: 86400 (24 hours)
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* DNS Tab */}
            <TabsContent value="dns" className="space-y-4 mt-4">
              <div>
                <Label className="required">Name Servers (DNS)</Label>
                <div className="space-y-2 mt-2">
                  {nameServers.map((ns, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={ns}
                        onChange={(e) => updateNameServer(index, e.target.value)}
                        placeholder="e.g., 8.8.8.8"
                      />
                      {nameServers.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeNameServer(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addNameServer}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Name Server
                  </Button>
                </div>
              </div>

              <div>
                <Label>Domain Search List</Label>
                <div className="space-y-2 mt-2">
                  {domainSearch.map((ds, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={ds}
                        onChange={(e) => updateDomainSearch(index, e.target.value)}
                        placeholder="e.g., example.com"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeDomainSearch(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDomainSearch}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Domain Search
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* DHCP Pool Tab */}
            <TabsContent value="pool" className="space-y-4 mt-4">
              <div>
                <Label className="required">IP Address Ranges</Label>
                <div className="space-y-3 mt-2">
                  {ranges.map((range, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <Input
                            value={range.start}
                            onChange={(e) => updateRange(index, "start", e.target.value)}
                            placeholder="Start IP"
                          />
                        </div>
                        <div>
                          <Input
                            value={range.stop}
                            onChange={(e) => updateRange(index, "stop", e.target.value)}
                            placeholder="Stop IP"
                          />
                        </div>
                      </div>
                      {ranges.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeRange(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addRange}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Range
                  </Button>
                </div>
              </div>

              <div>
                <Label>Excluded Addresses</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  IP addresses to exclude from the DHCP pool
                </p>
                <div className="space-y-2">
                  {excludes.map((exclude, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={exclude}
                        onChange={(e) => updateExclude(index, e.target.value)}
                        placeholder="e.g., 192.168.1.50"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeExclude(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addExclude}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Exclude
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4 mt-4 pb-24">
              <div className="grid gap-4">
                {capabilities?.fields.bootfile_name.supported && (
                  <div>
                    <Label htmlFor="bootfileName">Bootfile Name</Label>
                    <Input
                      id="bootfileName"
                      value={bootfileName}
                      onChange={(e) => setBootfileName(e.target.value)}
                      placeholder="e.g., pxelinux.0"
                    />
                  </div>
                )}

                {capabilities?.fields.bootfile_server.supported && (
                  <div>
                    <Label htmlFor="bootfileServer">Bootfile Server</Label>
                    <Input
                      id="bootfileServer"
                      value={bootfileServer}
                      onChange={(e) => setBootfileServer(e.target.value)}
                      placeholder="e.g., 192.168.1.10"
                    />
                  </div>
                )}

                {capabilities?.fields.tftp_server_name.supported && (
                  <div>
                    <Label htmlFor="tftpServerName">TFTP Server Name</Label>
                    <Input
                      id="tftpServerName"
                      value={tftpServerName}
                      onChange={(e) => setTftpServerName(e.target.value)}
                      placeholder="e.g., tftp.local.lan"
                    />
                  </div>
                )}

                {capabilities?.fields.time_servers.supported && (
                  <div>
                    <Label>Time Servers</Label>
                  <div className="space-y-2 mt-2">
                    {timeServers.map((ts, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={ts}
                          onChange={(e) => updateTimeServer(index, e.target.value)}
                          placeholder="e.g., 192.168.1.1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeTimeServer(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTimeServer}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Time Server
                    </Button>
                  </div>
                  </div>
                )}

                {capabilities?.fields.ntp_servers.supported && (
                  <div>
                    <Label>NTP Servers (IP Address Only)</Label>
                    <div className="space-y-2 mt-2">
                    {ntpServers.map((ntp, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={ntp}
                          onChange={(e) => updateNtpServer(index, e.target.value)}
                          placeholder="e.g., 192.168.1.1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeNtpServer(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addNtpServer}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add NTP Server
                    </Button>
                  </div>
                  </div>
                )}

                {capabilities?.fields.wins_servers.supported && (
                  <div>
                    <Label>WINS Servers</Label>
                    <div className="space-y-2 mt-2">
                    {winsServers.map((wins, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={wins}
                          onChange={(e) => updateWinsServer(index, e.target.value)}
                          placeholder="e.g., 192.168.1.2"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeWinsServer(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addWinsServer}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add WINS Server
                    </Button>
                  </div>
                  </div>
                )}

                {capabilities?.fields.time_offset.supported && (
                  <div>
                    <Label htmlFor="timeOffset">Time Offset (seconds)</Label>
                    <Input
                      id="timeOffset"
                      value={timeOffset}
                      onChange={(e) => setTimeOffset(e.target.value)}
                      placeholder="e.g., -18000 for EST"
                    />
                  </div>
                )}

                {capabilities?.fields.client_prefix_length.supported && (
                  <div>
                    <Label htmlFor="clientPrefixLength">Client Prefix Length</Label>
                    <Input
                      id="clientPrefixLength"
                      value={clientPrefixLength}
                      onChange={(e) => setClientPrefixLength(e.target.value)}
                      placeholder="e.g., 24"
                    />
                  </div>
                )}

                {capabilities?.fields.wpad_url.supported && (
                  <div>
                    <Label htmlFor="wpadUrl">WPAD URL</Label>
                    <Input
                      id="wpadUrl"
                      value={wpadUrl}
                      onChange={(e) => setWpadUrl(e.target.value)}
                      placeholder="e.g., http://wpad.local.lan/wpad.dat"
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Options Tab */}
            <TabsContent value="options" className="space-y-4 mt-4">
              <div className="space-y-4">
                {capabilities?.fields.ping_check.supported && (
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="pingCheck"
                      checked={pingCheck}
                      onCheckedChange={(checked) => setPingCheck(checked as boolean)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="pingCheck" className="cursor-pointer">
                        Ping Check
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Test IP addresses with ICMP ping before lease assignment
                      </p>
                    </div>
                  </div>
                )}

                {capabilities?.fields.enable_failover.supported && (
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="enableFailover"
                      checked={enableFailover}
                      onCheckedChange={(checked) => setEnableFailover(checked as boolean)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="enableFailover" className="cursor-pointer">
                        Enable Failover
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Enable high availability for this subnet (VyOS 1.4 only)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create DHCP Server"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
