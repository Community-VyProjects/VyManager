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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, Network, ArrowRight, Shield } from "lucide-react";
import { openvpnService, type OpenVPNInterface, type OpenVPNCapabilities, type OpenVPNOperation } from "@/lib/api/openvpn";
import { useToast } from "@/hooks/useToast";

interface OpenVPNSiteToSiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: OpenVPNCapabilities | null;
  existingInterface?: OpenVPNInterface;
}

export function OpenVPNSiteToSiteModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingInterface,
}: OpenVPNSiteToSiteModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEdit = !!existingInterface;

  // Basic settings
  const [interfaceName, setInterfaceName] = useState("");
  const [localAddress, setLocalAddress] = useState("");
  const [remoteAddress, setRemoteAddress] = useState("");
  const [remoteHost, setRemoteHost] = useState("");
  const [localHost, setLocalHost] = useState("");
  const [localPort, setLocalPort] = useState("1194");
  const [remotePort, setRemotePort] = useState("1194");
  const [protocol, setProtocol] = useState("udp");
  const [deviceType, setDeviceType] = useState("tun");
  const [description, setDescription] = useState("");

  // Security
  const [sharedSecretKey, setSharedSecretKey] = useState("");
  const [encryption, setEncryption] = useState("aes256");
  const [hash, setHash] = useState("sha256");

  // TLS (optional for site-to-site)
  const [tlsRole, setTlsRole] = useState("");

  useEffect(() => {
    if (open) {
      if (existingInterface) {
        setInterfaceName(existingInterface.name);
        setLocalAddress(existingInterface.local_address || "");
        setRemoteAddress(existingInterface.remote_address || "");
        setRemoteHost(existingInterface.remote_hosts?.[0] || "");
        setLocalHost(existingInterface.local_host || "");
        setLocalPort(existingInterface.local_port || "1194");
        setRemotePort(existingInterface.remote_port || "1194");
        setProtocol(existingInterface.protocol || "udp");
        setDeviceType(existingInterface.device_type || "tun");
        setDescription(existingInterface.description || "");
        setSharedSecretKey(existingInterface.shared_secret_key || "");
        setEncryption(existingInterface.encryption || "aes256");
        setHash(existingInterface.hash || "sha256");
        setTlsRole(existingInterface.tls?.role || "");
      } else {
        // Reset form
        setInterfaceName("");
        setLocalAddress("");
        setRemoteAddress("");
        setRemoteHost("");
        setLocalHost("");
        setLocalPort("1194");
        setRemotePort("1194");
        setProtocol("udp");
        setDeviceType("tun");
        setDescription("");
        setSharedSecretKey("");
        setEncryption("aes256");
        setHash("sha256");
        setTlsRole("");
      }
    }
  }, [open, existingInterface]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!interfaceName.trim()) {
      toast.error("Validation Error", "Interface name is required");
      return;
    }

    if (!isEdit && !/^vtun\d+$/.test(interfaceName.trim())) {
      toast.error("Validation Error", "Interface name must be in format: vtun0, vtun1, etc.");
      return;
    }

    if (!localAddress.trim()) {
      toast.error("Validation Error", "Local tunnel address is required");
      return;
    }

    if (!remoteAddress.trim()) {
      toast.error("Validation Error", "Remote tunnel address is required");
      return;
    }

    if (!remoteHost.trim()) {
      toast.error("Validation Error", "Remote host is required");
      return;
    }

    setLoading(true);
    try {
      const operations: OpenVPNOperation[] = [];

      if (!isEdit) {
        operations.push({ op: "create" });
        operations.push({ op: "set_mode", value: "site-to-site" });
      }

      operations.push({ op: "set_local_address", value: localAddress.trim() });
      operations.push({ op: "set_remote_address", value: remoteAddress.trim() });
      operations.push({ op: "set_remote_host", value: remoteHost.trim() });

      if (localHost.trim()) {
        operations.push({ op: "set_local_host", value: localHost.trim() });
      }

      if (localPort) {
        operations.push({ op: "set_local_port", value: parseInt(localPort) });
      }

      if (remotePort) {
        operations.push({ op: "set_remote_port", value: parseInt(remotePort) });
      }

      if (protocol) {
        operations.push({ op: "set_protocol", value: protocol });
      }

      if (deviceType) {
        operations.push({ op: "set_device_type", value: deviceType });
      }

      if (description.trim()) {
        operations.push({ op: "set_description", value: description.trim() });
      }

      if (sharedSecretKey.trim()) {
        operations.push({ op: "set_shared_secret_key", value: sharedSecretKey.trim() });
      }

      if (encryption) {
        operations.push({ op: "set_encryption", value: encryption });
      }

      if (hash) {
        operations.push({ op: "set_hash", value: hash });
      }

      if (tlsRole) {
        operations.push({ op: "set_tls_role", value: tlsRole });
      }

      const response = await openvpnService.configureBatch({
        interface: interfaceName.trim(),
        operations,
      });

      if (response.success) {
        toast.success(
          isEdit ? "Tunnel Updated" : "Tunnel Created",
          `Site-to-site tunnel ${interfaceName} has been ${isEdit ? "updated" : "created"}`
        );
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error("Failed", response.error || "Unknown error");
      }
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-orange-500" />
            {isEdit ? `Edit ${existingInterface?.name}` : "Create Site-to-Site Tunnel"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modify the site-to-site tunnel configuration"
              : "Create a point-to-point OpenVPN tunnel between two sites"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Visual representation */}
            <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-accent/50">
              <div className="text-center">
                <Shield className="h-8 w-8 mx-auto mb-1 text-blue-500" />
                <p className="text-xs font-medium">Local Site</p>
                <p className="text-xs text-muted-foreground">{localAddress || "?.?.?.?"}</p>
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
              <div className="flex-1 border-t-2 border-dashed border-muted-foreground/30" />
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
              <div className="text-center">
                <Shield className="h-8 w-8 mx-auto mb-1 text-green-500" />
                <p className="text-xs font-medium">Remote Site</p>
                <p className="text-xs text-muted-foreground">{remoteAddress || "?.?.?.?"}</p>
              </div>
            </div>

            {/* Basic Settings */}
            <div className="grid gap-2">
              <Label htmlFor="interface-name">
                Interface Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="interface-name"
                placeholder="e.g., vtun0"
                value={interfaceName}
                onChange={(e) => setInterfaceName(e.target.value)}
                disabled={loading || isEdit}
              />
              <p className="text-xs text-muted-foreground">
                Use format: vtun0, vtun1, vtun2, etc.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="local-address">
                  Local Tunnel Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="local-address"
                  placeholder="e.g., 10.255.0.1"
                  value={localAddress}
                  onChange={(e) => setLocalAddress(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="remote-address">
                  Remote Tunnel Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="remote-address"
                  placeholder="e.g., 10.255.0.2"
                  value={remoteAddress}
                  onChange={(e) => setRemoteAddress(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="remote-host">
                Remote Host <span className="text-destructive">*</span>
              </Label>
              <Input
                id="remote-host"
                placeholder="e.g., vpn.example.com or 203.0.113.1"
                value={remoteHost}
                onChange={(e) => setRemoteHost(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Public IP or hostname of the remote endpoint
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="local-port">Local Port</Label>
                <Input
                  id="local-port"
                  type="number"
                  placeholder="1194"
                  value={localPort}
                  onChange={(e) => setLocalPort(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="remote-port">Remote Port</Label>
                <Input
                  id="remote-port"
                  type="number"
                  placeholder="1194"
                  value={remotePort}
                  onChange={(e) => setRemotePort(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Protocol</Label>
                <Select value={protocol} onValueChange={setProtocol} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {capabilities?.protocols.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    )) || (
                      <>
                        <SelectItem value="udp">UDP</SelectItem>
                        <SelectItem value="tcp-active">TCP Active</SelectItem>
                        <SelectItem value="tcp-passive">TCP Passive</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Device Type</Label>
                <Select value={deviceType} onValueChange={setDeviceType} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {capabilities?.device_types.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    )) || (
                      <>
                        <SelectItem value="tun">TUN (Layer 3)</SelectItem>
                        <SelectItem value="tap">TAP (Layer 2)</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g., Tunnel to Branch Office"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Security Settings */}
            <Accordion type="single" collapsible>
              <AccordionItem value="security">
                <AccordionTrigger>Security Settings</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="shared-secret">Shared Secret Key</Label>
                    <Input
                      id="shared-secret"
                      placeholder="Key name from VyOS PKI"
                      value={sharedSecretKey}
                      onChange={(e) => setSharedSecretKey(e.target.value)}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Name of the shared secret key configured in VyOS PKI
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Encryption</Label>
                      <Select value={encryption} onValueChange={setEncryption} disabled={loading}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {capabilities?.encryptions.map((e) => (
                            <SelectItem key={e.value} value={e.value}>
                              {e.label}
                            </SelectItem>
                          )) || (
                            <>
                              <SelectItem value="aes256">AES-256</SelectItem>
                              <SelectItem value="aes128">AES-128</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Hash Algorithm</Label>
                      <Select value={hash} onValueChange={setHash} disabled={loading}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {capabilities?.hashes.map((h) => (
                            <SelectItem key={h.value} value={h.value}>
                              {h.label}
                            </SelectItem>
                          )) || (
                            <>
                              <SelectItem value="sha256">SHA-256</SelectItem>
                              <SelectItem value="sha512">SHA-512</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>TLS Role (Optional)</Label>
                    <Select value={tlsRole} onValueChange={setTlsRole} disabled={loading}>
                      <SelectTrigger>
                        <SelectValue placeholder="Not configured" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Not configured</SelectItem>
                        {capabilities?.tls_roles.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        )) || (
                          <>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="passive">Passive</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      One side should be active, the other passive
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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
              {isEdit ? "Save Changes" : "Create Tunnel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
