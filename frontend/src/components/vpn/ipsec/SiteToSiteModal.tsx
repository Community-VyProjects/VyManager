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
import { pkiService } from "@/lib/api/pki";
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
  disabled: boolean;
  local_port: string;
  remote_port: string;
  priority: string;
}

export function SiteToSiteModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
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
  const [disabled, setDisabled] = useState(false);
  const [ikev2Reauth, setIkev2Reauth] = useState("");
  const [replayWindow, setReplayWindow] = useState("");
  const [virtualAddresses, setVirtualAddresses] = useState("");
  const [unique, setUnique] = useState("");
  const [childless, setChildless] = useState("");

  // Auth
  const [authMode, setAuthMode] = useState("pre-shared-secret");
  const [authLocalId, setAuthLocalId] = useState("");
  const [authRemoteId, setAuthRemoteId] = useState("");
  const [useX509Id, setUseX509Id] = useState(false);
  const [caCerts, setCaCerts] = useState<string[]>([]);
  const [authX509Cert, setAuthX509Cert] = useState("");
  const [authX509Passphrase, setAuthX509Passphrase] = useState("");
  const [authRsaLocalKey, setAuthRsaLocalKey] = useState("");
  const [authRsaRemoteKey, setAuthRsaRemoteKey] = useState("");
  const [authRsaPassphrase, setAuthRsaPassphrase] = useState("");
  const [pkiCas, setPkiCas] = useState<string[]>([]);
  const [pkiCerts, setPkiCerts] = useState<string[]>([]);
  const [pkiKeys, setPkiKeys] = useState<string[]>([]);

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
    pkiService.getConfig().then((cfg) => {
      setPkiCas((cfg.ca || []).map((item) => item.name));
      setPkiCerts((cfg.certificates || []).map((item) => item.name));
      setPkiKeys((cfg.key_pairs || []).map((item) => item.name));
    }).catch(() => {});
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
        setConnectionType(existingPeer.connection_type || "");
        setDhcpInterface(existingPeer.dhcp_interface || "");
        setForceUdp(existingPeer.force_udp_encapsulation || false);
        setDisabled(existingPeer.disabled || false);
        setIkev2Reauth(existingPeer.ikev2_reauth || "");
        setReplayWindow(existingPeer.replay_window || "");
        setVirtualAddresses((existingPeer.virtual_address || []).join(", "));
        setUnique(existingPeer.unique || "");
        setChildless(existingPeer.childless || "");
        const auth = existingPeer.authentication;
        setAuthMode(auth?.mode || "pre-shared-secret");
        setAuthLocalId(auth?.local_id || "");
        setAuthRemoteId(auth?.remote_id || "");
        setUseX509Id(auth?.use_x509_id || false);
        setCaCerts(auth?.x509?.ca_certificate || []);
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
            disabled: t.disabled || false,
            local_port: t.local_port || "",
            remote_port: t.remote_port || "",
            priority: t.priority || "",
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
        setConnectionType("");
        setDhcpInterface("");
        setForceUdp(false);
        setDisabled(false);
        setIkev2Reauth("");
        setReplayWindow("");
        setVirtualAddresses("");
        setUnique("");
        setChildless("");
        setAuthMode("pre-shared-secret");
        setAuthLocalId("");
        setAuthRemoteId("");
        setUseX509Id(false);
        setCaCerts([]);
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
    setTunnels([...tunnels, { number: nextNum, esp_group: "", local_prefix: "", remote_prefix: "", protocol: "", disabled: false, local_port: "", remote_port: "", priority: "" }]);
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
          disabled: t.disabled,
          local_port: t.local_port || undefined,
          remote_port: t.remote_port || undefined,
          priority: t.priority || undefined,
        };
      });

      const payload = {
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
        auth_x509_ca_certs: authMode === "x509" ? caCerts : undefined,
        auth_x509_cert: authMode === "x509" ? (authX509Cert || undefined) : undefined,
        auth_x509_passphrase: authMode === "x509" ? (authX509Passphrase || undefined) : undefined,
        auth_rsa_local_key: authMode === "rsa" ? (authRsaLocalKey || undefined) : undefined,
        auth_rsa_remote_key: authMode === "rsa" ? (authRsaRemoteKey || undefined) : undefined,
        auth_rsa_passphrase: authMode === "rsa" ? (authRsaPassphrase || undefined) : undefined,
        force_udp_encapsulation: forceUdp,
        disabled,
        ikev2_reauth: ikev2Reauth || undefined,
        replay_window: replayWindow || undefined,
        virtual_addresses: virtualAddresses.split(",").map((a) => a.trim()).filter(Boolean),
        use_x509_id: authMode === "x509" ? useX509Id : false,
        unique: capabilities?.features.site_to_site.unique ? (unique || undefined) : undefined,
        childless: capabilities?.features.site_to_site.childless ? (childless || undefined) : undefined,
        vti_bind: vtiBind || undefined,
        vti_esp_group: vtiBind ? (vtiEspGroup || undefined) : undefined,
        vti_ts_local_prefix: vtiBind
          ? (vtiTsLocalPrefix.split(",").map((p) => p.trim()).filter(Boolean) || undefined)
          : undefined,
        vti_ts_remote_prefix: vtiBind
          ? (vtiTsRemotePrefix.split(",").map((p) => p.trim()).filter(Boolean) || undefined)
          : undefined,
        tunnels: tunnelConfigs.length > 0 ? tunnelConfigs : undefined,
      };
      const result = isEdit && existingPeer
        ? await ipsecService.updateS2SPeer(existingPeer.name, payload, existingPeer)
        : await ipsecService.createS2SPeer(name.trim(), payload);

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

  const connectionTypes = capabilities?.features.site_to_site.connection_types ?? ["initiate", "none"];
  const connectionLabel = (value: string) => {
    if (value === "initiate") return t("s2sModal.initiate");
    if (value === "respond") return t("s2sModal.respond");
    if (value === "trap") return t("s2sModal.trap");
    if (value === "none") return tc("none");
    return value;
  };
  const s2s = capabilities?.features.site_to_site;

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
                <Select value={defaultEspGroup || "_none"} onValueChange={(v) => setDefaultEspGroup(v === "_none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder={t("modal.select")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{tc("none")}</SelectItem>
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
                <Select value={connectionType || "_none"} onValueChange={(v) => setConnectionType(v === "_none" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{tc("default")}</SelectItem>
                    {connectionTypes.map((value) => <SelectItem key={value} value={value}>{connectionLabel(value)}</SelectItem>)}
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
            <div className="flex items-center gap-2">
              <Checkbox id="peerDisable" checked={disabled} onCheckedChange={(c) => setDisabled(c === true)} />
              <Label htmlFor="peerDisable" className="cursor-pointer text-sm">{t("s2sModal.disable")}</Label>
            </div>
            <div className="space-y-2">
              <Label>{t("s2sModal.ikev2Reauth")}</Label>
              <Select value={ikev2Reauth || "_none"} onValueChange={(v) => setIkev2Reauth(v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">{tc("default")}</SelectItem>
                  {(s2s?.ikev2_reauth_values || []).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("s2sModal.replayWindow")}</Label>
                <Input value={replayWindow} onChange={(e) => setReplayWindow(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("s2sModal.virtualAddress")}</Label>
                <Input value={virtualAddresses} onChange={(e) => setVirtualAddresses(e.target.value)} />
              </div>
            </div>
            {s2s?.unique && (
              <div className="space-y-2">
                <Label>{t("s2sModal.unique")}</Label>
                <Select value={unique || "_none"} onValueChange={(v) => setUnique(v === "_none" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{tc("none")}</SelectItem>
                    {(s2s.unique_values || []).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {s2s?.childless && (
              <div className="space-y-2">
                <Label>{t("s2sModal.childless")}</Label>
                <Select value={childless || "_none"} onValueChange={(v) => setChildless(v === "_none" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{tc("none")}</SelectItem>
                    {(s2s.childless_values || []).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
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
                <div className="flex items-center gap-2">
                  <Checkbox id="useX509Id" checked={useX509Id} onCheckedChange={(c) => setUseX509Id(c === true)} />
                  <Label htmlFor="useX509Id" className="cursor-pointer text-sm">{t("s2sModal.useX509Id")}</Label>
                </div>
                <div className="space-y-2">
                  <Label>{t("modal.caCertificate")}</Label>
                  <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                    {pkiCas.map((name) => (
                      <label key={name} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={caCerts.includes(name)}
                          onCheckedChange={(v) => setCaCerts(v ? [...caCerts, name] : caCerts.filter((item) => item !== name))}
                        />
                        <span>{name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("modal.certificate")}</Label>
                  <Select value={authX509Cert || "_none"} onValueChange={(v) => setAuthX509Cert(v === "_none" ? "" : v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">{tc("none")}</SelectItem>
                      {pkiCerts.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("s2sModal.passphraseOptional")}</Label>
                  <Input type="password" value={authX509Passphrase} onChange={(e) => setAuthX509Passphrase(e.target.value)} />
                </div>
              </>
            )}
            {authMode === "rsa" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("s2sModal.localKey")}</Label>
                    <Select value={authRsaLocalKey || "_none"} onValueChange={(v) => setAuthRsaLocalKey(v === "_none" ? "" : v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">{tc("none")}</SelectItem>
                        {pkiKeys.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("s2sModal.remoteKey")}</Label>
                    <Select value={authRsaRemoteKey || "_none"} onValueChange={(v) => setAuthRsaRemoteKey(v === "_none" ? "" : v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">{tc("none")}</SelectItem>
                        {pkiKeys.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("s2sModal.passphraseOptional")}</Label>
                  <Input type="password" value={authRsaPassphrase} onChange={(e) => setAuthRsaPassphrase(e.target.value)} />
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
                      <Select value={tun.esp_group || "_none"} onValueChange={(v) => updateTunnel(tun.number, "esp_group", v === "_none" ? "" : v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder={t("modal.select")} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">{tc("none")}</SelectItem>
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
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("s2sModal.localPort")}</Label>
                      <Input className="h-9" value={tun.local_port} onChange={(e) => updateTunnel(tun.number, "local_port", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("s2sModal.remotePort")}</Label>
                      <Input className="h-9" value={tun.remote_port} onChange={(e) => updateTunnel(tun.number, "remote_port", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t("s2sModal.priority")}</Label>
                      <Input className="h-9" value={tun.priority} onChange={(e) => updateTunnel(tun.number, "priority", e.target.value)} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id={`tun-disable-${tun.number}`} checked={tun.disabled} onCheckedChange={(c) => setTunnels(tunnels.map((row) => row.number === tun.number ? { ...row, disabled: c === true } : row))} />
                    <Label htmlFor={`tun-disable-${tun.number}`} className="cursor-pointer text-sm">{t("s2sModal.disable")}</Label>
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? tc("saving") : tc("creating")}</> : isEdit ? tc("saveChanges") : t("s2sModal.createPeer")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
