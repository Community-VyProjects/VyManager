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
import { Loader2, Clock, Plus, X, Star } from "lucide-react";
import { ntpService, type NTPConfig, type NTPCapabilities, type NTPOperation } from "@/lib/api/ntp";
import { useToast } from "@/hooks/useToast";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface NTPEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: NTPConfig;
}

interface ServerEntry {
  address: string;
  pool: boolean;
  prefer: boolean;
  noselect: boolean;
  nts: boolean;
}

export function NTPEditModal({
  open,
  onOpenChange,
  onSuccess,
  config,
}: NTPEditModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [capabilities, setCapabilities] = useState<NTPCapabilities | null>(null);

  // Form state
  const [servers, setServers] = useState<ServerEntry[]>([]);
  const [listenAddresses, setListenAddresses] = useState<string[]>([]);
  const [allowClients, setAllowClients] = useState<string[]>([]);
  const [leapSecond, setLeapSecond] = useState("");
  const [vrf, setVrf] = useState("");

  // Input fields for adding new items
  const [newServer, setNewServer] = useState("");
  const [newServerPool, setNewServerPool] = useState(false);
  const [newServerPrefer, setNewServerPrefer] = useState(false);
  const [newServerNts, setNewServerNts] = useState(false);
  const [newListenAddr, setNewListenAddr] = useState("");
  const [newAllowClient, setNewAllowClient] = useState("");

  useEffect(() => {
    if (open) {
      // Load capabilities
      ntpService.getCapabilities().then(setCapabilities).catch(console.error);

      // Initialize form with current config
      setServers(config.servers.map(s => ({
        address: s.address,
        pool: s.pool,
        prefer: s.prefer,
        noselect: s.noselect,
        nts: s.nts,
      })));
      setListenAddresses([...config.listen_addresses]);
      setAllowClients([...config.allow_clients]);
      setLeapSecond(config.leap_second || "__none__");
      setVrf(config.vrf || "");
    }
  }, [open, config]);

  const handleAddServer = () => {
    if (newServer.trim() && !servers.some(s => s.address === newServer.trim())) {
      setServers([...servers, {
        address: newServer.trim(),
        pool: newServerPool,
        prefer: newServerPrefer,
        noselect: false,
        nts: newServerNts,
      }]);
      setNewServer("");
      setNewServerPool(false);
      setNewServerPrefer(false);
      setNewServerNts(false);
    }
  };

  const handleRemoveServer = (address: string) => {
    setServers(servers.filter(s => s.address !== address));
  };

  const handleAddListenAddr = () => {
    if (newListenAddr.trim() && !listenAddresses.includes(newListenAddr.trim())) {
      setListenAddresses([...listenAddresses, newListenAddr.trim()]);
      setNewListenAddr("");
    }
  };

  const handleRemoveListenAddr = (addr: string) => {
    setListenAddresses(listenAddresses.filter(a => a !== addr));
  };

  const handleAddAllowClient = () => {
    if (newAllowClient.trim() && !allowClients.includes(newAllowClient.trim())) {
      setAllowClients([...allowClients, newAllowClient.trim()]);
      setNewAllowClient("");
    }
  };

  const handleRemoveAllowClient = (network: string) => {
    setAllowClients(allowClients.filter(n => n !== network));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const operations: NTPOperation[] = [];

      // Handle servers
      const currentServers = new Map(config.servers.map(s => [s.address, s]));
      const newServersMap = new Map(servers.map(s => [s.address, s]));

      // Delete removed servers
      for (const server of config.servers) {
        if (!newServersMap.has(server.address)) {
          operations.push({ op: "delete_server", server: server.address });
        }
      }

      // Add new servers
      for (const server of servers) {
        if (!currentServers.has(server.address)) {
          operations.push({
            op: "add_server",
            server: server.address,
            pool: server.pool,
            prefer: server.prefer,
            noselect: server.noselect,
            nts: server.nts,
          });
        } else {
          // Check if flags changed
          const current = currentServers.get(server.address)!;
          if (server.pool !== current.pool) {
            operations.push({ op: server.pool ? "set_server_pool" : "unset_server_pool", server: server.address });
          }
          if (server.prefer !== current.prefer) {
            operations.push({ op: server.prefer ? "set_server_prefer" : "unset_server_prefer", server: server.address });
          }
        }
      }

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

      // Handle allow clients
      const currentAllowClients = new Set(config.allow_clients);
      const newAllowClientsSet = new Set(allowClients);

      for (const network of config.allow_clients) {
        if (!newAllowClientsSet.has(network)) {
          operations.push({ op: "delete_allow_client", network });
        }
      }
      for (const network of allowClients) {
        if (!currentAllowClients.has(network)) {
          operations.push({ op: "add_allow_client", network });
        }
      }

      // Handle leap second
      const effectiveLeapSecond = leapSecond === "__none__" ? "" : leapSecond;
      if (effectiveLeapSecond !== (config.leap_second || "")) {
        if (effectiveLeapSecond) {
          operations.push({ op: "set_leap_second", mode: effectiveLeapSecond });
        } else if (config.leap_second) {
          operations.push({ op: "delete_leap_second" });
        }
      }

      // Handle VRF
      if (vrf !== (config.vrf || "")) {
        if (vrf) {
          operations.push({ op: "set_vrf", vrf });
        } else if (config.vrf) {
          operations.push({ op: "delete_vrf" });
        }
      }

      if (operations.length === 0) {
        toast.info("No Changes", "No changes were made to the configuration");
        onOpenChange(false);
        return;
      }

      const response = await ntpService.configureBatch({ operations });

      if (response.success) {
        toast.success("NTP Updated", "NTP service configuration has been updated");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error("Update Failed", response.error || "Unknown error");
      }
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Failed to update NTP configuration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Edit NTP Service Settings
          </DialogTitle>
          <DialogDescription>
            Configure NTP service settings for time synchronization
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* NTP Servers */}
            <div className="space-y-3">
              <Label>NTP Servers</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., pool.ntp.org or 192.168.1.1"
                    value={newServer}
                    onChange={(e) => setNewServer(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddServer())}
                    disabled={loading}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={handleAddServer} disabled={loading}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="new-server-pool"
                      checked={newServerPool}
                      onCheckedChange={(checked) => setNewServerPool(checked === true)}
                    />
                    <label htmlFor="new-server-pool" className="text-muted-foreground">Pool</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="new-server-prefer"
                      checked={newServerPrefer}
                      onCheckedChange={(checked) => setNewServerPrefer(checked === true)}
                    />
                    <label htmlFor="new-server-prefer" className="text-muted-foreground">Prefer</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="new-server-nts"
                      checked={newServerNts}
                      onCheckedChange={(checked) => setNewServerNts(checked === true)}
                    />
                    <label htmlFor="new-server-nts" className="text-muted-foreground">NTS</label>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {servers.map((server) => (
                  <div
                    key={server.address}
                    className="flex items-center justify-between p-2 rounded-md bg-accent/50"
                  >
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm">{server.address}</code>
                      {server.prefer && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />}
                      {server.pool && <Badge variant="outline" className="text-xs">Pool</Badge>}
                      {server.nts && <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500">NTS</Badge>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveServer(server.address)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {servers.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No NTP servers configured</p>
                )}
              </div>
            </div>

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

            {/* Allow Clients */}
            <div className="space-y-3">
              <Label>Allow Clients (Networks)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., 192.168.0.0/16"
                  value={newAllowClient}
                  onChange={(e) => setNewAllowClient(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAllowClient())}
                  disabled={loading}
                />
                <Button type="button" variant="outline" size="icon" onClick={handleAddAllowClient} disabled={loading}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {allowClients.map((network) => (
                  <Badge key={network} variant="secondary" className="font-mono">
                    {network}
                    <button
                      type="button"
                      onClick={() => handleRemoveAllowClient(network)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Leap Second Mode</Label>
                <Select value={leapSecond} onValueChange={setLeapSecond} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Default</SelectItem>
                    {capabilities?.leap_second_modes.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    )) || (
                      <>
                        <SelectItem value="ignore">Ignore</SelectItem>
                        <SelectItem value="smear">Smear</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>VRF</Label>
                <Input
                  placeholder="VRF name (optional)"
                  value={vrf}
                  onChange={(e) => setVrf(e.target.value)}
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
