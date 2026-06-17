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
} from "@/lib/api/openvpn";
import { pkiService, type PKIConfigResponse } from "@/lib/api/pki";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";
import {
  LEGACY_CIPHERS,
  DATA_CIPHERS,
  HASH_ALGORITHMS,
  TLS_VERSIONS,
} from "./constants";

interface CreateOpenvpnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: OpenvpnCapabilities | null;
  existingNames: string[];
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

export function CreateOpenvpnModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingNames,
}: CreateOpenvpnModalProps) {
  const is15 = capabilities?.version_info.is_1_5 ?? false;

  // Basic
  const [name, setName] = useState("vtun0");
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

  // Network
  const [localHost, setLocalHost] = useState("");
  const [localPort, setLocalPort] = useState("");
  const [remotePort, setRemotePort] = useState("");
  const [localAddresses, setLocalAddresses] = useState<LocalAddressEntry[]>([]);
  const [remoteAddressText, setRemoteAddressText] = useState("");
  const [remoteHostText, setRemoteHostText] = useState("");
  const [keepAliveInterval, setKeepAliveInterval] = useState("");
  const [keepAliveFailure, setKeepAliveFailure] = useState("");

  // Encryption
  const [cipher, setCipher] = useState("");
  const [dataCiphers, setDataCiphers] = useState<string[]>([]);
  const [dataCiphersFallback, setDataCiphersFallback] = useState("");
  const [hash, setHash] = useState("");

  // TLS
  const [tlsCas, setTlsCas] = useState<string[]>([]);
  const [tlsCert, setTlsCert] = useState("");
  const [tlsDh, setTlsDh] = useState("");
  const [tlsAuthKey, setTlsAuthKey] = useState("");
  const [tlsCryptKey, setTlsCryptKey] = useState("");
  const [tlsRole, setTlsRole] = useState("");
  const [tlsVersionMin, setTlsVersionMin] = useState("");
  const [tlsFingerprintsText, setTlsFingerprintsText] = useState("");
  const [sharedSecretKey, setSharedSecretKey] = useState("");

  // Server
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
  // Server bridge
  const [serverBridgeGateway, setServerBridgeGateway] = useState("");
  const [serverBridgeStart, setServerBridgeStart] = useState("");
  const [serverBridgeStop, setServerBridgeStop] = useState("");
  const [serverBridgeMask, setServerBridgeMask] = useState("");
  const [serverBridgeDisable, setServerBridgeDisable] = useState(false);
  // Server MFA TOTP
  const [mfaChallenge, setMfaChallenge] = useState("");
  const [mfaDigits, setMfaDigits] = useState("");
  const [mfaDrift, setMfaDrift] = useState("");
  const [mfaSlop, setMfaSlop] = useState("");
  const [mfaStep, setMfaStep] = useState("");

  // Auth
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  // IP
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

  // IPv6
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

  // Mirror
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");

  // PKI lookup
  const [pki, setPki] = useState<PKIConfigResponse | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("basic");

  useEffect(() => {
    if (open) {
      pkiService.getConfig().then(setPki).catch(() => {});
      showService
        .getAllInterfaces()
        .then((res) => setAvailableInterfaces(res.interfaces))
        .catch(() => {});
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setName("vtun0");
    setDescription("");
    setMode("");
    setDeviceType("");
    setProtocol("");
    setVrf("");
    setDisabled(false);
    setPersistentTunnel(false);
    setUseLzo(false);
    setOffloadDco(false);
    setRedirect("");
    setReplaceDefaultRoute(false);
    setReplaceDefaultRouteLocal(false);
    setOpenvpnOptionsText("");
    setLocalHost("");
    setLocalPort("");
    setRemotePort("");
    setLocalAddresses([]);
    setRemoteAddressText("");
    setRemoteHostText("");
    setKeepAliveInterval("");
    setKeepAliveFailure("");
    setCipher("");
    setDataCiphers([]);
    setDataCiphersFallback("");
    setHash("");
    setTlsCas([]);
    setTlsCert("");
    setTlsDh("");
    setTlsAuthKey("");
    setTlsCryptKey("");
    setTlsRole("");
    setTlsVersionMin("");
    setTlsFingerprintsText("");
    setSharedSecretKey("");
    setServerSubnetText("");
    setServerTopology("");
    setServerDomainName("");
    setServerMaxConnections("");
    setServerNameServersText("");
    setServerRejectUnconfigured(false);
    setServerPushRoutes([]);
    setServerClientIpPoolStart("");
    setServerClientIpPoolStop("");
    setServerClientIpPoolMask("");
    setServerClientIpPoolDisable(false);
    setServerClientIpv6PoolBase("");
    setServerClientIpv6PoolDisable(false);
    setServerClients([]);
    setServerBridgeGateway("");
    setServerBridgeStart("");
    setServerBridgeStop("");
    setServerBridgeMask("");
    setServerBridgeDisable(false);
    setMfaChallenge("");
    setMfaDigits("");
    setMfaDrift("");
    setMfaSlop("");
    setMfaStep("");
    setAuthUsername("");
    setAuthPassword("");
    setIpAdjustMss("");
    setIpArpCacheTimeout("");
    setIpDisableArpFilter(false);
    setIpDisableForwarding(false);
    setIpEnableArpAccept(false);
    setIpEnableArpAnnounce(false);
    setIpEnableArpIgnore(false);
    setIpEnableDirectedBroadcast(false);
    setIpEnableProxyArp(false);
    setIpProxyArpPvlan(false);
    setIpSourceValidation("");
    setIpv6AcceptDad("");
    setIpv6AddressAutoconf(false);
    setIpv6AddressEui64("");
    setIpv6AddressNoDefaultLinkLocal(false);
    setIpv6AdjustMss("");
    setIpv6BaseReachableTime("");
    setIpv6DupAddrDetectTransmits("");
    setIpv6DisableForwarding(false);
    setIpv6InterfaceIdentifier("");
    setIpv6SourceValidation("");
    setMirrorIngress("");
    setMirrorEgress("");
    setError(null);
    setActiveTab("basic");
  };

  const splitLines = (s: string): string[] =>
    s.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  const buildConfig = (): OpenvpnCreateConfig => {
    const config: OpenvpnCreateConfig = { name };
    if (description) config.description = description;
    if (disabled) config.disabled = true;
    if (mode) config.mode = mode;
    if (deviceType) config.device_type = deviceType;
    if (protocol) config.protocol = protocol;
    if (vrf) config.vrf = vrf;
    if (persistentTunnel) config.persistent_tunnel = true;
    if (useLzo) config.use_lzo_compression = true;
    if (offloadDco) config.offload_dco = true;
    if (redirect) config.redirect = redirect;
    if (replaceDefaultRoute) {
      config.replace_default_route = {
        enabled: true,
        local: replaceDefaultRouteLocal,
      };
    }
    const options = splitLines(openvpnOptionsText);
    if (options.length > 0) config.openvpn_options = options;

    if (localHost) config.local_host = localHost;
    if (localPort) config.local_port = localPort;
    if (remotePort) config.remote_port = remotePort;
    if (localAddresses.length > 0) {
      config.local_addresses = localAddresses
        .filter((la) => la.address)
        .map((la) => ({
          address: la.address,
          subnet_mask: la.subnet_mask || undefined,
        }));
    }
    const remoteAddresses = splitLines(remoteAddressText);
    if (remoteAddresses.length > 0) config.remote_address = remoteAddresses;
    const remoteHosts = splitLines(remoteHostText);
    if (remoteHosts.length > 0) config.remote_host = remoteHosts;

    if (keepAliveInterval || keepAliveFailure) {
      config.keep_alive = {};
      if (keepAliveInterval) config.keep_alive.interval = keepAliveInterval;
      if (keepAliveFailure) config.keep_alive.failure_count = keepAliveFailure;
    }

    const enc: NonNullable<OpenvpnCreateConfig["encryption"]> = {};
    if (cipher) enc.cipher = cipher;
    if (dataCiphers.length > 0) enc.data_ciphers = dataCiphers;
    if (dataCiphersFallback) enc.data_ciphers_fallback = dataCiphersFallback;
    if (Object.keys(enc).length > 0) config.encryption = enc;

    if (hash) config.hash = hash;
    if (sharedSecretKey) config.shared_secret_key = sharedSecretKey;

    const tls: NonNullable<OpenvpnCreateConfig["tls"]> = {};
    if (tlsCas.length > 0) tls.ca_certificates = tlsCas;
    if (tlsCert) tls.certificate = tlsCert;
    if (tlsDh) tls.dh_params = tlsDh;
    if (tlsAuthKey) tls.auth_key = tlsAuthKey;
    if (tlsCryptKey) tls.crypt_key = tlsCryptKey;
    if (tlsRole) tls.role = tlsRole;
    if (tlsVersionMin) tls.tls_version_min = tlsVersionMin;
    const fps = splitLines(tlsFingerprintsText);
    if (fps.length > 0) tls.peer_fingerprints = fps;
    if (Object.keys(tls).length > 0) config.tls = tls;

    if (mode === "server") {
      const server: NonNullable<OpenvpnCreateConfig["server"]> = {};
      const subnets = splitLines(serverSubnetText);
      if (subnets.length > 0) server.subnet = subnets;
      if (serverTopology) server.topology = serverTopology;
      if (serverDomainName) server.domain_name = serverDomainName;
      if (serverMaxConnections) server.max_connections = serverMaxConnections;
      const nss = splitLines(serverNameServersText);
      if (nss.length > 0) server.name_server = nss;
      if (serverRejectUnconfigured) server.reject_unconfigured_clients = true;
      const pushRoutes = serverPushRoutes
        .filter((pr) => pr.route)
        .map((pr) => ({ route: pr.route, metric: pr.metric || undefined }));
      if (pushRoutes.length > 0) server.push_route = pushRoutes;
      if (
        serverClientIpPoolStart ||
        serverClientIpPoolStop ||
        serverClientIpPoolMask ||
        serverClientIpPoolDisable
      ) {
        server.client_ip_pool = {
          start: serverClientIpPoolStart || undefined,
          stop: serverClientIpPoolStop || undefined,
          subnet_mask: serverClientIpPoolMask || undefined,
          disable: serverClientIpPoolDisable || undefined,
        };
      }
      if (serverClientIpv6PoolBase || serverClientIpv6PoolDisable) {
        server.client_ipv6_pool = {
          base: serverClientIpv6PoolBase || undefined,
          disable: serverClientIpv6PoolDisable || undefined,
        };
      }
      if (
        serverBridgeGateway ||
        serverBridgeStart ||
        serverBridgeStop ||
        serverBridgeMask ||
        serverBridgeDisable
      ) {
        server.bridge = {
          gateway: serverBridgeGateway || undefined,
          start: serverBridgeStart || undefined,
          stop: serverBridgeStop || undefined,
          subnet_mask: serverBridgeMask || undefined,
          disable: serverBridgeDisable || undefined,
        };
      }
      if (mfaChallenge || mfaDigits || mfaDrift || mfaSlop || mfaStep) {
        server.mfa_totp = {
          challenge: mfaChallenge || undefined,
          digits: mfaDigits || undefined,
          drift: mfaDrift || undefined,
          slop: mfaSlop || undefined,
          step: mfaStep || undefined,
        };
      }
      const clients = serverClients
        .filter((c) => c.name)
        .map((c) => ({
          name: c.name,
          disable: c.disable,
          ip: c.ip ? c.ip.split(/[\s,]+/).filter(Boolean) : undefined,
          subnet: c.subnet ? splitLines(c.subnet) : undefined,
          push_route: c.push_route ? splitLines(c.push_route) : undefined,
        }));
      if (clients.length > 0) server.clients = clients;
      if (Object.keys(server).length > 0) config.server = server;
    }

    if (authUsername || authPassword) {
      config.authentication = {
        username: authUsername || undefined,
        password: authPassword || undefined,
      };
    }

    const ip: NonNullable<OpenvpnCreateConfig["ip"]> = {};
    if (ipAdjustMss) ip.adjust_mss = ipAdjustMss;
    if (ipArpCacheTimeout) ip.arp_cache_timeout = ipArpCacheTimeout;
    if (ipDisableArpFilter) ip.disable_arp_filter = true;
    if (ipDisableForwarding) ip.disable_forwarding = true;
    if (ipEnableArpAccept) ip.enable_arp_accept = true;
    if (ipEnableArpAnnounce) ip.enable_arp_announce = true;
    if (ipEnableArpIgnore) ip.enable_arp_ignore = true;
    if (ipEnableDirectedBroadcast) ip.enable_directed_broadcast = true;
    if (ipEnableProxyArp) ip.enable_proxy_arp = true;
    if (ipProxyArpPvlan) ip.proxy_arp_pvlan = true;
    if (ipSourceValidation) ip.source_validation = ipSourceValidation;
    if (Object.keys(ip).length > 0) config.ip = ip;

    const ipv6: NonNullable<OpenvpnCreateConfig["ipv6"]> = {};
    if (ipv6AcceptDad) ipv6.accept_dad = ipv6AcceptDad;
    if (ipv6AddressAutoconf) ipv6.address_autoconf = true;
    if (ipv6AddressEui64) ipv6.address_eui64 = ipv6AddressEui64;
    if (ipv6AddressNoDefaultLinkLocal) ipv6.address_no_default_link_local = true;
    if (ipv6AdjustMss) ipv6.adjust_mss = ipv6AdjustMss;
    if (ipv6BaseReachableTime) ipv6.base_reachable_time = ipv6BaseReachableTime;
    if (ipv6DupAddrDetectTransmits) ipv6.dup_addr_detect_transmits = ipv6DupAddrDetectTransmits;
    if (ipv6DisableForwarding) ipv6.disable_forwarding = true;
    if (ipv6InterfaceIdentifier) ipv6.address_interface_identifier = ipv6InterfaceIdentifier;
    if (ipv6SourceValidation) ipv6.source_validation = ipv6SourceValidation;
    if (Object.keys(ipv6).length > 0) config.ipv6 = ipv6;

    if (mirrorIngress) config.mirror_ingress = mirrorIngress;
    if (mirrorEgress) config.mirror_egress = mirrorEgress;

    return config;
  };

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Interface name is required");
      return;
    }
    if (existingNames.includes(name)) {
      setError(`Interface "${name}" already exists`);
      return;
    }

    setLoading(true);
    try {
      const result = await openvpnService.createInterface(buildConfig());
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to create OpenVPN interface");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to create OpenVPN interface");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create OpenVPN Interface</DialogTitle>
          <DialogDescription>
            Advanced configuration. All fields are optional except the name.
          </DialogDescription>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Interface Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="vtun0"
                />
              </div>
              <div>
                <Label htmlFor="mode">Mode</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger id="mode">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="server">Server</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="site-to-site">Site-to-Site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="deviceType">Device Type</Label>
                <Select value={deviceType} onValueChange={setDeviceType}>
                  <SelectTrigger id="deviceType">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tun">tun</SelectItem>
                    <SelectItem value="tap">tap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="protocol">Protocol</Label>
                <Select value={protocol} onValueChange={setProtocol}>
                  <SelectTrigger id="protocol">
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
                <Label htmlFor="vrf">VRF</Label>
                <Input id="vrf" value={vrf} onChange={(e) => setVrf(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="redirect">Redirect</Label>
              <InterfaceSelect
                value={redirect}
                onValueChange={setRedirect}
                id="redirect"
                interfaces={availableInterfaces}
                placeholder="Select interface"
              />
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
              <Label htmlFor="openvpnOpts">Raw OpenVPN Options (one per line)</Label>
              <Textarea
                id="openvpnOpts"
                value={openvpnOptionsText}
                onChange={(e) => setOpenvpnOptionsText(e.target.value)}
                placeholder="--verb 3"
                rows={3}
              />
            </div>
          </TabsContent>

          {/* Network */}
          <TabsContent value="network" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="localHost">Local Host</Label>
                <Input
                  id="localHost"
                  value={localHost}
                  onChange={(e) => setLocalHost(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="localPort">Local Port</Label>
                <Input
                  id="localPort"
                  value={localPort}
                  onChange={(e) => setLocalPort(e.target.value)}
                  placeholder="1194"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="remotePort">Remote Port</Label>
              <Input
                id="remotePort"
                value={remotePort}
                onChange={(e) => setRemotePort(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="remoteHost">Remote Hosts (one per line)</Label>
              <Textarea
                id="remoteHost"
                value={remoteHostText}
                onChange={(e) => setRemoteHostText(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="remoteAddress">Remote Addresses (one per line)</Label>
              <Textarea
                id="remoteAddress"
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
                <Label htmlFor="kaInterval">Keepalive Interval</Label>
                <Input
                  id="kaInterval"
                  value={keepAliveInterval}
                  onChange={(e) => setKeepAliveInterval(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="kaFailure">Keepalive Failure Count</Label>
                <Input
                  id="kaFailure"
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
                <Label htmlFor="cipher">Cipher (legacy)</Label>
                <Select value={cipher} onValueChange={setCipher}>
                  <SelectTrigger id="cipher">
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
                <Label htmlFor="hash">Hash</Label>
                <Select value={hash} onValueChange={setHash}>
                  <SelectTrigger id="hash">
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
                <Label htmlFor="dataCiphersFallback">Data Ciphers Fallback</Label>
                <Select value={dataCiphersFallback} onValueChange={setDataCiphersFallback}>
                  <SelectTrigger id="dataCiphersFallback">
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
              <Label htmlFor="sharedSecret">Shared Secret Key</Label>
              <Select value={sharedSecretKey} onValueChange={setSharedSecretKey}>
                <SelectTrigger id="sharedSecret">
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
                <Label>CA Certificate(s)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select one or more CAs (e.g. an intermediate CA chain).
                </p>
                <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                  {pki?.ca.map((c) => (
                    <label key={c.name} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={tlsCas.includes(c.name)}
                        onCheckedChange={(v) =>
                          setTlsCas(
                            v ? [...tlsCas, c.name] : tlsCas.filter((x) => x !== c.name),
                          )
                        }
                      />
                      <span>{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="tlsCert">Certificate</Label>
                <Select value={tlsCert} onValueChange={setTlsCert}>
                  <SelectTrigger id="tlsCert">
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
                <Label htmlFor="tlsDh">DH Parameters</Label>
                <Select value={tlsDh} onValueChange={setTlsDh}>
                  <SelectTrigger id="tlsDh">
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
                <Label htmlFor="tlsAuth">TLS Auth Key</Label>
                <Select value={tlsAuthKey} onValueChange={setTlsAuthKey}>
                  <SelectTrigger id="tlsAuth">
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
                <Label htmlFor="tlsCrypt">TLS Crypt Key</Label>
                <Select value={tlsCryptKey} onValueChange={setTlsCryptKey}>
                  <SelectTrigger id="tlsCrypt">
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
                <Label htmlFor="tlsRole">TLS Role</Label>
                <Select value={tlsRole} onValueChange={setTlsRole}>
                  <SelectTrigger id="tlsRole">
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
              <Label htmlFor="tlsVersion">TLS Version Min</Label>
              <Select value={tlsVersionMin} onValueChange={setTlsVersionMin}>
                <SelectTrigger id="tlsVersion">
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
              <Label htmlFor="tlsFingerprints">Peer Fingerprints (one per line)</Label>
              <Textarea
                id="tlsFingerprints"
                value={tlsFingerprintsText}
                onChange={(e) => setTlsFingerprintsText(e.target.value)}
                rows={3}
              />
            </div>
          </TabsContent>

          {/* Server */}
          <TabsContent value="server" className="space-y-4">
            <div>
              <Label htmlFor="serverSubnet">Subnets (one per line)</Label>
              <Textarea
                id="serverSubnet"
                value={serverSubnetText}
                onChange={(e) => setServerSubnetText(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="serverTopology">Topology</Label>
                <Select value={serverTopology} onValueChange={setServerTopology}>
                  <SelectTrigger id="serverTopology">
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
                <Label htmlFor="serverDomain">Domain Name</Label>
                <Input
                  id="serverDomain"
                  value={serverDomainName}
                  onChange={(e) => setServerDomainName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="serverMaxConn">Max Connections</Label>
                <Input
                  id="serverMaxConn"
                  value={serverMaxConnections}
                  onChange={(e) => setServerMaxConnections(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="serverNS">Name Servers (one per line)</Label>
                <Textarea
                  id="serverNS"
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
              <Label htmlFor="serverV6Base">Client IPv6 Pool Base</Label>
              <Input
                id="serverV6Base"
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
                        placeholder="IP (comma-separated)"
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
              <Label htmlFor="authUser">Username</Label>
              <Input
                id="authUser"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="authPass">Password</Label>
              <Input
                id="authPass"
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
                <Label htmlFor="ipMss">Adjust MSS</Label>
                <Input
                  id="ipMss"
                  value={ipAdjustMss}
                  onChange={(e) => setIpAdjustMss(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ipArpTimeout">ARP Cache Timeout</Label>
                <Input
                  id="ipArpTimeout"
                  value={ipArpCacheTimeout}
                  onChange={(e) => setIpArpCacheTimeout(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ipSv">Source Validation</Label>
                <Select value={ipSourceValidation} onValueChange={setIpSourceValidation}>
                  <SelectTrigger id="ipSv">
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
                <Label htmlFor="ipv6Mss">Adjust MSS</Label>
                <Input
                  id="ipv6Mss"
                  value={ipv6AdjustMss}
                  onChange={(e) => setIpv6AdjustMss(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ipv6Sv">Source Validation</Label>
                <Select value={ipv6SourceValidation} onValueChange={setIpv6SourceValidation}>
                  <SelectTrigger id="ipv6Sv">
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
                <Label htmlFor="ipv6AcceptDad">Accept DAD</Label>
                <Input
                  id="ipv6AcceptDad"
                  value={ipv6AcceptDad}
                  onChange={(e) => setIpv6AcceptDad(e.target.value)}
                  placeholder="0-2"
                />
              </div>
              <div>
                <Label htmlFor="ipv6Eui64">Address EUI-64</Label>
                <Input
                  id="ipv6Eui64"
                  value={ipv6AddressEui64}
                  onChange={(e) => setIpv6AddressEui64(e.target.value)}
                  placeholder="2001:db8::/64"
                />
              </div>
              <div>
                <Label htmlFor="ipv6BaseReach">Base Reachable Time</Label>
                <Input
                  id="ipv6BaseReach"
                  value={ipv6BaseReachableTime}
                  onChange={(e) => setIpv6BaseReachableTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ipv6DadTx">DAD Transmits</Label>
                <Input
                  id="ipv6DadTx"
                  value={ipv6DupAddrDetectTransmits}
                  onChange={(e) => setIpv6DupAddrDetectTransmits(e.target.value)}
                />
              </div>
            </div>
            {is15 && (
              <div>
                <Label htmlFor="ipv6Iid">Interface Identifier</Label>
                <Input
                  id="ipv6Iid"
                  value={ipv6InterfaceIdentifier}
                  onChange={(e) => setIpv6InterfaceIdentifier(e.target.value)}
                  placeholder="::1"
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
              <Label htmlFor="mirrorIn">Ingress Mirror Interface</Label>
              <InterfaceSelect
                value={mirrorIngress}
                onValueChange={setMirrorIngress}
                id="mirrorIn"
                interfaces={availableInterfaces}
                placeholder="Select interface"
              />
            </div>
            <div>
              <Label htmlFor="mirrorOut">Egress Mirror Interface</Label>
              <InterfaceSelect
                value={mirrorEgress}
                onValueChange={setMirrorEgress}
                id="mirrorOut"
                interfaces={availableInterfaces}
                placeholder="Select interface"
              />
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
                Creating...
              </>
            ) : (
              "Create Interface"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
