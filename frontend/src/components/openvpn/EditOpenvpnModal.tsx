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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  openvpnService,
  type OpenvpnCapabilities,
  type OpenvpnCreateConfig,
  type OpenvpnInterface,
} from "@/lib/api/openvpn";
import { pkiService, type PKIConfigResponse } from "@/lib/api/pki";
import { showService, type InterfaceName } from "@/lib/api/show";
import { ApiError } from "@/lib/types/api";
import {
  LEGACY_CIPHERS,
  DATA_CIPHERS,
  HASH_ALGORITHMS,
  TLS_VERSIONS,
} from "./constants";

interface EditOpenvpnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: OpenvpnCapabilities | null;
  interfaceData: OpenvpnInterface;
}

interface PushRouteEntry {
  route: string;
  metric: string;
}

interface ClientEntry {
  name: string;
  disable: boolean;
  ip: string;
  subnet: string;
  push_route: string;
}

interface LocalAddressEntry {
  address: string;
  subnet_mask: string;
}

const joinLines = (arr: string[]): string => arr.join("\n");

export function EditOpenvpnModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  interfaceData,
}: EditOpenvpnModalProps) {
  const is15 = capabilities?.version_info.is_1_5 ?? false;

  const [description, setDescription] = useState("");
  const [mode, setMode] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [protocol, setProtocol] = useState("");
  const [vrf, setVrf] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [persistentTunnel, setPersistentTunnel] = useState(false);
  const [useLzo, setUseLzo] = useState(false);
  const [offloadDco, setOffloadDco] = useState(false);
  const [redirect, setRedirect] = useState("");
  const [replaceDefaultRoute, setReplaceDefaultRoute] = useState(false);
  const [replaceDefaultRouteLocal, setReplaceDefaultRouteLocal] = useState(false);
  const [openvpnOptionsText, setOpenvpnOptionsText] = useState("");

  const [localHost, setLocalHost] = useState("");
  const [localPort, setLocalPort] = useState("");
  const [remotePort, setRemotePort] = useState("");
  const [localAddresses, setLocalAddresses] = useState<LocalAddressEntry[]>([]);
  const [remoteAddressText, setRemoteAddressText] = useState("");
  const [remoteHostText, setRemoteHostText] = useState("");
  const [keepAliveInterval, setKeepAliveInterval] = useState("");
  const [keepAliveFailure, setKeepAliveFailure] = useState("");

  const [cipher, setCipher] = useState("");
  const [dataCiphers, setDataCiphers] = useState<string[]>([]);
  const [dataCiphersFallback, setDataCiphersFallback] = useState("");
  const [hash, setHash] = useState("");

  const [tlsCa, setTlsCa] = useState("");
  const [tlsCert, setTlsCert] = useState("");
  const [tlsDh, setTlsDh] = useState("");
  const [tlsAuthKey, setTlsAuthKey] = useState("");
  const [tlsCryptKey, setTlsCryptKey] = useState("");
  const [tlsRole, setTlsRole] = useState("");
  const [tlsVersionMin, setTlsVersionMin] = useState("");
  const [tlsFingerprintsText, setTlsFingerprintsText] = useState("");
  const [sharedSecretKey, setSharedSecretKey] = useState("");

  const [serverSubnetText, setServerSubnetText] = useState("");
  const [serverTopology, setServerTopology] = useState("");
  const [serverDomainName, setServerDomainName] = useState("");
  const [serverMaxConnections, setServerMaxConnections] = useState("");
  const [serverNameServersText, setServerNameServersText] = useState("");
  const [serverRejectUnconfigured, setServerRejectUnconfigured] = useState(false);
  const [serverPushRoutes, setServerPushRoutes] = useState<PushRouteEntry[]>([]);
  const [serverClientIpPoolStart, setServerClientIpPoolStart] = useState("");
  const [serverClientIpPoolStop, setServerClientIpPoolStop] = useState("");
  const [serverClientIpPoolMask, setServerClientIpPoolMask] = useState("");
  const [serverClientIpPoolDisable, setServerClientIpPoolDisable] = useState(false);
  const [serverClientIpv6PoolBase, setServerClientIpv6PoolBase] = useState("");
  const [serverClientIpv6PoolDisable, setServerClientIpv6PoolDisable] = useState(false);
  const [serverClients, setServerClients] = useState<ClientEntry[]>([]);
  const [serverBridgeGateway, setServerBridgeGateway] = useState("");
  const [serverBridgeStart, setServerBridgeStart] = useState("");
  const [serverBridgeStop, setServerBridgeStop] = useState("");
  const [serverBridgeMask, setServerBridgeMask] = useState("");
  const [serverBridgeDisable, setServerBridgeDisable] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState("");
  const [mfaDigits, setMfaDigits] = useState("");
  const [mfaDrift, setMfaDrift] = useState("");
  const [mfaSlop, setMfaSlop] = useState("");
  const [mfaStep, setMfaStep] = useState("");

  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  const [ipAdjustMss, setIpAdjustMss] = useState("");
  const [ipArpCacheTimeout, setIpArpCacheTimeout] = useState("");
  const [ipDisableArpFilter, setIpDisableArpFilter] = useState(false);
  const [ipDisableForwarding, setIpDisableForwarding] = useState(false);
  const [ipEnableArpAccept, setIpEnableArpAccept] = useState(false);
  const [ipEnableArpAnnounce, setIpEnableArpAnnounce] = useState(false);
  const [ipEnableArpIgnore, setIpEnableArpIgnore] = useState(false);
  const [ipEnableDirectedBroadcast, setIpEnableDirectedBroadcast] = useState(false);
  const [ipEnableProxyArp, setIpEnableProxyArp] = useState(false);
  const [ipProxyArpPvlan, setIpProxyArpPvlan] = useState(false);
  const [ipSourceValidation, setIpSourceValidation] = useState("");

  const [ipv6AcceptDad, setIpv6AcceptDad] = useState("");
  const [ipv6AddressAutoconf, setIpv6AddressAutoconf] = useState(false);
  const [ipv6AddressEui64, setIpv6AddressEui64] = useState("");
  const [ipv6AddressNoDefaultLinkLocal, setIpv6AddressNoDefaultLinkLocal] = useState(false);
  const [ipv6AdjustMss, setIpv6AdjustMss] = useState("");
  const [ipv6BaseReachableTime, setIpv6BaseReachableTime] = useState("");
  const [ipv6DupAddrDetectTransmits, setIpv6DupAddrDetectTransmits] = useState("");
  const [ipv6DisableForwarding, setIpv6DisableForwarding] = useState(false);
  const [ipv6InterfaceIdentifier, setIpv6InterfaceIdentifier] = useState("");
  const [ipv6SourceValidation, setIpv6SourceValidation] = useState("");

  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");

  const [pki, setPki] = useState<PKIConfigResponse | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("basic");

  useEffect(() => {
    if (!open) return;
    pkiService.getConfig().then(setPki).catch(() => {});
    showService
      .getAllInterfaces()
      .then((res) => setAvailableInterfaces(res.interfaces))
      .catch(() => {});
    const i = interfaceData;
    setDescription(i.description ?? "");
    setMode(i.mode ?? "");
    setDeviceType(i.device_type ?? "");
    setProtocol(i.protocol ?? "");
    setVrf(i.vrf ?? "");
    setDisabled(i.disabled);
    setPersistentTunnel(i.persistent_tunnel);
    setUseLzo(i.use_lzo_compression);
    setOffloadDco(i.offload_dco);
    setRedirect(i.redirect ?? "");
    setReplaceDefaultRoute(i.replace_default_route?.enabled ?? false);
    setReplaceDefaultRouteLocal(i.replace_default_route?.local ?? false);
    setOpenvpnOptionsText(joinLines(i.openvpn_options));

    setLocalHost(i.local_host ?? "");
    setLocalPort(i.local_port ?? "");
    setRemotePort(i.remote_port ?? "");
    setLocalAddresses(
      i.local_addresses.map((la) => ({
        address: la.address,
        subnet_mask: la.subnet_mask ?? "",
      }))
    );
    setRemoteAddressText(joinLines(i.remote_address));
    setRemoteHostText(joinLines(i.remote_host));
    setKeepAliveInterval(i.keep_alive?.interval ?? "");
    setKeepAliveFailure(i.keep_alive?.failure_count ?? "");

    setCipher(i.encryption?.cipher ?? "");
    setDataCiphers(i.encryption?.data_ciphers ?? []);
    setDataCiphersFallback(i.encryption?.data_ciphers_fallback ?? "");
    setHash(i.hash ?? "");

    setTlsCa(i.tls?.ca_certificate ?? "");
    setTlsCert(i.tls?.certificate ?? "");
    setTlsDh(i.tls?.dh_params ?? "");
    setTlsAuthKey(i.tls?.auth_key ?? "");
    setTlsCryptKey(i.tls?.crypt_key ?? "");
    setTlsRole(i.tls?.role ?? "");
    setTlsVersionMin(i.tls?.tls_version_min ?? "");
    setTlsFingerprintsText(joinLines(i.tls?.peer_fingerprints ?? []));
    setSharedSecretKey(i.shared_secret_key ?? "");

    const s = i.server;
    setServerSubnetText(joinLines(s?.subnet ?? []));
    setServerTopology(s?.topology ?? "");
    setServerDomainName(s?.domain_name ?? "");
    setServerMaxConnections(s?.max_connections ?? "");
    setServerNameServersText(joinLines(s?.name_server ?? []));
    setServerRejectUnconfigured(s?.reject_unconfigured_clients ?? false);
    setServerPushRoutes(
      (s?.push_route ?? []).map((pr) => ({ route: pr.route, metric: pr.metric ?? "" }))
    );
    setServerClientIpPoolStart(s?.client_ip_pool?.start ?? "");
    setServerClientIpPoolStop(s?.client_ip_pool?.stop ?? "");
    setServerClientIpPoolMask(s?.client_ip_pool?.subnet_mask ?? "");
    setServerClientIpPoolDisable(s?.client_ip_pool?.disable ?? false);
    setServerClientIpv6PoolBase(s?.client_ipv6_pool?.base ?? "");
    setServerClientIpv6PoolDisable(s?.client_ipv6_pool?.disable ?? false);
    setServerClients(
      (s?.clients ?? []).map((c) => ({
        name: c.name,
        disable: c.disable,
        ip: c.ip ?? "",
        subnet: joinLines(c.subnet),
        push_route: joinLines(c.push_route),
      }))
    );
    setServerBridgeGateway(s?.bridge?.gateway ?? "");
    setServerBridgeStart(s?.bridge?.start ?? "");
    setServerBridgeStop(s?.bridge?.stop ?? "");
    setServerBridgeMask(s?.bridge?.subnet_mask ?? "");
    setServerBridgeDisable(s?.bridge?.disable ?? false);
    setMfaChallenge(s?.mfa_totp?.challenge ?? "");
    setMfaDigits(s?.mfa_totp?.digits ?? "");
    setMfaDrift(s?.mfa_totp?.drift ?? "");
    setMfaSlop(s?.mfa_totp?.slop ?? "");
    setMfaStep(s?.mfa_totp?.step ?? "");

    setAuthUsername(i.authentication?.username ?? "");
    setAuthPassword(i.authentication?.password ?? "");

    setIpAdjustMss(i.ip?.adjust_mss ?? "");
    setIpArpCacheTimeout(i.ip?.arp_cache_timeout ?? "");
    setIpDisableArpFilter(i.ip?.disable_arp_filter ?? false);
    setIpDisableForwarding(i.ip?.disable_forwarding ?? false);
    setIpEnableArpAccept(i.ip?.enable_arp_accept ?? false);
    setIpEnableArpAnnounce(i.ip?.enable_arp_announce ?? false);
    setIpEnableArpIgnore(i.ip?.enable_arp_ignore ?? false);
    setIpEnableDirectedBroadcast(i.ip?.enable_directed_broadcast ?? false);
    setIpEnableProxyArp(i.ip?.enable_proxy_arp ?? false);
    setIpProxyArpPvlan(i.ip?.proxy_arp_pvlan ?? false);
    setIpSourceValidation(i.ip?.source_validation ?? "");

    setIpv6AcceptDad(i.ipv6?.accept_dad ?? "");
    setIpv6AddressAutoconf(i.ipv6?.address_autoconf ?? false);
    setIpv6AddressEui64(i.ipv6?.address_eui64 ?? "");
    setIpv6AddressNoDefaultLinkLocal(i.ipv6?.address_no_default_link_local ?? false);
    setIpv6AdjustMss(i.ipv6?.adjust_mss ?? "");
    setIpv6BaseReachableTime(i.ipv6?.base_reachable_time ?? "");
    setIpv6DupAddrDetectTransmits(i.ipv6?.dup_addr_detect_transmits ?? "");
    setIpv6DisableForwarding(i.ipv6?.disable_forwarding ?? false);
    setIpv6InterfaceIdentifier(i.ipv6?.address_interface_identifier ?? "");
    setIpv6SourceValidation(i.ipv6?.source_validation ?? "");

    setMirrorIngress(i.mirror_ingress ?? "");
    setMirrorEgress(i.mirror_egress ?? "");

    setError(null);
    setActiveTab("basic");
  }, [open, interfaceData]);

  const splitLines = (s: string): string[] =>
    s.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  const buildUpdate = (): Partial<OpenvpnCreateConfig> => {
    const update: Partial<OpenvpnCreateConfig> = {};
    update.description = description;
    update.mode = mode;
    update.device_type = deviceType;
    update.protocol = protocol;
    update.vrf = vrf;
    update.disabled = disabled;
    update.persistent_tunnel = persistentTunnel;
    update.use_lzo_compression = useLzo;
    update.offload_dco = offloadDco;
    update.redirect = redirect;
    update.replace_default_route = {
      enabled: replaceDefaultRoute,
      local: replaceDefaultRouteLocal,
    };
    update.openvpn_options = splitLines(openvpnOptionsText);

    update.local_host = localHost;
    update.local_port = localPort;
    update.remote_port = remotePort;
    update.local_addresses = localAddresses
      .filter((la) => la.address)
      .map((la) => ({
        address: la.address,
        subnet_mask: la.subnet_mask || undefined,
      }));
    update.remote_address = splitLines(remoteAddressText);
    update.remote_host = splitLines(remoteHostText);
    update.keep_alive = {
      interval: keepAliveInterval,
      failure_count: keepAliveFailure,
    };

    update.encryption = {
      cipher,
      data_ciphers: dataCiphers,
      data_ciphers_fallback: dataCiphersFallback,
    };
    update.hash = hash;
    update.shared_secret_key = sharedSecretKey;

    update.tls = {
      ca_certificate: tlsCa,
      certificate: tlsCert,
      dh_params: tlsDh,
      auth_key: tlsAuthKey,
      crypt_key: tlsCryptKey,
      role: tlsRole,
      tls_version_min: tlsVersionMin,
      peer_fingerprints: splitLines(tlsFingerprintsText),
    };

    if (mode === "server") {
      update.server = {
        subnet: splitLines(serverSubnetText),
        topology: serverTopology,
        domain_name: serverDomainName,
        max_connections: serverMaxConnections,
        name_server: splitLines(serverNameServersText),
        reject_unconfigured_clients: serverRejectUnconfigured,
        push_route: serverPushRoutes
          .filter((pr) => pr.route)
          .map((pr) => ({ route: pr.route, metric: pr.metric || undefined })),
        client_ip_pool: {
          start: serverClientIpPoolStart,
          stop: serverClientIpPoolStop,
          subnet_mask: serverClientIpPoolMask,
          disable: serverClientIpPoolDisable,
        },
        client_ipv6_pool: {
          base: serverClientIpv6PoolBase,
          disable: serverClientIpv6PoolDisable,
        },
        bridge: {
          gateway: serverBridgeGateway,
          start: serverBridgeStart,
          stop: serverBridgeStop,
          subnet_mask: serverBridgeMask,
          disable: serverBridgeDisable,
        },
        mfa_totp: {
          challenge: mfaChallenge,
          digits: mfaDigits,
          drift: mfaDrift,
          slop: mfaSlop,
          step: mfaStep,
        },
        clients: serverClients
          .filter((c) => c.name)
          .map((c) => ({
            name: c.name,
            disable: c.disable,
            ip: c.ip || undefined,
            subnet: c.subnet ? splitLines(c.subnet) : undefined,
            push_route: c.push_route ? splitLines(c.push_route) : undefined,
          })),
      };
    }

    update.authentication = { username: authUsername, password: authPassword };

    update.ip = {
      adjust_mss: ipAdjustMss,
      arp_cache_timeout: ipArpCacheTimeout,
      disable_arp_filter: ipDisableArpFilter,
      disable_forwarding: ipDisableForwarding,
      enable_arp_accept: ipEnableArpAccept,
      enable_arp_announce: ipEnableArpAnnounce,
      enable_arp_ignore: ipEnableArpIgnore,
      enable_directed_broadcast: ipEnableDirectedBroadcast,
      enable_proxy_arp: ipEnableProxyArp,
      proxy_arp_pvlan: ipProxyArpPvlan,
      source_validation: ipSourceValidation,
    };
    update.ipv6 = {
      accept_dad: ipv6AcceptDad,
      address_autoconf: ipv6AddressAutoconf,
      address_eui64: ipv6AddressEui64,
      address_no_default_link_local: ipv6AddressNoDefaultLinkLocal,
      adjust_mss: ipv6AdjustMss,
      base_reachable_time: ipv6BaseReachableTime,
      disable_forwarding: ipv6DisableForwarding,
      dup_addr_detect_transmits: ipv6DupAddrDetectTransmits,
      address_interface_identifier: ipv6InterfaceIdentifier,
      source_validation: ipv6SourceValidation,
    };

    update.mirror_ingress = mirrorIngress;
    update.mirror_egress = mirrorEgress;

    return update;
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await openvpnService.updateInterface(
        interfaceData.name,
        interfaceData,
        buildUpdate()
      );
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to update OpenVPN interface");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to update OpenVPN interface");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Interface: {interfaceData.name}</DialogTitle>
          <DialogDescription>Modify the OpenVPN interface configuration.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="encryption">Encryption</TabsTrigger>
            <TabsTrigger value="tls">TLS</TabsTrigger>
            <TabsTrigger value="server" disabled={mode !== "server"}>
              Server
            </TabsTrigger>
            <TabsTrigger value="auth">Auth</TabsTrigger>
            <TabsTrigger value="ip">IP</TabsTrigger>
            <TabsTrigger value="mirror">Mirror</TabsTrigger>
          </TabsList>

          {/* Basic */}
          <TabsContent value="basic" className="space-y-4">
            <div>
              <Label htmlFor="ename">Interface Name</Label>
              <Input id="ename" value={interfaceData.name} disabled />
            </div>
            <div>
              <Label htmlFor="edesc">Description</Label>
              <Input
                id="edesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emode">Mode</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger id="emode">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="server">Server</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="site-to-site">Site-to-Site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edevicetype">Device Type</Label>
                <Select value={deviceType} onValueChange={setDeviceType}>
                  <SelectTrigger id="edevicetype">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tun">tun</SelectItem>
                    <SelectItem value="tap">tap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eproto">Protocol</Label>
                <Select value={protocol} onValueChange={setProtocol}>
                  <SelectTrigger id="eproto">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="udp">udp</SelectItem>
                    <SelectItem value="tcp-active">tcp-active</SelectItem>
                    <SelectItem value="tcp-passive">tcp-passive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="evrf">VRF</Label>
                <Input id="evrf" value={vrf} onChange={(e) => setVrf(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="eredirect">Redirect</Label>
              <Select value={redirect} onValueChange={setRedirect}>
                <SelectTrigger id="eredirect">
                  <SelectValue placeholder="Select interface" />
                </SelectTrigger>
                <SelectContent>
                  {availableInterfaces.map((iface) => (
                    <SelectItem key={iface.name} value={iface.name}>
                      {iface.name}
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({iface.type})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <Checkbox checked={disabled} onCheckedChange={(v) => setDisabled(!!v)} />
                <span>Disabled</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={persistentTunnel} onCheckedChange={(v) => setPersistentTunnel(!!v)} />
                <span>Persistent tunnel</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={useLzo} onCheckedChange={(v) => setUseLzo(!!v)} />
                <span>Use LZO compression</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={offloadDco} onCheckedChange={(v) => setOffloadDco(!!v)} />
                <span>Offload DCO</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={replaceDefaultRoute}
                  onCheckedChange={(v) => setReplaceDefaultRoute(!!v)}
                />
                <span>Replace default route</span>
              </label>
              {replaceDefaultRoute && (
                <label className="flex items-center gap-2 ml-6">
                  <Checkbox
                    checked={replaceDefaultRouteLocal}
                    onCheckedChange={(v) => setReplaceDefaultRouteLocal(!!v)}
                  />
                  <span>Local</span>
                </label>
              )}
            </div>
            <Separator />
            <div>
              <Label htmlFor="eopts">Raw OpenVPN Options (one per line)</Label>
              <Textarea
                id="eopts"
                value={openvpnOptionsText}
                onChange={(e) => setOpenvpnOptionsText(e.target.value)}
                rows={3}
              />
            </div>
          </TabsContent>

          {/* Network */}
          <TabsContent value="network" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="elhost">Local Host</Label>
                <Input id="elhost" value={localHost} onChange={(e) => setLocalHost(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="elport">Local Port</Label>
                <Input id="elport" value={localPort} onChange={(e) => setLocalPort(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="erport">Remote Port</Label>
              <Input id="erport" value={remotePort} onChange={(e) => setRemotePort(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="erhost">Remote Hosts (one per line)</Label>
              <Textarea
                id="erhost"
                value={remoteHostText}
                onChange={(e) => setRemoteHostText(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="eraddr">Remote Addresses (one per line)</Label>
              <Textarea
                id="eraddr"
                value={remoteAddressText}
                onChange={(e) => setRemoteAddressText(e.target.value)}
                rows={2}
              />
            </div>
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Local Addresses</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setLocalAddresses([...localAddresses, { address: "", subnet_mask: "" }])
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {localAddresses.map((la, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder="10.0.0.1"
                      value={la.address}
                      onChange={(e) => {
                        const next = [...localAddresses];
                        next[idx] = { ...next[idx], address: e.target.value };
                        setLocalAddresses(next);
                      }}
                    />
                    <Input
                      placeholder="255.255.255.0"
                      value={la.subnet_mask}
                      onChange={(e) => {
                        const next = [...localAddresses];
                        next[idx] = { ...next[idx], subnet_mask: e.target.value };
                        setLocalAddresses(next);
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setLocalAddresses(localAddresses.filter((_, i) => i !== idx))
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ekainterval">Keepalive Interval</Label>
                <Input
                  id="ekainterval"
                  value={keepAliveInterval}
                  onChange={(e) => setKeepAliveInterval(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ekafail">Keepalive Failure Count</Label>
                <Input
                  id="ekafail"
                  value={keepAliveFailure}
                  onChange={(e) => setKeepAliveFailure(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Encryption */}
          <TabsContent value="encryption" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ecipher">Cipher (legacy)</Label>
                <Select value={cipher} onValueChange={setCipher}>
                  <SelectTrigger id="ecipher">
                    <SelectValue placeholder="Select cipher" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEGACY_CIPHERS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="ehash">Hash</Label>
                <Select value={hash} onValueChange={setHash}>
                  <SelectTrigger id="ehash">
                    <SelectValue placeholder="Select hash" />
                  </SelectTrigger>
                  <SelectContent>
                    {HASH_ALGORITHMS.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {is15 && (
              <div>
                <Label>Data Ciphers</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select one or more ciphers the peer is allowed to negotiate.
                </p>
                <div className="grid grid-cols-4 gap-2 rounded-md border p-3">
                  {DATA_CIPHERS.map((c) => (
                    <label key={c} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={dataCiphers.includes(c)}
                        onCheckedChange={(v) =>
                          setDataCiphers(
                            v ? [...dataCiphers, c] : dataCiphers.filter((x) => x !== c),
                          )
                        }
                      />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {is15 && (
              <div>
                <Label htmlFor="edcf">Data Ciphers Fallback</Label>
                <Select value={dataCiphersFallback} onValueChange={setDataCiphersFallback}>
                  <SelectTrigger id="edcf">
                    <SelectValue placeholder="Select fallback cipher" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATA_CIPHERS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="essk">Shared Secret Key</Label>
              <Select value={sharedSecretKey} onValueChange={setSharedSecretKey}>
                <SelectTrigger id="essk">
                  <SelectValue placeholder="Select from PKI" />
                </SelectTrigger>
                <SelectContent>
                  {pki?.openvpn_shared_secrets.map((s) => (
                    <SelectItem key={s.name} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* TLS */}
          <TabsContent value="tls" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="etlsca">CA Certificate</Label>
                <Select value={tlsCa} onValueChange={setTlsCa}>
                  <SelectTrigger id="etlsca">
                    <SelectValue placeholder="Select CA" />
                  </SelectTrigger>
                  <SelectContent>
                    {pki?.ca.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="etlscert">Certificate</Label>
                <Select value={tlsCert} onValueChange={setTlsCert}>
                  <SelectTrigger id="etlscert">
                    <SelectValue placeholder="Select cert" />
                  </SelectTrigger>
                  <SelectContent>
                    {pki?.certificates.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="etlsdh">DH Parameters</Label>
                <Select value={tlsDh} onValueChange={setTlsDh}>
                  <SelectTrigger id="etlsdh">
                    <SelectValue placeholder="Select DH" />
                  </SelectTrigger>
                  <SelectContent>
                    {pki?.dh.map((d) => (
                      <SelectItem key={d.name} value={d.name}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="etlsauth">TLS Auth Key</Label>
                <Select value={tlsAuthKey} onValueChange={setTlsAuthKey}>
                  <SelectTrigger id="etlsauth">
                    <SelectValue placeholder="Select shared secret" />
                  </SelectTrigger>
                  <SelectContent>
                    {pki?.openvpn_shared_secrets.map((s) => (
                      <SelectItem key={s.name} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="etlscrypt">TLS Crypt Key</Label>
                <Select value={tlsCryptKey} onValueChange={setTlsCryptKey}>
                  <SelectTrigger id="etlscrypt">
                    <SelectValue placeholder="Select shared secret" />
                  </SelectTrigger>
                  <SelectContent>
                    {pki?.openvpn_shared_secrets.map((s) => (
                      <SelectItem key={s.name} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="etlsrole">TLS Role</Label>
                <Select value={tlsRole} onValueChange={setTlsRole}>
                  <SelectTrigger id="etlsrole">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="passive">Passive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="etlsver">TLS Version Min</Label>
              <Select value={tlsVersionMin} onValueChange={setTlsVersionMin}>
                <SelectTrigger id="etlsver">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {TLS_VERSIONS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="etlsfp">Peer Fingerprints (one per line)</Label>
              <Textarea
                id="etlsfp"
                value={tlsFingerprintsText}
                onChange={(e) => setTlsFingerprintsText(e.target.value)}
                rows={3}
              />
            </div>
          </TabsContent>

          {/* Server */}
          <TabsContent value="server" className="space-y-4">
            <div>
              <Label htmlFor="esssubnet">Subnets (one per line)</Label>
              <Textarea
                id="esssubnet"
                value={serverSubnetText}
                onChange={(e) => setServerSubnetText(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estopo">Topology</Label>
                <Select value={serverTopology} onValueChange={setServerTopology}>
                  <SelectTrigger id="estopo">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="net30">net30</SelectItem>
                    <SelectItem value="p2p">p2p</SelectItem>
                    <SelectItem value="subnet">subnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="esdomain">Domain Name</Label>
                <Input
                  id="esdomain"
                  value={serverDomainName}
                  onChange={(e) => setServerDomainName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="esmax">Max Connections</Label>
                <Input
                  id="esmax"
                  value={serverMaxConnections}
                  onChange={(e) => setServerMaxConnections(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="esns">Name Servers (one per line)</Label>
                <Textarea
                  id="esns"
                  value={serverNameServersText}
                  onChange={(e) => setServerNameServersText(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={serverRejectUnconfigured}
                onCheckedChange={(v) => setServerRejectUnconfigured(!!v)}
              />
              <span>Reject unconfigured clients</span>
            </label>
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Push Routes</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setServerPushRoutes([...serverPushRoutes, { route: "", metric: "" }])
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {serverPushRoutes.map((pr, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder="10.0.0.0/24"
                      value={pr.route}
                      onChange={(e) => {
                        const next = [...serverPushRoutes];
                        next[idx] = { ...next[idx], route: e.target.value };
                        setServerPushRoutes(next);
                      }}
                    />
                    <Input
                      placeholder="metric"
                      value={pr.metric}
                      onChange={(e) => {
                        const next = [...serverPushRoutes];
                        next[idx] = { ...next[idx], metric: e.target.value };
                        setServerPushRoutes(next);
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setServerPushRoutes(serverPushRoutes.filter((_, i) => i !== idx))
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <div className="text-sm font-semibold mb-2">Client IP Pool</div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Start"
                  value={serverClientIpPoolStart}
                  onChange={(e) => setServerClientIpPoolStart(e.target.value)}
                />
                <Input
                  placeholder="Stop"
                  value={serverClientIpPoolStop}
                  onChange={(e) => setServerClientIpPoolStop(e.target.value)}
                />
                <Input
                  placeholder="Mask"
                  value={serverClientIpPoolMask}
                  onChange={(e) => setServerClientIpPoolMask(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm mt-2">
                <Checkbox
                  checked={serverClientIpPoolDisable}
                  onCheckedChange={(v) => setServerClientIpPoolDisable(!!v)}
                />
                <span>Disable IP pool</span>
              </label>
            </div>
            <div>
              <Label htmlFor="esv6">Client IPv6 Pool Base</Label>
              <Input
                id="esv6"
                value={serverClientIpv6PoolBase}
                onChange={(e) => setServerClientIpv6PoolBase(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm mt-2">
                <Checkbox
                  checked={serverClientIpv6PoolDisable}
                  onCheckedChange={(v) => setServerClientIpv6PoolDisable(!!v)}
                />
                <span>Disable IPv6 pool</span>
              </label>
            </div>
            <Separator />
            <div>
              <div className="text-sm font-semibold mb-2">Server Bridge (TAP mode)</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Gateway</Label>
                  <Input
                    value={serverBridgeGateway}
                    onChange={(e) => setServerBridgeGateway(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Subnet Mask</Label>
                  <Input
                    value={serverBridgeMask}
                    onChange={(e) => setServerBridgeMask(e.target.value)}
                  />
                </div>
                <div>
                  <Label>DHCP Pool Start</Label>
                  <Input
                    value={serverBridgeStart}
                    onChange={(e) => setServerBridgeStart(e.target.value)}
                  />
                </div>
                <div>
                  <Label>DHCP Pool Stop</Label>
                  <Input
                    value={serverBridgeStop}
                    onChange={(e) => setServerBridgeStop(e.target.value)}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm mt-2">
                <Checkbox
                  checked={serverBridgeDisable}
                  onCheckedChange={(v) => setServerBridgeDisable(!!v)}
                />
                <span>Disable bridge</span>
              </label>
            </div>
            <Separator />
            <div>
              <div className="text-sm font-semibold mb-2">MFA TOTP (Two-Factor Authentication)</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Challenge Prompt</Label>
                  <Input
                    value={mfaChallenge}
                    onChange={(e) => setMfaChallenge(e.target.value)}
                    placeholder="Enter TOTP code"
                  />
                </div>
                <div>
                  <Label>Digits</Label>
                  <Input
                    value={mfaDigits}
                    onChange={(e) => setMfaDigits(e.target.value)}
                    placeholder="6"
                  />
                </div>
                <div>
                  <Label>Drift (seconds)</Label>
                  <Input
                    value={mfaDrift}
                    onChange={(e) => setMfaDrift(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Slop (seconds)</Label>
                  <Input
                    value={mfaSlop}
                    onChange={(e) => setMfaSlop(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Step (seconds)</Label>
                  <Input
                    value={mfaStep}
                    onChange={(e) => setMfaStep(e.target.value)}
                    placeholder="30"
                  />
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Per-Client Configuration</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setServerClients([
                      ...serverClients,
                      { name: "", disable: false, ip: "", subnet: "", push_route: "" },
                    ])
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-3">
                {serverClients.map((c, idx) => (
                  <div key={idx} className="border rounded-md p-3 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Client name"
                        value={c.name}
                        onChange={(e) => {
                          const next = [...serverClients];
                          next[idx] = { ...next[idx], name: e.target.value };
                          setServerClients(next);
                        }}
                      />
                      <Input
                        placeholder="IP"
                        value={c.ip}
                        onChange={(e) => {
                          const next = [...serverClients];
                          next[idx] = { ...next[idx], ip: e.target.value };
                          setServerClients(next);
                        }}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setServerClients(serverClients.filter((_, i) => i !== idx))
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Textarea
                        placeholder="Subnets (one per line)"
                        value={c.subnet}
                        onChange={(e) => {
                          const next = [...serverClients];
                          next[idx] = { ...next[idx], subnet: e.target.value };
                          setServerClients(next);
                        }}
                        rows={2}
                      />
                      <Textarea
                        placeholder="Push routes (one per line)"
                        value={c.push_route}
                        onChange={(e) => {
                          const next = [...serverClients];
                          next[idx] = { ...next[idx], push_route: e.target.value };
                          setServerClients(next);
                        }}
                        rows={2}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={c.disable}
                        onCheckedChange={(v) => {
                          const next = [...serverClients];
                          next[idx] = { ...next[idx], disable: !!v };
                          setServerClients(next);
                        }}
                      />
                      <span>Disabled</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Auth */}
          <TabsContent value="auth" className="space-y-4">
            <div>
              <Label htmlFor="eauthu">Username</Label>
              <Input
                id="eauthu"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="eauthp">Password</Label>
              <Input
                id="eauthp"
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </TabsContent>

          {/* IP */}
          <TabsContent value="ip" className="space-y-4">
            <div className="text-sm font-semibold">IPv4</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eipmss">Adjust MSS</Label>
                <Input
                  id="eipmss"
                  value={ipAdjustMss}
                  onChange={(e) => setIpAdjustMss(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="eiparpto">ARP Cache Timeout</Label>
                <Input
                  id="eiparpto"
                  value={ipArpCacheTimeout}
                  onChange={(e) => setIpArpCacheTimeout(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="eipsv">Source Validation</Label>
                <Select value={ipSourceValidation} onValueChange={setIpSourceValidation}>
                  <SelectTrigger id="eipsv">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strict">strict</SelectItem>
                    <SelectItem value="loose">loose</SelectItem>
                    <SelectItem value="disable">disable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={ipDisableForwarding}
                  onCheckedChange={(v) => setIpDisableForwarding(!!v)}
                />
                <span>Disable forwarding</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={ipDisableArpFilter}
                  onCheckedChange={(v) => setIpDisableArpFilter(!!v)}
                />
                <span>Disable ARP filter</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={ipEnableArpAccept}
                  onCheckedChange={(v) => setIpEnableArpAccept(!!v)}
                />
                <span>Enable ARP accept</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={ipEnableArpAnnounce}
                  onCheckedChange={(v) => setIpEnableArpAnnounce(!!v)}
                />
                <span>Enable ARP announce</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={ipEnableArpIgnore}
                  onCheckedChange={(v) => setIpEnableArpIgnore(!!v)}
                />
                <span>Enable ARP ignore</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={ipEnableDirectedBroadcast}
                  onCheckedChange={(v) => setIpEnableDirectedBroadcast(!!v)}
                />
                <span>Enable directed broadcast</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={ipEnableProxyArp}
                  onCheckedChange={(v) => setIpEnableProxyArp(!!v)}
                />
                <span>Enable proxy ARP</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={ipProxyArpPvlan}
                  onCheckedChange={(v) => setIpProxyArpPvlan(!!v)}
                />
                <span>Proxy ARP PVLAN</span>
              </label>
            </div>
            <Separator />
            <div className="text-sm font-semibold">IPv6</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eipv6mss">Adjust MSS</Label>
                <Input
                  id="eipv6mss"
                  value={ipv6AdjustMss}
                  onChange={(e) => setIpv6AdjustMss(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="eipv6sv">Source Validation</Label>
                <Select value={ipv6SourceValidation} onValueChange={setIpv6SourceValidation}>
                  <SelectTrigger id="eipv6sv">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strict">strict</SelectItem>
                    <SelectItem value="loose">loose</SelectItem>
                    <SelectItem value="disable">disable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="eipv6dad">Accept DAD</Label>
                <Input
                  id="eipv6dad"
                  value={ipv6AcceptDad}
                  onChange={(e) => setIpv6AcceptDad(e.target.value)}
                  placeholder="0-2"
                />
              </div>
              <div>
                <Label htmlFor="eipv6eui">Address EUI-64</Label>
                <Input
                  id="eipv6eui"
                  value={ipv6AddressEui64}
                  onChange={(e) => setIpv6AddressEui64(e.target.value)}
                  placeholder="2001:db8::/64"
                />
              </div>
              <div>
                <Label htmlFor="eipv6reach">Base Reachable Time</Label>
                <Input
                  id="eipv6reach"
                  value={ipv6BaseReachableTime}
                  onChange={(e) => setIpv6BaseReachableTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="eipv6dadtx">DAD Transmits</Label>
                <Input
                  id="eipv6dadtx"
                  value={ipv6DupAddrDetectTransmits}
                  onChange={(e) => setIpv6DupAddrDetectTransmits(e.target.value)}
                />
              </div>
            </div>
            {is15 && (
              <div>
                <Label htmlFor="eipv6iid">Interface Identifier</Label>
                <Input
                  id="eipv6iid"
                  value={ipv6InterfaceIdentifier}
                  onChange={(e) => setIpv6InterfaceIdentifier(e.target.value)}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={ipv6DisableForwarding}
                  onCheckedChange={(v) => setIpv6DisableForwarding(!!v)}
                />
                <span>Disable IPv6 forwarding</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={ipv6AddressAutoconf}
                  onCheckedChange={(v) => setIpv6AddressAutoconf(!!v)}
                />
                <span>Address autoconf</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={ipv6AddressNoDefaultLinkLocal}
                  onCheckedChange={(v) => setIpv6AddressNoDefaultLinkLocal(!!v)}
                />
                <span>No default link-local</span>
              </label>
            </div>
          </TabsContent>

          {/* Mirror */}
          <TabsContent value="mirror" className="space-y-4">
            <div>
              <Label htmlFor="emirror">Ingress Mirror Interface</Label>
              <Select value={mirrorIngress} onValueChange={setMirrorIngress}>
                <SelectTrigger id="emirror">
                  <SelectValue placeholder="Select interface" />
                </SelectTrigger>
                <SelectContent>
                  {availableInterfaces.map((iface) => (
                    <SelectItem key={iface.name} value={iface.name}>
                      {iface.name}
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({iface.type})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="emirrorE">Egress Mirror Interface</Label>
              <Select value={mirrorEgress} onValueChange={setMirrorEgress}>
                <SelectTrigger id="emirrorE">
                  <SelectValue placeholder="Select interface" />
                </SelectTrigger>
                <SelectContent>
                  {availableInterfaces.map((iface) => (
                    <SelectItem key={iface.name} value={iface.name}>
                      {iface.name}
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({iface.type})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
