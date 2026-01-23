"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Globe, Plus, X } from "lucide-react";
import { dnsForwardingService, type DNSForwardingConfig, type DNSCapabilities, type DNSOperation } from "@/lib/api/dns";
import { useToast } from "@/hooks/useToast";
import { Badge } from "@/components/ui/badge";

interface DNSEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: DNSForwardingConfig;
}

export function DNSEditModal({
  open,
  onOpenChange,
  onSuccess,
  config,
}: DNSEditModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [capabilities, setCapabilities] = useState<DNSCapabilities | null>(null);

  // Form state
  const [listenAddresses, setListenAddresses] = useState<string[]>([]);
  const [allowFrom, setAllowFrom] = useState<string[]>([]);
  const [nameServers, setNameServers] = useState<string[]>([]);
  const [cacheSize, setCacheSize] = useState("");
  const [negativeTtl, setNegativeTtl] = useState("");
  const [queryTimeout, setQueryTimeout] = useState("");
  const [dnssec, setDnssec] = useState("");
  const [useSystem, setUseSystem] = useState(false);
  const [ignoreHostsFile, setIgnoreHostsFile] = useState(false);
  const [noServeRfc1918, setNoServeRfc1918] = useState(false);

  // Input fields for adding new items
  const [newListenAddr, setNewListenAddr] = useState("");
  const [newAllowFrom, setNewAllowFrom] = useState("");
  const [newNameServer, setNewNameServer] = useState("");

  useEffect(() => {
    if (open) {
      // Load capabilities
      dnsForwardingService.getCapabilities().then(setCapabilities).catch(console.error);

      // Initialize form with current config
      setListenAddresses([...config.listen_addresses]);
      setAllowFrom([...config.allow_from]);
      setNameServers(config.name_servers.map(ns => ns.address));
      setCacheSize(config.cache_size || "");
      setNegativeTtl(config.negative_ttl || "");
      setQueryTimeout(config.timeout || "");
      setDnssec(config.dnssec || "__none__");
      setUseSystem(config.system);
      setIgnoreHostsFile(config.ignore_hosts_file);
      setNoServeRfc1918(config.no_serve_rfc1918);
    }
  }, [open, config]);

  const handleAddListenAddr = () => {
    if (newListenAddr.trim() && !listenAddresses.includes(newListenAddr.trim())) {
      setListenAddresses([...listenAddresses, newListenAddr.trim()]);
      setNewListenAddr("");
    }
  };

  const handleRemoveListenAddr = (addr: string) => {
    setListenAddresses(listenAddresses.filter(a => a !== addr));
  };

  const handleAddAllowFrom = () => {
    if (newAllowFrom.trim() && !allowFrom.includes(newAllowFrom.trim())) {
      setAllowFrom([...allowFrom, newAllowFrom.trim()]);
      setNewAllowFrom("");
    }
  };

  const handleRemoveAllowFrom = (network: string) => {
    setAllowFrom(allowFrom.filter(n => n !== network));
  };

  const handleAddNameServer = () => {
    if (newNameServer.trim() && !nameServers.includes(newNameServer.trim())) {
      setNameServers([...nameServers, newNameServer.trim()]);
      setNewNameServer("");
    }
  };

  const handleRemoveNameServer = (server: string) => {
    setNameServers(nameServers.filter(s => s !== server));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const operations: DNSOperation[] = [];

      // Handle listen addresses
      const currentListenAddrs = new Set(config.listen_addresses);
      const newListenAddrs = new Set(listenAddresses);

      for (const addr of config.listen_addresses) {
        if (!newListenAddrs.has(addr)) {
          operations.push({ op: "delete_listen_address", address: addr });
        }
      }
      for (const addr of listenAddresses) {
        if (!currentListenAddrs.has(addr)) {
          operations.push({ op: "add_listen_address", address: addr });
        }
      }

      // Handle allow from networks
      const currentAllowFrom = new Set(config.allow_from);
      const newAllowFromSet = new Set(allowFrom);

      for (const network of config.allow_from) {
        if (!newAllowFromSet.has(network)) {
          operations.push({ op: "delete_allow_from", network });
        }
      }
      for (const network of allowFrom) {
        if (!currentAllowFrom.has(network)) {
          operations.push({ op: "add_allow_from", network });
        }
      }

      // Handle name servers
      const currentNameServers = new Set(config.name_servers.map(ns => ns.address));
      const newNameServersSet = new Set(nameServers);

      for (const ns of config.name_servers) {
        if (!newNameServersSet.has(ns.address)) {
          operations.push({ op: "delete_name_server", address: ns.address });
        }
      }
      for (const server of nameServers) {
        if (!currentNameServers.has(server)) {
          operations.push({ op: "add_name_server", address: server });
        }
      }

      // Handle cache settings
      if (cacheSize && cacheSize !== config.cache_size) {
        operations.push({ op: "set_cache_size", value: parseInt(cacheSize) });
      }
      if (negativeTtl && negativeTtl !== config.negative_ttl) {
        operations.push({ op: "set_negative_ttl", value: parseInt(negativeTtl) });
      }
      if (queryTimeout && queryTimeout !== config.timeout) {
        operations.push({ op: "set_timeout", value: parseInt(queryTimeout) });
      }

      // Handle DNSSEC
      const effectiveDnssec = dnssec === "__none__" ? "" : dnssec;
      if (effectiveDnssec !== (config.dnssec || "")) {
        if (effectiveDnssec) {
          operations.push({ op: "set_dnssec", value: effectiveDnssec });
        } else if (config.dnssec) {
          operations.push({ op: "delete_dnssec" });
        }
      }

      // Handle system nameservers toggle
      if (useSystem !== config.system) {
        operations.push({ op: useSystem ? "enable_system" : "disable_system" });
      }

      // Handle ignore hosts file toggle
      if (ignoreHostsFile !== config.ignore_hosts_file) {
        operations.push({ op: ignoreHostsFile ? "enable_ignore_hosts_file" : "disable_ignore_hosts_file" });
      }

      // Handle no serve RFC1918 toggle
      if (noServeRfc1918 !== config.no_serve_rfc1918) {
        operations.push({ op: noServeRfc1918 ? "enable_no_serve_rfc1918" : "disable_no_serve_rfc1918" });
      }

      if (operations.length === 0) {
        toast.info("No Changes", "No changes were made to the configuration");
        onOpenChange(false);
        return;
      }

      const response = await dnsForwardingService.configureBatch({ operations });

      if (response.success) {
        toast.success("DNS Updated", "DNS forwarding configuration has been updated");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error("Update Failed", response.error || "Unknown error");
      }
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Failed to update DNS configuration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-green-500" />
            Edit DNS Forwarding Settings
          </DialogTitle>
          <DialogDescription>
            Configure DNS forwarding service settings
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Listen Addresses */}
            <div className="space-y-3">
              <Label>Listen Addresses</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., 192.168.1.1"
                  value={newListenAddr}
                  onChange={(e) => setNewListenAddr(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddListenAddr())}
                  disabled={loading}
                />
                <Button type="button" variant="outline" size="icon" onClick={handleAddListenAddr} disabled={loading}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {listenAddresses.map((addr) => (
                  <Badge key={addr} variant="secondary" className="font-mono">
                    {addr}
                    <button
                      type="button"
                      onClick={() => handleRemoveListenAddr(addr)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Allow From Networks */}
            <div className="space-y-3">
              <Label>Allow From Networks</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., 192.168.0.0/16"
                  value={newAllowFrom}
                  onChange={(e) => setNewAllowFrom(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAllowFrom())}
                  disabled={loading}
                />
                <Button type="button" variant="outline" size="icon" onClick={handleAddAllowFrom} disabled={loading}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {allowFrom.map((network) => (
                  <Badge key={network} variant="secondary" className="font-mono">
                    {network}
                    <button
                      type="button"
                      onClick={() => handleRemoveAllowFrom(network)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Name Servers */}
            <div className="space-y-3">
              <Label>Name Servers</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., 8.8.8.8"
                  value={newNameServer}
                  onChange={(e) => setNewNameServer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddNameServer())}
                  disabled={loading}
                />
                <Button type="button" variant="outline" size="icon" onClick={handleAddNameServer} disabled={loading}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {nameServers.map((server) => (
                  <Badge key={server} variant="secondary" className="font-mono">
                    {server}
                    <button
                      type="button"
                      onClick={() => handleRemoveNameServer(server)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Cache & Performance */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cache Size</Label>
                <Input
                  type="number"
                  placeholder={capabilities?.defaults.cache_size.toString() || "10000"}
                  value={cacheSize}
                  onChange={(e) => setCacheSize(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label>Negative TTL</Label>
                <Input
                  type="number"
                  placeholder={capabilities?.defaults.negative_ttl.toString() || "3600"}
                  value={negativeTtl}
                  onChange={(e) => setNegativeTtl(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label>Timeout</Label>
                <Input
                  type="number"
                  placeholder={capabilities?.defaults.timeout.toString() || "750"}
                  value={queryTimeout}
                  onChange={(e) => setQueryTimeout(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* DNSSEC */}
            <div className="space-y-2">
              <Label>DNSSEC</Label>
              <Select value={dnssec} onValueChange={setDnssec} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select DNSSEC mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Disabled</SelectItem>
                  {capabilities?.dnssec_modes.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  )) || (
                    <>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="process">Process</SelectItem>
                      <SelectItem value="process-no-validate">Process (No Validate)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Toggles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Use System Nameservers</Label>
                  <p className="text-xs text-muted-foreground">
                    Use nameservers from system configuration
                  </p>
                </div>
                <Switch
                  checked={useSystem}
                  onCheckedChange={setUseSystem}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Ignore Hosts File</Label>
                  <p className="text-xs text-muted-foreground">
                    Do not use /etc/hosts for name resolution
                  </p>
                </div>
                <Switch
                  checked={ignoreHostsFile}
                  onCheckedChange={setIgnoreHostsFile}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>No RFC1918 Responses</Label>
                  <p className="text-xs text-muted-foreground">
                    Do not return private IP addresses in DNS responses
                  </p>
                </div>
                <Switch
                  checked={noServeRfc1918}
                  onCheckedChange={setNoServeRfc1918}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
