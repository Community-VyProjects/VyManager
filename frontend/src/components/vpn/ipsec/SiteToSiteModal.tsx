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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Plus, Trash2, Network } from "lucide-react";
import {
  ipsecService,
  SiteToSitePeer,
  IKEGroup,
  ESPGroup,
  IPSecCapabilities,
} from "@/lib/api/ipsec";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";

interface SiteToSiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: IPSecCapabilities | null;
  ikeGroups: IKEGroup[];
  espGroups: ESPGroup[];
  existingPeer: SiteToSitePeer | null;
}

interface TunnelRow {
  number: string;
  esp_group: string;
  local_prefix: string;
  remote_prefix: string;
  protocol: string;
}

export function SiteToSiteModal({
  open,
  onOpenChange,
  onSuccess,
  ikeGroups,
  espGroups,
  existingPeer,
}: SiteToSiteModalProps) {
  const isEdit = !!existingPeer;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ikeGroup, setIkeGroup] = useState("");
  const [defaultEspGroup, setDefaultEspGroup] = useState("");
  const [localAddress, setLocalAddress] = useState("");
  const [remoteAddresses, setRemoteAddresses] = useState("");
  const [connectionType, setConnectionType] = useState("initiate");
  const [dhcpInterface, setDhcpInterface] = useState("");
  const [forceUdp, setForceUdp] = useState(false);

  // Auth
  const [authMode, setAuthMode] = useState("pre-shared-secret");
  const [authLocalId, setAuthLocalId] = useState("");
  const [authRemoteId, setAuthRemoteId] = useState("");
  const [authX509CaCert, setAuthX509CaCert] = useState("");
  const [authX509Cert, setAuthX509Cert] = useState("");
  const [authX509Passphrase, setAuthX509Passphrase] = useState("");
  const [authRsaLocalKey, setAuthRsaLocalKey] = useState("");
  const [authRsaRemoteKey, setAuthRsaRemoteKey] = useState("");
  const [authRsaPassphrase, setAuthRsaPassphrase] = useState("");

  // Tunnels
  const [tunnels, setTunnels] = useState<TunnelRow[]>([]);

  // VTI
  const [vtiBind, setVtiBind] = useState("");
  const [vtiEspGroup, setVtiEspGroup] = useState("");
  const [vtiTsLocalPrefix, setVtiTsLocalPrefix] = useState("");
  const [vtiTsRemotePrefix, setVtiTsRemotePrefix] = useState("");

  const [allInterfaces, setAllInterfaces] = useState<InterfaceName[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    showService.getAllInterfaces().then((res) => setAllInterfaces(res.interfaces)).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      if (existingPeer) {
        setName(existingPeer.name);
        setDescription(existingPeer.description || "");
        setIkeGroup(existingPeer.ike_group || "");
        setDefaultEspGroup(existingPeer.default_esp_group || "");
        setLocalAddress(existingPeer.local_address || "");
        setRemoteAddresses((existingPeer.remote_address || []).join(", "));
        setConnectionType(existingPeer.connection_type || "initiate");
        setDhcpInterface(existingPeer.dhcp_interface || "");
        setForceUdp(existingPeer.force_udp_encapsulation || false);
        const auth = existingPeer.authentication;
        setAuthMode(auth?.mode || "pre-shared-secret");
        setAuthLocalId(auth?.local_id || "");
        setAuthRemoteId(auth?.remote_id || "");
        setAuthX509CaCert(auth?.x509?.ca_certificate?.[0] || "");
        setAuthX509Cert(auth?.x509?.certificate || "");
        setAuthX509Passphrase(auth?.x509?.passphrase || "");
        setAuthRsaLocalKey(auth?.rsa?.local_key || "");
        setAuthRsaRemoteKey(auth?.rsa?.remote_key || "");
        setAuthRsaPassphrase(auth?.rsa?.passphrase || "");
        setTunnels(
          existingPeer.tunnels.map((t) => ({
            number: t.number,
            esp_group: t.esp_group || "",
            local_prefix: (t.local_prefix || []).join(", "),
            remote_prefix: (t.remote_prefix || []).join(", "),
            protocol: t.protocol || "",
          }))
        );
        const vti = existingPeer.vti;
        setVtiBind(vti?.bind || "");
        setVtiEspGroup(vti?.esp_group || "");
        setVtiTsLocalPrefix((vti?.traffic_selector?.local_prefix || []).join(", "));
        setVtiTsRemotePrefix((vti?.traffic_selector?.remote_prefix || []).join(", "));
      } else {
        setName("");
        setDescription("");
        setIkeGroup("");
        setDefaultEspGroup("");
        setLocalAddress("");
        setRemoteAddresses("");
        setConnectionType("initiate");
        setDhcpInterface("");
        setForceUdp(false);
        setAuthMode("pre-shared-secret");
        setAuthLocalId("");
        setAuthRemoteId("");
        setAuthX509CaCert("");
        setAuthX509Cert("");
        setAuthX509Passphrase("");
        setAuthRsaLocalKey("");
        setAuthRsaRemoteKey("");
        setAuthRsaPassphrase("");
        setTunnels([]);
        setVtiBind("");
        setVtiEspGroup("");
        setVtiTsLocalPrefix("");
        setVtiTsRemotePrefix("");
      }
      setError(null);
    }
  }, [open, existingPeer]);

  const addTunnel = () => {
    const nextNum = String(tunnels.length > 0 ? Math.max(...tunnels.map((t) => parseInt(t.number)), 0) + 1 : 0);
    setTunnels([...tunnels, { number: nextNum, esp_group: "", local_prefix: "", remote_prefix: "", protocol: "" }]);
  };

  const removeTunnel = (num: string) => {
    setTunnels(tunnels.filter((t) => t.number !== num));
  };

  const updateTunnel = (num: string, field: keyof TunnelRow, value: string) => {
    setTunnels(tunnels.map((t) => (t.number === num ? { ...t, [field]: value } : t)));
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Peer name is required"); return; }
    if (!ikeGroup) { setError("IKE group is required"); return; }

    setLoading(true);
    setError(null);

    try {
      if (isEdit) await ipsecService.deleteS2SPeer(existingPeer!.name);

      const remoteAddrs = remoteAddresses.split(",").map((a) => a.trim()).filter(Boolean);

      const tunnelConfigs = tunnels.map((t) => {
        const localPrefixes = t.local_prefix.split(",").map((p) => p.trim()).filter(Boolean);
        const remotePrefixes = t.remote_prefix.split(",").map((p) => p.trim()).filter(Boolean);
        return {
          number: t.number,
          esp_group: t.esp_group || undefined,
          local_prefix: localPrefixes.length > 0 ? localPrefixes : undefined,
          remote_prefix: remotePrefixes.length > 0 ? remotePrefixes : undefined,
          protocol: t.protocol || undefined,
        };
      });

      const result = await ipsecService.createS2SPeer(name.trim(), {
        ike_group: ikeGroup || undefined,
        default_esp_group: defaultEspGroup || undefined,
        local_address: localAddress || undefined,
        remote_addresses: remoteAddrs.length > 0 ? remoteAddrs : undefined,
        description: description || undefined,
        connection_type: connectionType || undefined,
        dhcp_interface: dhcpInterface || undefined,
        auth_mode: authMode || undefined,
        auth_local_id: authLocalId || undefined,
        auth_remote_id: authRemoteId || undefined,
        auth_x509_ca_cert: authMode === "x509" ? (authX509CaCert || undefined) : undefined,
        auth_x509_cert: authMode === "x509" ? (authX509Cert || undefined) : undefined,
        auth_x509_passphrase: authMode === "x509" ? (authX509Passphrase || undefined) : undefined,
        auth_rsa_local_key: authMode === "rsa" ? (authRsaLocalKey || undefined) : undefined,
        auth_rsa_remote_key: authMode === "rsa" ? (authRsaRemoteKey || undefined) : undefined,
        auth_rsa_passphrase: authMode === "rsa" ? (authRsaPassphrase || undefined) : undefined,
        force_udp_encapsulation: forceUdp || undefined,
        vti_bind: vtiBind || undefined,
        vti_esp_group: vtiBind ? (vtiEspGroup || undefined) : undefined,
        vti_ts_local_prefix: vtiBind
          ? (vtiTsLocalPrefix.split(",").map((p) => p.trim()).filter(Boolean) || undefined)
          : undefined,
        vti_ts_remote_prefix: vtiBind
          ? (vtiTsRemotePrefix.split(",").map((p) => p.trim()).filter(Boolean) || undefined)
          : undefined,
        tunnels: tunnelConfigs.length > 0 ? tunnelConfigs : undefined,
      });

      if (!result.success) {
        setError(result.error || "Failed to create peer");
        setLoading(false);
        return;
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to save peer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            {isEdit ? "Edit" : "Create"} Site-to-Site Peer
          </DialogTitle>
          <DialogDescription>Configure an IPSec site-to-site VPN peer connection.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="auth">Authentication</TabsTrigger>
            <TabsTrigger value="tunnels">Tunnels</TabsTrigger>
            <TabsTrigger value="vti">VTI</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Peer Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="peer-1" disabled={isEdit} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Remote office VPN" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>IKE Group *</Label>
                <Select value={ikeGroup} onValueChange={setIkeGroup}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {ikeGroups.map((g) => <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default ESP Group</Label>
                <Select value={defaultEspGroup} onValueChange={setDefaultEspGroup}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {espGroups.map((g) => <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Local Address</Label>
                <Input value={localAddress} onChange={(e) => setLocalAddress(e.target.value)} placeholder="any or IP address" />
              </div>
              <div className="space-y-2">
                <Label>Remote Address(es)</Label>
                <Input value={remoteAddresses} onChange={(e) => setRemoteAddresses(e.target.value)} placeholder="203.0.113.1" />
                <p className="text-xs text-muted-foreground">Comma-separated for multiple</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Connection Type</Label>
                <Select value={connectionType} onValueChange={setConnectionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initiate">Initiate</SelectItem>
                    <SelectItem value="respond">Respond</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>DHCP Interface (optional)</Label>
                <InterfaceSelect
                  value={dhcpInterface || "_none"}
                  onValueChange={(v) => setDhcpInterface(v === "_none" ? "" : v)}
                  interfaces={allInterfaces}
                  noneOption={{ label: "None", value: "_none" }}
                  placeholder="None"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="forceUdp" checked={forceUdp} onCheckedChange={(c) => setForceUdp(c === true)} />
              <Label htmlFor="forceUdp" className="cursor-pointer text-sm">Force UDP Encapsulation</Label>
            </div>
          </TabsContent>

          <TabsContent value="auth" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Authentication Mode</Label>
              <Select value={authMode} onValueChange={setAuthMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre-shared-secret">Pre-Shared Secret</SelectItem>
                  <SelectItem value="rsa">RSA</SelectItem>
                  <SelectItem value="x509">X.509 Certificate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Local ID</Label>
                <Input value={authLocalId} onChange={(e) => setAuthLocalId(e.target.value)} placeholder="@local-id" />
              </div>
              <div className="space-y-2">
                <Label>Remote ID</Label>
                <Input value={authRemoteId} onChange={(e) => setAuthRemoteId(e.target.value)} placeholder="@remote-id" />
              </div>
            </div>
            {authMode === "x509" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CA Certificate</Label>
                    <Input value={authX509CaCert} onChange={(e) => setAuthX509CaCert(e.target.value)} placeholder="ca-cert-name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Certificate</Label>
                    <Input value={authX509Cert} onChange={(e) => setAuthX509Cert(e.target.value)} placeholder="cert-name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Passphrase (optional)</Label>
                  <Input value={authX509Passphrase} onChange={(e) => setAuthX509Passphrase(e.target.value)} placeholder="Private key passphrase" />
                </div>
              </>
            )}
            {authMode === "rsa" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Local Key</Label>
                    <Input value={authRsaLocalKey} onChange={(e) => setAuthRsaLocalKey(e.target.value)} placeholder="PKI key-pair name" />
                    <p className="text-xs text-muted-foreground">Name of PKI key-pair with local private key</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Remote Key</Label>
                    <Input value={authRsaRemoteKey} onChange={(e) => setAuthRsaRemoteKey(e.target.value)} placeholder="PKI key-pair name" />
                    <p className="text-xs text-muted-foreground">Name of PKI key-pair with remote public key</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Passphrase (optional)</Label>
                  <Input value={authRsaPassphrase} onChange={(e) => setAuthRsaPassphrase(e.target.value)} placeholder="Local private key passphrase" />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="tunnels" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Tunnels</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTunnel}>
                <Plus className="h-4 w-4 mr-1" /> Add Tunnel
              </Button>
            </div>
            {tunnels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No tunnels configured. Add a tunnel or use VTI binding (see the VTI tab) instead.
              </div>
            ) : (
              tunnels.map((t) => (
                <div key={t.number} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Tunnel {t.number}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeTunnel(t.number)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">ESP Group</Label>
                      <Select value={t.esp_group} onValueChange={(v) => updateTunnel(t.number, "esp_group", v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {espGroups.map((g) => <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Protocol</Label>
                      <Select value={t.protocol || "_none"} onValueChange={(v) => updateTunnel(t.number, "protocol", v === "_none" ? "" : v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Any" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Any</SelectItem>
                          <SelectItem value="gre">GRE</SelectItem>
                          <SelectItem value="ipip">IPIP</SelectItem>
                          <SelectItem value="ip">IP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Local Prefix</Label>
                      <Input className="h-9" value={t.local_prefix} onChange={(e) => updateTunnel(t.number, "local_prefix", e.target.value)} placeholder="10.0.0.0/24" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Remote Prefix</Label>
                      <Input className="h-9" value={t.remote_prefix} onChange={(e) => updateTunnel(t.number, "remote_prefix", e.target.value)} placeholder="10.1.0.0/24" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="vti" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">
              Bind a Virtual Tunnel Interface (VTI) to this peer for route-based VPN. The interface
              must already exist under Interfaces &rsaquo; VTI.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bound Interface</Label>
                <InterfaceSelect
                  value={vtiBind || "_none"}
                  onValueChange={(v) => setVtiBind(v === "_none" ? "" : v)}
                  interfaces={allInterfaces.filter((iface) => iface.name.startsWith("vti"))}
                  noneOption={{ label: "None", value: "_none" }}
                  placeholder="None"
                />
              </div>
              <div className="space-y-2">
                <Label>ESP Group</Label>
                <Select value={vtiEspGroup || "_none"} onValueChange={(v) => setVtiEspGroup(v === "_none" ? "" : v)} disabled={!vtiBind}>
                  <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Default</SelectItem>
                    {espGroups.map((g) => <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Traffic Selector — Local Prefix</Label>
                <Input value={vtiTsLocalPrefix} onChange={(e) => setVtiTsLocalPrefix(e.target.value)} placeholder="0.0.0.0/0" disabled={!vtiBind} />
                <p className="text-xs text-muted-foreground">Comma-separated for multiple</p>
              </div>
              <div className="space-y-2">
                <Label>Traffic Selector — Remote Prefix</Label>
                <Input value={vtiTsRemotePrefix} onChange={(e) => setVtiTsRemotePrefix(e.target.value)} placeholder="0.0.0.0/0" disabled={!vtiBind} />
                <p className="text-xs text-muted-foreground">Comma-separated for multiple</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? "Saving..." : "Creating..."}</> : isEdit ? "Save Changes" : "Create Peer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
