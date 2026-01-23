"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, X, RefreshCw, Server } from "lucide-react";
import { vrrpService, type VirtualServer } from "@/lib/api/vrrp";
import { useToast } from "@/hooks/useToast";

interface VRRPVirtualServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: VirtualServer | null;
  onSuccess?: () => void;
}

const ALGORITHMS = [
  { value: "rr", label: "Round Robin" },
  { value: "wrr", label: "Weighted Round Robin" },
  { value: "lc", label: "Least Connection" },
  { value: "wlc", label: "Weighted Least Connection" },
  { value: "sh", label: "Source Hashing" },
  { value: "dh", label: "Destination Hashing" },
  { value: "sed", label: "Shortest Expected Delay" },
  { value: "nq", label: "Never Queue" },
];

const FORWARD_METHODS = [
  { value: "direct", label: "Direct Routing (DSR)" },
  { value: "nat", label: "NAT" },
  { value: "tunnel", label: "IP Tunneling" },
];

const PROTOCOLS = [
  { value: "tcp", label: "TCP" },
  { value: "udp", label: "UDP" },
];

export function VRRPVirtualServerModal({
  open,
  onOpenChange,
  editData,
  onSuccess,
}: VRRPVirtualServerModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEditing = !!editData;

  // Form state
  const [address, setAddress] = useState("");
  const [port, setPort] = useState("");
  const [protocol, setProtocol] = useState("tcp");
  const [algorithm, setAlgorithm] = useState("rr");
  const [forwardMethod, setForwardMethod] = useState("nat");
  const [persistenceTimeout, setPersistenceTimeout] = useState("");
  const [delayLoop, setDelayLoop] = useState("");
  const [realServers, setRealServers] = useState<{ address: string; port?: string }[]>([]);
  const [newRsAddress, setNewRsAddress] = useState("");
  const [newRsPort, setNewRsPort] = useState("");

  // Reset form when modal opens/closes or edit data changes
  useEffect(() => {
    if (open) {
      if (editData) {
        setAddress(editData.address);
        setPort(editData.port || "");
        setProtocol(editData.protocol || "tcp");
        setAlgorithm(editData.algorithm || "rr");
        setForwardMethod(editData.forward_method || "nat");
        setPersistenceTimeout(editData.persistence_timeout || "");
        setDelayLoop(editData.delay_loop || "");
        setRealServers(editData.real_servers || []);
      } else {
        setAddress("");
        setPort("");
        setProtocol("tcp");
        setAlgorithm("rr");
        setForwardMethod("nat");
        setPersistenceTimeout("");
        setDelayLoop("");
        setRealServers([]);
      }
      setNewRsAddress("");
      setNewRsPort("");
    }
  }, [open, editData]);

  const handleAddRealServer = () => {
    if (newRsAddress && !realServers.some((rs) => rs.address === newRsAddress)) {
      setRealServers([
        ...realServers,
        { address: newRsAddress, port: newRsPort || undefined },
      ]);
      setNewRsAddress("");
      setNewRsPort("");
    }
  };

  const handleRemoveRealServer = (addr: string) => {
    setRealServers(realServers.filter((rs) => rs.address !== addr));
  };

  const handleSubmit = async () => {
    // Validation
    if (!address.trim()) {
      toast.error("Validation Error", "Virtual server address is required");
      return;
    }

    if (!port.trim()) {
      toast.error("Validation Error", "Port is required");
      return;
    }

    if (!isEditing && realServers.length === 0) {
      toast.error("Validation Error", "At least one real server is required");
      return;
    }

    setLoading(true);

    try {
      let response;

      if (isEditing) {
        // Update existing - just update settings, not address/port
        const operations = [];

        if (algorithm) {
          operations.push({ op: "set_vs_algorithm", address, value: algorithm });
        }
        if (forwardMethod) {
          operations.push({ op: "set_vs_forward_method", address, value: forwardMethod });
        }
        if (persistenceTimeout) {
          operations.push({ op: "set_vs_persistence_timeout", address, value: parseInt(persistenceTimeout) });
        }
        if (delayLoop) {
          operations.push({ op: "set_vs_delay_loop", address, value: parseInt(delayLoop) });
        }

        response = await vrrpService.configureBatch({ operations });
      } else {
        // Create new virtual server
        response = await vrrpService.createVirtualServer(address, {
          port: parseInt(port),
          protocol,
          algorithm,
          forwardMethod,
          realServers: realServers.map((rs) => ({
            address: rs.address,
            port: rs.port ? parseInt(rs.port) : undefined,
          })),
        });

        // Add optional settings
        if (response.success && (persistenceTimeout || delayLoop)) {
          const extraOps = [];
          if (persistenceTimeout) {
            extraOps.push({ op: "set_vs_persistence_timeout", address, value: parseInt(persistenceTimeout) });
          }
          if (delayLoop) {
            extraOps.push({ op: "set_vs_delay_loop", address, value: parseInt(delayLoop) });
          }
          if (extraOps.length > 0) {
            await vrrpService.configureBatch({ operations: extraOps });
          }
        }
      }

      if (response.success) {
        toast.success(
          isEditing ? "Virtual Server Updated" : "Virtual Server Created",
          `Virtual server "${address}" has been ${isEditing ? "updated" : "created"} successfully`
        );
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error("Error", response.error || "Failed to save virtual server");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Virtual Server" : "Create Virtual Server"}</DialogTitle>
          <DialogDescription>
            Configure a virtual server for load balancing across real servers
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Basic Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Basic Settings</h4>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Virtual IP Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g., 192.168.1.100"
                    disabled={isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="e.g., 80"
                    disabled={isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="protocol">Protocol</Label>
                  <Select value={protocol} onValueChange={setProtocol} disabled={isEditing}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROTOCOLS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="algorithm">Load Balancing Algorithm</Label>
                  <Select value={algorithm} onValueChange={setAlgorithm}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALGORITHMS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="forwardMethod">Forward Method</Label>
                  <Select value={forwardMethod} onValueChange={setForwardMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORWARD_METHODS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="persistenceTimeout">Persistence Timeout (seconds)</Label>
                  <Input
                    id="persistenceTimeout"
                    type="number"
                    value={persistenceTimeout}
                    onChange={(e) => setPersistenceTimeout(e.target.value)}
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delayLoop">Delay Loop</Label>
                  <Input
                    id="delayLoop"
                    type="number"
                    value={delayLoop}
                    onChange={(e) => setDelayLoop(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            {/* Real Servers */}
            {!isEditing && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Real Servers</h4>

                <div className="flex gap-2">
                  <Input
                    value={newRsAddress}
                    onChange={(e) => setNewRsAddress(e.target.value)}
                    placeholder="Server IP (e.g., 10.0.0.1)"
                    className="flex-1"
                  />
                  <Input
                    value={newRsPort}
                    onChange={(e) => setNewRsPort(e.target.value)}
                    placeholder="Port (optional)"
                    className="w-28"
                    type="number"
                  />
                  <Button type="button" onClick={handleAddRealServer} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {realServers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {realServers.map((rs) => (
                      <Badge key={rs.address} variant="secondary" className="gap-1">
                        <Server className="h-3 w-3" />
                        {rs.address}
                        {rs.port && <span>:{rs.port}</span>}
                        <button
                          type="button"
                          onClick={() => handleRemoveRealServer(rs.address)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Virtual Server"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
