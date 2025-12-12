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
import {
  dhcpService,
  type DHCPCapabilitiesResponse,
  type DHCPSubnet,
  type DHCPRange,
} from "@/lib/api/dhcp";
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

interface EditDHCPServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: DHCPCapabilitiesResponse | null;
  networkName: string;
  subnet: DHCPSubnet;
}

export function EditDHCPServerModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  networkName,
  subnet,
}: EditDHCPServerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic fields
  const [defaultRouter, setDefaultRouter] = useState("");
  const [domainName, setDomainName] = useState("");
  const [lease, setLease] = useState("");

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
    if (open && subnet) {
      loadSubnetData();
    }
  }, [open, subnet]);

  const loadSubnetData = () => {
    // Basic fields
    setDefaultRouter(subnet.default_router || "");
    setDomainName(subnet.domain_name || "");
    setLease(subnet.lease || "");

    // DNS fields
    setNameServers(subnet.name_servers.length > 0 ? subnet.name_servers : [""]);
    setDomainSearch(subnet.domain_search.length > 0 ? subnet.domain_search : []);

    // DHCP Pool fields
    setRanges(
      subnet.ranges.length > 0
        ? subnet.ranges
        : [{ range_id: "0", start: "", stop: "" }]
    );
    setExcludes(subnet.excludes.length > 0 ? subnet.excludes : []);

    // Advanced options
    setBootfileName(subnet.bootfile_name || "");
    setBootfileServer(subnet.bootfile_server || "");
    setTftpServerName(subnet.tftp_server_name || "");
    setTimeServers(subnet.time_servers.length > 0 ? subnet.time_servers : []);
    setNtpServers(subnet.ntp_servers.length > 0 ? subnet.ntp_servers : []);
    setWinsServers(subnet.wins_servers.length > 0 ? subnet.wins_servers : []);
    setTimeOffset(subnet.time_offset || "");
    setClientPrefixLength(subnet.client_prefix_length || "");
    setWpadUrl(subnet.wpad_url || "");

    // Options
    setPingCheck(subnet.ping_check);
    setEnableFailover(subnet.enable_failover);

    setError(null);
  };

  const resetForm = () => {
    loadSubnetData();
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): boolean => {
    // Default router validation
    if (!defaultRouter.trim()) {
      setError("Default router (gateway) is required");
      return false;
    }
    if (!isValidIPv4(defaultRouter.trim())) {
      setError("Invalid default router IP address");
      return false;
    }
    if (!isIPInSubnet(defaultRouter.trim(), subnet.subnet)) {
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
      if (!isValidIPRange(start, stop, subnet.subnet)) {
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
      if (!isIPInSubnet(exclude.trim(), subnet.subnet)) {
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
      await dhcpService.updateSubnet({
        network_name: networkName,
        subnet: subnet.subnet,
        // Basic fields - always set if they have values
        default_router: defaultRouter.trim() || undefined,
        name_servers: nameServers.filter((ns) => ns.trim()),
        domain_name: domainName.trim() || undefined,
        lease: lease.trim() || undefined,
        ranges: ranges.filter((r) => r.start && r.stop),
        excludes: excludes.filter((e) => e.trim()),
        domain_search: domainSearch.filter((ds) => ds.trim()),

        // Advanced options - delete if empty, set if has value
        bootfile_name: capabilities?.fields.bootfile_name.supported ? (bootfileName.trim() || undefined) : undefined,
        bootfile_server: capabilities?.fields.bootfile_server.supported ? (bootfileServer.trim() || undefined) : undefined,
        tftp_server_name: capabilities?.fields.tftp_server_name.supported ? (tftpServerName.trim() || undefined) : undefined,
        time_servers: capabilities?.fields.time_servers.supported ? timeServers.filter((ts) => ts.trim()) : [],
        ntp_servers: capabilities?.fields.ntp_servers.supported ? ntpServers.filter((ntp) => ntp.trim()) : [],
        wins_servers: capabilities?.fields.wins_servers.supported ? winsServers.filter((wins) => wins.trim()) : [],
        time_offset: capabilities?.fields.time_offset.supported ? (timeOffset.trim() || undefined) : undefined,
        client_prefix_length: capabilities?.fields.client_prefix_length.supported ? (clientPrefixLength.trim() || undefined) : undefined,
        wpad_url: capabilities?.fields.wpad_url.supported ? (wpadUrl.trim() || undefined) : undefined,

        // Delete flags for empty advanced options
        delete_bootfile_name: capabilities?.fields.bootfile_name.supported && !bootfileName.trim() && !!subnet.bootfile_name,
        delete_bootfile_server: capabilities?.fields.bootfile_server.supported && !bootfileServer.trim() && !!subnet.bootfile_server,
        delete_tftp_server_name: capabilities?.fields.tftp_server_name.supported && !tftpServerName.trim() && !!subnet.tftp_server_name,
        delete_time_offset: capabilities?.fields.time_offset.supported && !timeOffset.trim() && !!subnet.time_offset,
        delete_client_prefix_length: capabilities?.fields.client_prefix_length.supported && !clientPrefixLength.trim() && !!subnet.client_prefix_length,
        delete_wpad_url: capabilities?.fields.wpad_url.supported && !wpadUrl.trim() && !!subnet.wpad_url,

        // Options - set if true, delete if false
        ping_check: capabilities?.fields.ping_check.supported && pingCheck ? true : undefined,
        enable_failover: capabilities?.fields.enable_failover.supported && enableFailover ? true : undefined,
        delete_ping_check: capabilities?.fields.ping_check.supported && !pingCheck && subnet.ping_check,
        delete_enable_failover: capabilities?.fields.enable_failover.supported && !enableFailover && subnet.enable_failover,
      });

      handleClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to update DHCP server");
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
          <DialogTitle>Edit DHCP Server</DialogTitle>
          <DialogDescription>
            Update configuration for subnet {subnet.subnet} in network {networkName}
          </DialogDescription>
        </DialogHeader>

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
                  <Label>Shared Network Name</Label>
                  <Input value={networkName} disabled />
                  <p className="text-xs text-muted-foreground mt-1">
                    Cannot be changed (delete and recreate to move)
                  </p>
                </div>

                <div>
                  <Label>Subnet (CIDR)</Label>
                  <Input value={subnet.subnet} disabled />
                  <p className="text-xs text-muted-foreground mt-1">
                    Cannot be changed
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
                  {domainSearch.length === 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addDomainSearch}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Domain Search
                    </Button>
                  ) : (
                    <>
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
                    </>
                  )}
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
                  {excludes.length === 0 ? (
                    <Button type="button" variant="outline" size="sm" onClick={addExclude}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Exclude
                    </Button>
                  ) : (
                    <>
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
                    </>
                  )}
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
                    {timeServers.length === 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addTimeServer}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Time Server
                      </Button>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                  </div>
                )}

                {capabilities?.fields.ntp_servers.supported && (
                  <div>
                    <Label>NTP Servers (IP Address Only)</Label>
                    <div className="space-y-2 mt-2">
                    {ntpServers.length === 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addNtpServer}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add NTP Server
                      </Button>
                    ) : (
                      <>
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
                      </>
                    )}
                    </div>
                  </div>
                )}

                {capabilities?.fields.wins_servers.supported && (
                  <div>
                    <Label>WINS Servers</Label>
                    <div className="space-y-2 mt-2">
                    {winsServers.length === 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addWinsServer}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add WINS Server
                      </Button>
                    ) : (
                      <>
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
                      </>
                    )}
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
            {loading ? "Updating..." : "Update DHCP Server"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
