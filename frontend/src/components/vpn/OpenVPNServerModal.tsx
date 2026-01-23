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
import { Loader2, Server, Plus, X } from "lucide-react";
import { openvpnService, type OpenVPNInterface, type OpenVPNCapabilities, type OpenVPNOperation } from "@/lib/api/openvpn";
import { useToast } from "@/hooks/useToast";

interface OpenVPNServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: OpenVPNCapabilities | null;
  existingInterface?: OpenVPNInterface;
}

export function OpenVPNServerModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingInterface,
}: OpenVPNServerModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEdit = !!existingInterface;

  // Basic settings
  const [interfaceName, setInterfaceName] = useState("");
  const [subnet, setSubnet] = useState("");
  const [port, setPort] = useState("1194");
  const [protocol, setProtocol] = useState("udp");
  const [deviceType, setDeviceType] = useState("tun");
  const [description, setDescription] = useState("");
  const [topology, setTopology] = useState("subnet");

  // TLS settings
  const [caCertificate, setCaCertificate] = useState("");
  const [certificate, setCertificate] = useState("");
  const [dhParams, setDhParams] = useState("");

  // Security
  const [encryption, setEncryption] = useState("aes256gcm");
  const [hash, setHash] = useState("sha256");

  // Server options
  const [pushRoutes, setPushRoutes] = useState<string[]>([]);
  const [nameServers, setNameServers] = useState<string[]>([]);
  const [domainName, setDomainName] = useState("");
  const [redirectGateway, setRedirectGateway] = useState(false);
  const [maxConnections, setMaxConnections] = useState("");

  useEffect(() => {
    if (open) {
      if (existingInterface) {
        setInterfaceName(existingInterface.name);
        setSubnet(existingInterface.server?.subnet || "");
        setPort(existingInterface.local_port || "1194");
        setProtocol(existingInterface.protocol || "udp");
        setDeviceType(existingInterface.device_type || "tun");
        setDescription(existingInterface.description || "");
        setTopology(existingInterface.server?.topology || "subnet");
        setCaCertificate(existingInterface.tls?.ca_certificate || "");
        setCertificate(existingInterface.tls?.certificate || "");
        setDhParams(existingInterface.tls?.dh_params || "");
        setEncryption(existingInterface.encryption || "aes256gcm");
        setHash(existingInterface.hash || "sha256");
        setPushRoutes(existingInterface.server?.push_routes || []);
        setNameServers(existingInterface.server?.name_servers || []);
        setDomainName(existingInterface.server?.domain_name || "");
        setRedirectGateway(existingInterface.server?.redirect_gateway || false);
        setMaxConnections(existingInterface.server?.max_connections || "");
      } else {
        // Reset form
        setInterfaceName("");
        setSubnet("");
        setPort("1194");
        setProtocol("udp");
        setDeviceType("tun");
        setDescription("");
        setTopology("subnet");
        setCaCertificate("");
        setCertificate("");
        setDhParams("");
        setEncryption("aes256gcm");
        setHash("sha256");
        setPushRoutes([]);
        setNameServers([]);
        setDomainName("");
        setRedirectGateway(false);
        setMaxConnections("");
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

    if (!subnet.trim()) {
      toast.error("Validation Error", "Server subnet is required");
      return;
    }

    setLoading(true);
    try {
      const operations: OpenVPNOperation[] = [];

      if (!isEdit) {
        operations.push({ op: "create" });
        operations.push({ op: "set_mode", value: "server" });
      }

      operations.push({ op: "set_server_subnet", value: subnet.trim() });

      if (port) {
        operations.push({ op: "set_local_port", value: parseInt(port) });
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

      if (topology) {
        operations.push({ op: "set_topology", value: topology });
      }

      if (caCertificate.trim()) {
        operations.push({ op: "set_tls_ca_certificate", value: caCertificate.trim() });
      }

      if (certificate.trim()) {
        operations.push({ op: "set_tls_certificate", value: certificate.trim() });
      }

      if (dhParams.trim()) {
        operations.push({ op: "set_tls_dh_params", value: dhParams.trim() });
      }

      if (encryption) {
        operations.push({ op: "set_encryption", value: encryption });
      }

      if (hash) {
        operations.push({ op: "set_hash", value: hash });
      }

      for (const route of pushRoutes.filter(r => r.trim())) {
        operations.push({ op: "add_push_route", value: route.trim() });
      }

      for (const ns of nameServers.filter(n => n.trim())) {
        operations.push({ op: "add_name_server", value: ns.trim() });
      }

      if (domainName.trim()) {
        operations.push({ op: "set_domain_name", value: domainName.trim() });
      }

      if (redirectGateway) {
        operations.push({ op: "enable_redirect_gateway" });
      }

      if (maxConnections) {
        operations.push({ op: "set_max_connections", value: parseInt(maxConnections) });
      }

      const response = await openvpnService.configureBatch({
        interface: interfaceName.trim(),
        operations,
      });

      if (response.success) {
        toast.success(
          isEdit ? "Server Updated" : "Server Created",
          `OpenVPN server ${interfaceName} has been ${isEdit ? "updated" : "created"}`
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

  const addPushRoute = () => setPushRoutes([...pushRoutes, ""]);
  const removePushRoute = (index: number) => setPushRoutes(pushRoutes.filter((_, i) => i !== index));
  const updatePushRoute = (index: number, value: string) => {
    const updated = [...pushRoutes];
    updated[index] = value;
    setPushRoutes(updated);
  };

  const addNameServer = () => setNameServers([...nameServers, ""]);
  const removeNameServer = (index: number) => setNameServers(nameServers.filter((_, i) => i !== index));
  const updateNameServer = (index: number, value: string) => {
    const updated = [...nameServers];
    updated[index] = value;
    setNameServers(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-blue-500" />
            {isEdit ? `Edit ${existingInterface?.name}` : "Create OpenVPN Server"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modify the OpenVPN server configuration"
              : "Configure a new OpenVPN server for multi-client access"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Basic Settings */}
            <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subnet">
                  Server Subnet <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="subnet"
                  placeholder="e.g., 10.8.0.0/24"
                  value={subnet}
                  onChange={(e) => setSubnet(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  placeholder="1194"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="protocol">Protocol</Label>
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
                        <SelectItem value="tcp-passive">TCP Passive</SelectItem>
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
                placeholder="e.g., Main VPN Server"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* TLS Certificates */}
            <Accordion type="single" collapsible>
              <AccordionItem value="tls">
                <AccordionTrigger>TLS Certificates</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="ca-cert">CA Certificate</Label>
                    <Input
                      id="ca-cert"
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
                    <Label htmlFor="cert">Server Certificate</Label>
                    <Input
                      id="cert"
                      placeholder="Certificate name from PKI"
                      value={certificate}
                      onChange={(e) => setCertificate(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="dh-params">DH Parameters</Label>
                    <Input
                      id="dh-params"
                      placeholder="DH params name from PKI"
                      value={dhParams}
                      onChange={(e) => setDhParams(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Security */}
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
                              <SelectItem value="aes128gcm">AES-128-GCM</SelectItem>
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

              {/* Client Options */}
              <AccordionItem value="client-options">
                <AccordionTrigger>Client Options</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  {/* Push Routes */}
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label>Push Routes</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={addPushRoute}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    {pushRoutes.map((route, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          placeholder="e.g., 192.168.1.0/24"
                          value={route}
                          onChange={(e) => updatePushRoute(idx, e.target.value)}
                          disabled={loading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePushRoute(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      Routes to push to connected clients
                    </p>
                  </div>

                  {/* DNS Servers */}
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label>DNS Servers</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={addNameServer}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    {nameServers.map((ns, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          placeholder="e.g., 8.8.8.8"
                          value={ns}
                          onChange={(e) => updateNameServer(idx, e.target.value)}
                          disabled={loading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNameServer(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-2">
                    <Label>Domain Name</Label>
                    <Input
                      placeholder="e.g., example.com"
                      value={domainName}
                      onChange={(e) => setDomainName(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label>Redirect Gateway</Label>
                      <p className="text-xs text-muted-foreground">
                        Route all client traffic through the VPN
                      </p>
                    </div>
                    <Switch
                      checked={redirectGateway}
                      onCheckedChange={setRedirectGateway}
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
              {isEdit ? "Save Changes" : "Create Server"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
