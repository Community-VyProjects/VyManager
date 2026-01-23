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
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, User } from "lucide-react";
import { openvpnService, type OpenVPNInterface, type OpenVPNCapabilities, type OpenVPNOperation } from "@/lib/api/openvpn";
import { useToast } from "@/hooks/useToast";

interface OpenVPNClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: OpenVPNCapabilities | null;
  existingInterface?: OpenVPNInterface;
}

export function OpenVPNClientModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingInterface,
}: OpenVPNClientModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEdit = !!existingInterface;

  // Basic settings
  const [interfaceName, setInterfaceName] = useState("");
  const [remoteHost, setRemoteHost] = useState("");
  const [remotePort, setRemotePort] = useState("1194");
  const [protocol, setProtocol] = useState("udp");
  const [deviceType, setDeviceType] = useState("tun");
  const [description, setDescription] = useState("");

  // Authentication
  const [caCertificate, setCaCertificate] = useState("");
  const [certificate, setCertificate] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  // Security
  const [encryption, setEncryption] = useState("aes256gcm");
  const [hash, setHash] = useState("sha256");

  // Options
  const [replaceDefaultRoute, setReplaceDefaultRoute] = useState(false);
  const [persistentTunnel, setPersistentTunnel] = useState(false);

  useEffect(() => {
    if (open) {
      if (existingInterface) {
        setInterfaceName(existingInterface.name);
        setRemoteHost(existingInterface.remote_hosts?.[0] || "");
        setRemotePort(existingInterface.remote_port || "1194");
        setProtocol(existingInterface.protocol || "udp");
        setDeviceType(existingInterface.device_type || "tun");
        setDescription(existingInterface.description || "");
        setCaCertificate(existingInterface.tls?.ca_certificate || "");
        setCertificate(existingInterface.tls?.certificate || "");
        setAuthUsername(existingInterface.authentication?.username || "");
        setAuthPassword(""); // Don't prefill password
        setEncryption(existingInterface.encryption || "aes256gcm");
        setHash(existingInterface.hash || "sha256");
        setReplaceDefaultRoute(existingInterface.replace_default_route);
        setPersistentTunnel(existingInterface.persistent_tunnel);
      } else {
        // Reset form
        setInterfaceName("");
        setRemoteHost("");
        setRemotePort("1194");
        setProtocol("udp");
        setDeviceType("tun");
        setDescription("");
        setCaCertificate("");
        setCertificate("");
        setAuthUsername("");
        setAuthPassword("");
        setEncryption("aes256gcm");
        setHash("sha256");
        setReplaceDefaultRoute(false);
        setPersistentTunnel(false);
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

    if (!remoteHost.trim()) {
      toast.error("Validation Error", "Remote host is required");
      return;
    }

    setLoading(true);
    try {
      const operations: OpenVPNOperation[] = [];

      if (!isEdit) {
        operations.push({ op: "create" });
        operations.push({ op: "set_mode", value: "client" });
      }

      operations.push({ op: "set_remote_host", value: remoteHost.trim() });

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

      if (caCertificate.trim()) {
        operations.push({ op: "set_tls_ca_certificate", value: caCertificate.trim() });
      }

      if (certificate.trim()) {
        operations.push({ op: "set_tls_certificate", value: certificate.trim() });
      }

      if (authUsername.trim()) {
        operations.push({ op: "set_auth_username", value: authUsername.trim() });
      }

      if (authPassword) {
        operations.push({ op: "set_auth_password", value: authPassword });
      }

      if (encryption) {
        operations.push({ op: "set_encryption", value: encryption });
      }

      if (hash) {
        operations.push({ op: "set_hash", value: hash });
      }

      if (replaceDefaultRoute) {
        operations.push({ op: "enable_replace_default_route" });
      } else if (isEdit && existingInterface?.replace_default_route) {
        operations.push({ op: "disable_replace_default_route" });
      }

      if (persistentTunnel) {
        operations.push({ op: "enable_persistent_tunnel" });
      } else if (isEdit && existingInterface?.persistent_tunnel) {
        operations.push({ op: "disable_persistent_tunnel" });
      }

      const response = await openvpnService.configureBatch({
        interface: interfaceName.trim(),
        operations,
      });

      if (response.success) {
        toast.success(
          isEdit ? "Client Updated" : "Client Created",
          `OpenVPN client ${interfaceName} has been ${isEdit ? "updated" : "created"}`
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-green-500" />
            {isEdit ? `Edit ${existingInterface?.name}` : "Create OpenVPN Client"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modify the OpenVPN client configuration"
              : "Configure a connection to an OpenVPN server"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
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
                <Label htmlFor="remote-host">
                  Remote Host <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="remote-host"
                  placeholder="e.g., vpn.example.com"
                  value={remoteHost}
                  onChange={(e) => setRemoteHost(e.target.value)}
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
                placeholder="e.g., Connection to HQ VPN"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Authentication & TLS */}
            <Accordion type="single" collapsible>
              <AccordionItem value="auth">
                <AccordionTrigger>Authentication</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid gap-2">
                    <Label>CA Certificate</Label>
                    <Input
                      placeholder="Certificate name from PKI"
                      value={caCertificate}
                      onChange={(e) => setCaCertificate(e.target.value)}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Name of the CA certificate configured in VyOS PKI
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label>Client Certificate</Label>
                    <Input
                      placeholder="Certificate name from PKI"
                      value={certificate}
                      onChange={(e) => setCertificate(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-3">Username/Password Auth (Optional)</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Username</Label>
                        <Input
                          placeholder="VPN username"
                          value={authUsername}
                          onChange={(e) => setAuthUsername(e.target.value)}
                          disabled={loading}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Password</Label>
                        <Input
                          type="password"
                          placeholder="VPN password"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="security">
                <AccordionTrigger>Security Settings</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
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
                              <SelectItem value="aes256gcm">AES-256-GCM</SelectItem>
                              <SelectItem value="aes256">AES-256</SelectItem>
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
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="options">
                <AccordionTrigger>Connection Options</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label>Replace Default Route</Label>
                      <p className="text-xs text-muted-foreground">
                        Route all traffic through the VPN
                      </p>
                    </div>
                    <Switch
                      checked={replaceDefaultRoute}
                      onCheckedChange={setReplaceDefaultRoute}
                      disabled={loading}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label>Persistent Tunnel</Label>
                      <p className="text-xs text-muted-foreground">
                        Keep tunnel interface up even if connection drops
                      </p>
                    </div>
                    <Switch
                      checked={persistentTunnel}
                      onCheckedChange={setPersistentTunnel}
                      disabled={loading}
                    />
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
              {isEdit ? "Save Changes" : "Create Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
