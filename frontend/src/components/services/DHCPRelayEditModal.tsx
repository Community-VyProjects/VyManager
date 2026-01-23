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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Server, Plus, X } from "lucide-react";
import { dhcpRelayService, type DHCPRelayFullConfig, type DHCPRelayCapabilities, type DHCPRelayOperation } from "@/lib/api/dhcp-relay";
import { useToast } from "@/hooks/useToast";
import { Badge } from "@/components/ui/badge";

interface DHCPRelayEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: DHCPRelayFullConfig;
}

export function DHCPRelayEditModal({
  open,
  onOpenChange,
  onSuccess,
  config,
}: DHCPRelayEditModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [capabilities, setCapabilities] = useState<DHCPRelayCapabilities | null>(null);

  // DHCPv4 form state
  const [servers, setServers] = useState<string[]>([]);
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [listenInterfaces, setListenInterfaces] = useState<string[]>([]);
  const [upstreamInterfaces, setUpstreamInterfaces] = useState<string[]>([]);
  const [hopCount, setHopCount] = useState("");
  const [maxSize, setMaxSize] = useState("");
  const [relayAgentsPackets, setRelayAgentsPackets] = useState("");

  // DHCPv6 form state
  const [v6ListenInterfaces, setV6ListenInterfaces] = useState<{ interface: string; address?: string }[]>([]);
  const [v6UpstreamInterfaces, setV6UpstreamInterfaces] = useState<{ interface: string; address?: string }[]>([]);
  const [v6MaxHopCount, setV6MaxHopCount] = useState("");
  const [v6UseInterfaceIdOption, setV6UseInterfaceIdOption] = useState(false);

  // Input fields
  const [newServer, setNewServer] = useState("");
  const [newInterface, setNewInterface] = useState("");
  const [newListenInterface, setNewListenInterface] = useState("");
  const [newUpstreamInterface, setNewUpstreamInterface] = useState("");
  const [newV6ListenInterface, setNewV6ListenInterface] = useState("");
  const [newV6ListenAddress, setNewV6ListenAddress] = useState("");
  const [newV6UpstreamInterface, setNewV6UpstreamInterface] = useState("");
  const [newV6UpstreamAddress, setNewV6UpstreamAddress] = useState("");

  useEffect(() => {
    if (open) {
      // Load capabilities
      dhcpRelayService.getCapabilities().then(setCapabilities).catch(console.error);

      // Initialize DHCPv4 form
      setServers([...config.dhcp_relay.servers]);
      setInterfaces([...config.dhcp_relay.interfaces]);
      setListenInterfaces([...config.dhcp_relay.listen_interfaces]);
      setUpstreamInterfaces([...config.dhcp_relay.upstream_interfaces]);
      setHopCount(config.dhcp_relay.relay_options?.hop_count || "");
      setMaxSize(config.dhcp_relay.relay_options?.max_size || "");
      setRelayAgentsPackets(config.dhcp_relay.relay_options?.relay_agents_packets || "__none__");

      // Initialize DHCPv6 form
      setV6ListenInterfaces([...config.dhcpv6_relay.listen_interfaces]);
      setV6UpstreamInterfaces([...config.dhcpv6_relay.upstream_interfaces]);
      setV6MaxHopCount(config.dhcpv6_relay.max_hop_count || "");
      setV6UseInterfaceIdOption(config.dhcpv6_relay.use_interface_id_option);
    }
  }, [open, config]);

  const handleAddToList = (
    value: string,
    list: string[],
    setList: (v: string[]) => void,
    setValue: (v: string) => void
  ) => {
    if (value.trim() && !list.includes(value.trim())) {
      setList([...list, value.trim()]);
      setValue("");
    }
  };

  const handleRemoveFromList = (value: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.filter(v => v !== value));
  };

  const handleAddV6Listen = () => {
    if (newV6ListenInterface.trim() && !v6ListenInterfaces.some(i => i.interface === newV6ListenInterface.trim())) {
      setV6ListenInterfaces([...v6ListenInterfaces, {
        interface: newV6ListenInterface.trim(),
        address: newV6ListenAddress.trim() || undefined,
      }]);
      setNewV6ListenInterface("");
      setNewV6ListenAddress("");
    }
  };

  const handleRemoveV6Listen = (iface: string) => {
    setV6ListenInterfaces(v6ListenInterfaces.filter(i => i.interface !== iface));
  };

  const handleAddV6Upstream = () => {
    if (newV6UpstreamInterface.trim() && !v6UpstreamInterfaces.some(i => i.interface === newV6UpstreamInterface.trim())) {
      setV6UpstreamInterfaces([...v6UpstreamInterfaces, {
        interface: newV6UpstreamInterface.trim(),
        address: newV6UpstreamAddress.trim() || undefined,
      }]);
      setNewV6UpstreamInterface("");
      setNewV6UpstreamAddress("");
    }
  };

  const handleRemoveV6Upstream = (iface: string) => {
    setV6UpstreamInterfaces(v6UpstreamInterfaces.filter(i => i.interface !== iface));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const operations: DHCPRelayOperation[] = [];

      // Handle DHCPv4 servers
      const currentServers = new Set(config.dhcp_relay.servers);
      const newServersSet = new Set(servers);

      for (const server of config.dhcp_relay.servers) {
        if (!newServersSet.has(server)) {
          operations.push({ op: "delete_server", server });
        }
      }
      for (const server of servers) {
        if (!currentServers.has(server)) {
          operations.push({ op: "add_server", server });
        }
      }

      // Handle DHCPv4 interfaces
      const currentInterfaces = new Set(config.dhcp_relay.interfaces);
      const newInterfacesSet = new Set(interfaces);

      for (const iface of config.dhcp_relay.interfaces) {
        if (!newInterfacesSet.has(iface)) {
          operations.push({ op: "delete_interface", interface: iface });
        }
      }
      for (const iface of interfaces) {
        if (!currentInterfaces.has(iface)) {
          operations.push({ op: "add_interface", interface: iface });
        }
      }

      // Handle DHCPv4 listen interfaces
      const currentListenInterfaces = new Set(config.dhcp_relay.listen_interfaces);
      const newListenInterfacesSet = new Set(listenInterfaces);

      for (const iface of config.dhcp_relay.listen_interfaces) {
        if (!newListenInterfacesSet.has(iface)) {
          operations.push({ op: "delete_listen_interface", interface: iface });
        }
      }
      for (const iface of listenInterfaces) {
        if (!currentListenInterfaces.has(iface)) {
          operations.push({ op: "add_listen_interface", interface: iface });
        }
      }

      // Handle DHCPv4 upstream interfaces
      const currentUpstreamInterfaces = new Set(config.dhcp_relay.upstream_interfaces);
      const newUpstreamInterfacesSet = new Set(upstreamInterfaces);

      for (const iface of config.dhcp_relay.upstream_interfaces) {
        if (!newUpstreamInterfacesSet.has(iface)) {
          operations.push({ op: "delete_upstream_interface", interface: iface });
        }
      }
      for (const iface of upstreamInterfaces) {
        if (!currentUpstreamInterfaces.has(iface)) {
          operations.push({ op: "add_upstream_interface", interface: iface });
        }
      }

      // Handle DHCPv4 relay options
      if (hopCount !== (config.dhcp_relay.relay_options?.hop_count || "")) {
        if (hopCount) {
          operations.push({ op: "set_hop_count", value: parseInt(hopCount) });
        } else if (config.dhcp_relay.relay_options?.hop_count) {
          operations.push({ op: "delete_hop_count" });
        }
      }

      if (maxSize !== (config.dhcp_relay.relay_options?.max_size || "")) {
        if (maxSize) {
          operations.push({ op: "set_max_size", value: parseInt(maxSize) });
        } else if (config.dhcp_relay.relay_options?.max_size) {
          operations.push({ op: "delete_max_size" });
        }
      }

      const effectiveRelayAgentsPackets = relayAgentsPackets === "__none__" ? "" : relayAgentsPackets;
      if (effectiveRelayAgentsPackets !== (config.dhcp_relay.relay_options?.relay_agents_packets || "")) {
        if (effectiveRelayAgentsPackets) {
          operations.push({ op: "set_relay_agents_packets", action: effectiveRelayAgentsPackets });
        } else if (config.dhcp_relay.relay_options?.relay_agents_packets) {
          operations.push({ op: "delete_relay_agents_packets" });
        }
      }

      // Handle DHCPv6 listen interfaces
      const currentV6Listen = new Map(config.dhcpv6_relay.listen_interfaces.map(i => [i.interface, i]));
      const newV6ListenMap = new Map(v6ListenInterfaces.map(i => [i.interface, i]));

      for (const entry of config.dhcpv6_relay.listen_interfaces) {
        if (!newV6ListenMap.has(entry.interface)) {
          operations.push({ op: "delete_v6_listen_interface", interface: entry.interface });
        }
      }
      for (const entry of v6ListenInterfaces) {
        if (!currentV6Listen.has(entry.interface)) {
          operations.push({ op: "add_v6_listen_interface", interface: entry.interface, address: entry.address });
        }
      }

      // Handle DHCPv6 upstream interfaces
      const currentV6Upstream = new Map(config.dhcpv6_relay.upstream_interfaces.map(i => [i.interface, i]));
      const newV6UpstreamMap = new Map(v6UpstreamInterfaces.map(i => [i.interface, i]));

      for (const entry of config.dhcpv6_relay.upstream_interfaces) {
        if (!newV6UpstreamMap.has(entry.interface)) {
          operations.push({ op: "delete_v6_upstream_interface", interface: entry.interface });
        }
      }
      for (const entry of v6UpstreamInterfaces) {
        if (!currentV6Upstream.has(entry.interface)) {
          operations.push({ op: "add_v6_upstream_interface", interface: entry.interface, address: entry.address });
        }
      }

      // Handle DHCPv6 max hop count
      if (v6MaxHopCount !== (config.dhcpv6_relay.max_hop_count || "")) {
        if (v6MaxHopCount) {
          operations.push({ op: "set_v6_max_hop_count", value: parseInt(v6MaxHopCount) });
        } else if (config.dhcpv6_relay.max_hop_count) {
          operations.push({ op: "delete_v6_max_hop_count" });
        }
      }

      // Handle DHCPv6 interface ID option
      if (v6UseInterfaceIdOption !== config.dhcpv6_relay.use_interface_id_option) {
        operations.push({ op: v6UseInterfaceIdOption ? "enable_v6_interface_id_option" : "disable_v6_interface_id_option" });
      }

      if (operations.length === 0) {
        toast.info("No Changes", "No changes were made to the configuration");
        onOpenChange(false);
        return;
      }

      const response = await dhcpRelayService.configureBatch({ operations });

      if (response.success) {
        toast.success("DHCP Relay Updated", "DHCP relay configuration has been updated");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error("Update Failed", response.error || "Unknown error");
      }
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Failed to update DHCP relay configuration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-orange-500" />
            Edit DHCP Relay Settings
          </DialogTitle>
          <DialogDescription>
            Configure DHCP relay service for IPv4 and IPv6
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="dhcpv4" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dhcpv4">DHCPv4</TabsTrigger>
              <TabsTrigger value="dhcpv6">DHCPv6</TabsTrigger>
            </TabsList>

            <TabsContent value="dhcpv4" className="space-y-4 pt-4">
              {/* DHCP Servers */}
              <div className="space-y-3">
                <Label>DHCP Servers</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., 192.168.1.10"
                    value={newServer}
                    onChange={(e) => setNewServer(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddToList(newServer, servers, setServers, setNewServer))}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleAddToList(newServer, servers, setServers, setNewServer)}
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {servers.map((server) => (
                    <Badge key={server} variant="secondary" className="font-mono">
                      {server}
                      <button
                        type="button"
                        onClick={() => handleRemoveFromList(server, servers, setServers)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Relay Interfaces */}
              <div className="space-y-3">
                <Label>Relay Interfaces</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., eth0"
                    value={newInterface}
                    onChange={(e) => setNewInterface(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddToList(newInterface, interfaces, setInterfaces, setNewInterface))}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleAddToList(newInterface, interfaces, setInterfaces, setNewInterface)}
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {interfaces.map((iface) => (
                    <Badge key={iface} variant="secondary" className="font-mono">
                      {iface}
                      <button
                        type="button"
                        onClick={() => handleRemoveFromList(iface, interfaces, setInterfaces)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Listen Interfaces */}
              <div className="space-y-3">
                <Label>Listen Interfaces</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., eth1"
                    value={newListenInterface}
                    onChange={(e) => setNewListenInterface(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddToList(newListenInterface, listenInterfaces, setListenInterfaces, setNewListenInterface))}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleAddToList(newListenInterface, listenInterfaces, setListenInterfaces, setNewListenInterface)}
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {listenInterfaces.map((iface) => (
                    <Badge key={iface} variant="secondary" className="font-mono">
                      {iface}
                      <button
                        type="button"
                        onClick={() => handleRemoveFromList(iface, listenInterfaces, setListenInterfaces)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Upstream Interfaces */}
              <div className="space-y-3">
                <Label>Upstream Interfaces</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., eth0"
                    value={newUpstreamInterface}
                    onChange={(e) => setNewUpstreamInterface(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddToList(newUpstreamInterface, upstreamInterfaces, setUpstreamInterfaces, setNewUpstreamInterface))}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleAddToList(newUpstreamInterface, upstreamInterfaces, setUpstreamInterfaces, setNewUpstreamInterface)}
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {upstreamInterfaces.map((iface) => (
                    <Badge key={iface} variant="secondary" className="font-mono">
                      {iface}
                      <button
                        type="button"
                        onClick={() => handleRemoveFromList(iface, upstreamInterfaces, setUpstreamInterfaces)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Relay Options */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Hop Count</Label>
                  <Input
                    type="number"
                    placeholder={capabilities?.defaults.hop_count.toString() || "10"}
                    value={hopCount}
                    onChange={(e) => setHopCount(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Size</Label>
                  <Input
                    type="number"
                    placeholder={capabilities?.defaults.max_size.toString() || "576"}
                    value={maxSize}
                    onChange={(e) => setMaxSize(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Relay Agents Packets</Label>
                  <Select value={relayAgentsPackets} onValueChange={setRelayAgentsPackets} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Default</SelectItem>
                      {capabilities?.relay_agents_packets_options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      )) || (
                        <>
                          <SelectItem value="forward">Forward</SelectItem>
                          <SelectItem value="replace">Replace</SelectItem>
                          <SelectItem value="append">Append</SelectItem>
                          <SelectItem value="discard">Discard</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="dhcpv6" className="space-y-4 pt-4">
              {/* DHCPv6 Listen Interfaces */}
              <div className="space-y-3">
                <Label>Listen Interfaces</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Interface (e.g., eth1)"
                    value={newV6ListenInterface}
                    onChange={(e) => setNewV6ListenInterface(e.target.value)}
                    disabled={loading}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Address (optional)"
                    value={newV6ListenAddress}
                    onChange={(e) => setNewV6ListenAddress(e.target.value)}
                    disabled={loading}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddV6Listen}
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {v6ListenInterfaces.map((entry) => (
                    <div key={entry.interface} className="flex items-center justify-between p-2 rounded-md bg-accent/50">
                      <div>
                        <code className="font-mono text-sm">{entry.interface}</code>
                        {entry.address && (
                          <span className="text-xs text-muted-foreground ml-2">({entry.address})</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveV6Listen(entry.interface)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* DHCPv6 Upstream Interfaces */}
              <div className="space-y-3">
                <Label>Upstream Interfaces</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Interface (e.g., eth0)"
                    value={newV6UpstreamInterface}
                    onChange={(e) => setNewV6UpstreamInterface(e.target.value)}
                    disabled={loading}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Address (optional)"
                    value={newV6UpstreamAddress}
                    onChange={(e) => setNewV6UpstreamAddress(e.target.value)}
                    disabled={loading}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddV6Upstream}
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {v6UpstreamInterfaces.map((entry) => (
                    <div key={entry.interface} className="flex items-center justify-between p-2 rounded-md bg-accent/50">
                      <div>
                        <code className="font-mono text-sm">{entry.interface}</code>
                        {entry.address && (
                          <span className="text-xs text-muted-foreground ml-2">({entry.address})</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveV6Upstream(entry.interface)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* DHCPv6 Options */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Hop Count</Label>
                  <Input
                    type="number"
                    placeholder={capabilities?.defaults.dhcpv6_max_hop_count.toString() || "10"}
                    value={v6MaxHopCount}
                    onChange={(e) => setV6MaxHopCount(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="text-sm">Use Interface ID Option</Label>
                  </div>
                  <Switch
                    checked={v6UseInterfaceIdOption}
                    onCheckedChange={setV6UseInterfaceIdOption}
                    disabled={loading}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
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
