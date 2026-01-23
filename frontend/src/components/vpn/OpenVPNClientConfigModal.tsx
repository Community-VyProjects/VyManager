"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Plus, Trash2, Power, PowerOff } from "lucide-react";
import { openvpnService, type OpenVPNInterface, type OpenVPNClient } from "@/lib/api/openvpn";
import { useToast } from "@/hooks/useToast";

interface OpenVPNClientConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interface: OpenVPNInterface;
}

export function OpenVPNClientConfigModal({
  open,
  onOpenChange,
  onSuccess,
  interface: iface,
}: OpenVPNClientConfigModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Add new client form
  const [newClientName, setNewClientName] = useState("");
  const [newClientIP, setNewClientIP] = useState("");
  const [newClientSubnet, setNewClientSubnet] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const clients = iface.server?.clients || [];

  const handleAddClient = async () => {
    if (!newClientName.trim()) {
      toast.error("Validation Error", "Client name is required");
      return;
    }

    setLoading(true);
    try {
      const response = await openvpnService.addServerClient(
        iface.name,
        newClientName.trim(),
        {
          ip: newClientIP.trim() || undefined,
          subnet: newClientSubnet.trim() || undefined,
        }
      );

      if (response.success) {
        toast.success("Client Added", `Client ${newClientName} has been added`);
        setNewClientName("");
        setNewClientIP("");
        setNewClientSubnet("");
        setShowAddForm(false);
        onSuccess();
      } else {
        toast.error("Failed", response.error || "Unknown error");
      }
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Failed to add client");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (client: OpenVPNClient) => {
    setActionLoading(`delete-${client.name}`);
    try {
      const response = await openvpnService.removeServerClient(iface.name, client.name);

      if (response.success) {
        toast.success("Client Removed", `Client ${client.name} has been removed`);
        onSuccess();
      } else {
        toast.error("Failed", response.error || "Unknown error");
      }
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Failed to remove client");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleClient = async (client: OpenVPNClient) => {
    setActionLoading(`toggle-${client.name}`);
    try {
      const response = await openvpnService.configureBatch({
        interface: iface.name,
        operations: [
          {
            op: client.disable ? "enable_server_client" : "disable_server_client",
            client: client.name,
          },
        ],
      });

      if (response.success) {
        toast.success(
          "Success",
          `Client ${client.name} ${client.disable ? "enabled" : "disabled"}`
        );
        onSuccess();
      } else {
        toast.error("Failed", response.error || "Unknown error");
      }
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Operation failed");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Manage Clients - {iface.name}
          </DialogTitle>
          <DialogDescription>
            Configure client certificates and IP assignments for this OpenVPN server
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Server info */}
          <div className="p-3 rounded-lg bg-accent/50 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Server Subnet:</span>{" "}
                <span className="font-mono">{iface.server?.subnet || "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Topology:</span>{" "}
                <span>{iface.server?.topology || "subnet"}</span>
              </div>
            </div>
          </div>

          {/* Client list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Configured Clients ({clients.length})</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(!showAddForm)}
                disabled={loading}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Client
              </Button>
            </div>

            {/* Add client form */}
            {showAddForm && (
              <div className="p-4 rounded-lg border bg-accent/30 space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="client-name">
                    Client Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="client-name"
                    placeholder="e.g., client1 (matches certificate CN)"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must match the Common Name (CN) in the client certificate
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="client-ip">Static IP (Optional)</Label>
                    <Input
                      id="client-ip"
                      placeholder="e.g., 10.8.0.10"
                      value={newClientIP}
                      onChange={(e) => setNewClientIP(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="client-subnet">iroute Subnet (Optional)</Label>
                    <Input
                      id="client-subnet"
                      placeholder="e.g., 192.168.1.0/24"
                      value={newClientSubnet}
                      onChange={(e) => setNewClientSubnet(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewClientName("");
                      setNewClientIP("");
                      setNewClientSubnet("");
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAddClient} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Client
                  </Button>
                </div>
              </div>
            )}

            {/* Client list */}
            {clients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No clients configured yet</p>
                <p className="text-xs">Add clients to assign specific IPs or routes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clients.map((client) => (
                  <div
                    key={client.name}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      client.disable ? "opacity-60 bg-muted/50" : ""
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium font-mono">{client.name}</span>
                        {client.disable ? (
                          <Badge
                            variant="outline"
                            className="bg-red-500/10 text-red-500 border-red-500/20 text-xs"
                          >
                            Disabled
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-green-500/10 text-green-500 border-green-500/20 text-xs"
                          >
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {client.ip && (
                          <span>
                            IP: <span className="font-mono">{client.ip}</span>
                          </span>
                        )}
                        {client.subnet && (
                          <span>
                            Subnet: <span className="font-mono">{client.subnet}</span>
                          </span>
                        )}
                        {!client.ip && !client.subnet && <span>No static configuration</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleClient(client)}
                        disabled={actionLoading === `toggle-${client.name}`}
                        className="h-8 w-8 p-0"
                      >
                        {actionLoading === `toggle-${client.name}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : client.disable ? (
                          <Power className="h-4 w-4 text-green-500" />
                        ) : (
                          <PowerOff className="h-4 w-4 text-red-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClient(client)}
                        disabled={actionLoading === `delete-${client.name}`}
                        className="h-8 w-8 p-0"
                      >
                        {actionLoading === `delete-${client.name}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
