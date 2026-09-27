"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("ipsec");
  const tc = useTranslations("common");
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
    if (!name.trim()) { setError(t("s2sModal.peerNameRequired")); return; }
    if (!ikeGroup) { setError(t("s2sModal.ikeGroupRequired")); return; }

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
        setError(result.error || t("s2sModal.createFailed"));
        setLoading(false);
        return;
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("s2sModal.saveFailed"));
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
            {isEdit ? t("s2sModal.titleEdit") : t("s2sModal.titleCreate")}
          </DialogTitle>
          <DialogDescription>{t("s2sModal.description")}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">{t("s2sModal.general")}</TabsTrigger>
            <TabsTrigger value="auth">{t("page.tabs.authentication")}</TabsTrigger>
            <TabsTrigger value="tunnels">{t("page.s2s.tunnels")}</TabsTrigger>
            <TabsTrigger value="vti">VTI</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t("s2sModal.peerName")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="peer-1" disabled={isEdit} />
            </div>
            <div className="space-y-2">
              <Label>{tc("description")}</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("s2sModal.descriptionPlaceholder")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("s2sModal.ikeGroupLabel")}</Label>
                <Select value={ikeGroup} onValueChange={setIkeGroup}>
                  <SelectTrigger><SelectValue placeholder={t("modal.select")} /></SelectTrigger>
                  <SelectContent>
                    {ikeGroups.map((g) => <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("s2sModal.defaultEspGroup")}</Label>
                <Select value={defaultEspGroup} onValueChange={setDefaultEspGroup}>
                  <SelectTrigger><SelectValue placeholder={t("modal.select")} /></SelectTrigger>
                  <SelectContent>
                    {espGroups.map((g) => <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("page.ra.localAddress")}</Label>
                <Input value={localAddress} onChange={(e) => setLocalAddress(e.target.value)} placeholder={t("s2sModal.localAddressPlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label>{t("s2sModal.remoteAddresses")}</Label>
                <Input value={remoteAddresses} onChange={(e) => setRemoteAddresses(e.target.value)} placeholder="203.0.113.1" />
                <p className="text-xs text-muted-foreground">{t("s2sModal.commaSeparated")}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("s2sModal.connectionType")}</Label>
                <Select value={connectionType} onValueChange={setConnectionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initiate">{t("s2sModal.initiate")}</SelectItem>
                    <SelectItem value="respond">{t("s2sModal.respond")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("s2sModal.dhcpInterface")}</Label>
                <InterfaceSelect
                  value={dhcpInterface || "_none"}
                  onValueChange={(v) => setDhcpInterface(v === "_none" ? "" : v)}
                  interfaces={allInterfaces}
                  noneOption={{ label: tc("none"), value: "_none" }}
                  placeholder={tc("none")}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="forceUdp" checked={forceUdp} onCheckedChange={(c) => setForceUdp(c === true)} />
              <Label htmlFor="forceUdp" className="cursor-pointer text-sm">{t("s2sModal.forceUdp")}</Label>
            </div>
          </TabsContent>

          <TabsContent value="auth" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t("s2sModal.authMode")}</Label>
              <Select value={authMode} onValueChange={setAuthMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre-shared-secret">{t("modal.preSharedSecret")}</SelectItem>
                  <SelectItem value="rsa">RSA</SelectItem>
                  <SelectItem value="x509">{t("s2sModal.x509Certificate")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("modal.localId")}</Label>
                <Input value={authLocalId} onChange={(e) => setAuthLocalId(e.target.value)} placeholder="@local-id" />
              </div>
              <div className="space-y-2">
                <Label>{t("s2sModal.remoteId")}</Label>
                <Input value={authRemoteId} onChange={(e) => setAuthRemoteId(e.target.value)} placeholder="@remote-id" />
              </div>
            </div>
            {authMode === "x509" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("modal.caCertificate")}</Label>
                    <Input value={authX509CaCert} onChange={(e) => setAuthX509CaCert(e.target.value)} placeholder="ca-cert-name" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("modal.certificate")}</Label>
                    <Input value={authX509Cert} onChange={(e) => setAuthX509Cert(e.target.value)} placeholder="cert-name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("s2sModal.passphraseOptional")}</Label>
                  <Input value={authX509Passphrase} onChange={(e) => setAuthX509Passphrase(e.target.value)} placeholder={t("s2sModal.privateKeyPassphrase")} />
                </div>
              </>
            )}
            {authMode === "rsa" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("s2sModal.localKey")}</Label>
                    <Input value={authRsaLocalKey} onChange={(e) => setAuthRsaLocalKey(e.target.value)} placeholder={t("s2sModal.keyPairName")} />
                    <p className="text-xs text-muted-foreground">{t("s2sModal.localKeyHelp")}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("s2sModal.remoteKey")}</Label>
                    <Input value={authRsaRemoteKey} onChange={(e) => setAuthRsaRemoteKey(e.target.value)} placeholder={t("s2sModal.keyPairName")} />
                    <p className="text-xs text-muted-foreground">{t("s2sModal.remoteKeyHelp")}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("s2sModal.passphraseOptional")}</Label>
                  <Input value={authRsaPassphrase} onChange={(e) => setAuthRsaPassphrase(e.target.value)} placeholder={t("s2sModal.localPrivateKeyPassphrase")} />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="tunnels" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t("page.s2s.tunnels")}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTunnel}>
                <Plus className="h-4 w-4 mr-1" /> {t("s2sModal.addTunnel")}
              </Button>
            </div>
            {tunnels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {t("s2sModal.noTunnels")}
              </div>
            ) : (
              tunnels.map((tun) => (
                <div key={tun.number} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t("s2sModal.tunnelN", { number: tun.number })}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeTunnel(tun.number)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("page.espGroup")}</Label>
                      <Select value={tun.esp_group} onValueChange={(v) => updateTunnel(tun.number, "esp_group", v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder={t("modal.select")} /></SelectTrigger>
                        <SelectContent>
                          {espGroups.map((g) => <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("s2sModal.protocol")}</Label>
                      <Select value={tun.protocol || "_none"} onValueChange={(v) => updateTunnel(tun.number, "protocol", v === "_none" ? "" : v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder={t("s2sModal.any")} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">{t("s2sModal.any")}</SelectItem>
                          <SelectItem value="gre">GRE</SelectItem>
                          <SelectItem value="ipip">IPIP</SelectItem>
                          <SelectItem value="ip">IP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("s2sModal.localPrefix")}</Label>
                      <Input className="h-9" value={tun.local_prefix} onChange={(e) => updateTunnel(tun.number, "local_prefix", e.target.value)} placeholder="10.0.0.0/24" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("s2sModal.remotePrefix")}</Label>
                      <Input className="h-9" value={tun.remote_prefix} onChange={(e) => updateTunnel(tun.number, "remote_prefix", e.target.value)} placeholder="10.1.0.0/24" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="vti" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">
              {t("s2sModal.vtiHelp")}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("s2sModal.boundInterface")}</Label>
                <InterfaceSelect
                  value={vtiBind || "_none"}
                  onValueChange={(v) => setVtiBind(v === "_none" ? "" : v)}
                  interfaces={allInterfaces.filter((iface) => iface.name.startsWith("vti"))}
                  noneOption={{ label: tc("none"), value: "_none" }}
                  placeholder={tc("none")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("page.espGroup")}</Label>
                <Select value={vtiEspGroup || "_none"} onValueChange={(v) => setVtiEspGroup(v === "_none" ? "" : v)} disabled={!vtiBind}>
                  <SelectTrigger><SelectValue placeholder={tc("default")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{tc("default")}</SelectItem>
                    {espGroups.map((g) => <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("s2sModal.tsLocalPrefix")}</Label>
                <Input value={vtiTsLocalPrefix} onChange={(e) => setVtiTsLocalPrefix(e.target.value)} placeholder="0.0.0.0/0" disabled={!vtiBind} />
                <p className="text-xs text-muted-foreground">{t("s2sModal.commaSeparated")}</p>
              </div>
              <div className="space-y-2">
                <Label>{t("s2sModal.tsRemotePrefix")}</Label>
                <Input value={vtiTsRemotePrefix} onChange={(e) => setVtiTsRemotePrefix(e.target.value)} placeholder="0.0.0.0/0" disabled={!vtiBind} />
                <p className="text-xs text-muted-foreground">{t("s2sModal.commaSeparated")}</p>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? tc("saving") : t("modal.creating")}</> : isEdit ? t("modal.saveChanges") : t("s2sModal.createPeer")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
