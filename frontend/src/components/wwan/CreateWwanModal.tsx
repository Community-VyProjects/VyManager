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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Signal, Loader2, Eye, EyeOff, X, Plus } from "lucide-react";
import { wwanService, type WwanCapabilities } from "@/lib/api/wwan";
import { showService, type InterfaceName } from "@/lib/api/show";
import { ApiError } from "@/lib/types/api";

interface CreateWwanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: WwanCapabilities | null;
  existingInterfaces: string[];
}

const MTU_PRESETS = ["1280", "1400", "1430", "1500"];
const TIMEOUT_PRESETS = ["30", "60", "300", "600", "3600"];
const DAD_PRESETS = ["0", "1", "2", "3"];

export function CreateWwanModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingInterfaces,
}: CreateWwanModalProps) {
  // Connection
  const [name, setName] = useState("wwan0");
  const [apn, setApn] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [connectOnDemand, setConnectOnDemand] = useState(false);
  const [disableLinkDetect, setDisableLinkDetect] = useState(false);
  const [disable, setDisable] = useState(false);

  // Basic
  const [description, setDescription] = useState("");
  const [mtu, setMtu] = useState("");
  const [mtuIsCustom, setMtuIsCustom] = useState(false);
  const [vrf, setVrf] = useState("");

  // Addresses
  const [addresses, setAddresses] = useState("");
  const [dhcpClientId, setDhcpClientId] = useState("");
  const [dhcpDefaultRouteDistance, setDhcpDefaultRouteDistance] = useState("");
  const [dhcpHostName, setDhcpHostName] = useState("");
  const [dhcpMtu, setDhcpMtu] = useState("");
  const [dhcpNoDefaultRoute, setDhcpNoDefaultRoute] = useState(false);
  const [dhcpReject, setDhcpReject] = useState<string[]>([]);
  const [dhcpRejectInput, setDhcpRejectInput] = useState("");
  const [dhcpUserClass, setDhcpUserClass] = useState("");
  const [dhcpVendorClassId, setDhcpVendorClassId] = useState("");
  const [dhcpv6Duid, setDhcpv6Duid] = useState("");
  const [dhcpv6NoRelease, setDhcpv6NoRelease] = useState(false);
  const [dhcpv6ParametersOnly, setDhcpv6ParametersOnly] = useState(false);
  const [dhcpv6RapidCommit, setDhcpv6RapidCommit] = useState(false);
  const [dhcpv6Temporary, setDhcpv6Temporary] = useState(false);
  const [dhcpv6NoRequestDns, setDhcpv6NoRequestDns] = useState(false);
  const [dhcpv6NoRequestDomainName, setDhcpv6NoRequestDomainName] = useState(false);
  const [dhcpv6Pd, setDhcpv6Pd] = useState<string[]>([]);
  const [dhcpv6PdInput, setDhcpv6PdInput] = useState("");
  const [ipv6AddressEui64, setIpv6AddressEui64] = useState("");
  const [ipv6AddressAutoconf, setIpv6AddressAutoconf] = useState(false);
  const [ipv6AddressNoDefaultLinkLocal, setIpv6AddressNoDefaultLinkLocal] = useState(false);
  const [ipv6AddressInterfaceIdentifier, setIpv6AddressInterfaceIdentifier] = useState("");

  // IP Settings
  const [ipAdjustMss, setIpAdjustMss] = useState("");
  const [ipAdjustMssIsCustom, setIpAdjustMssIsCustom] = useState(false);
  const [ipArpCacheTimeout, setIpArpCacheTimeout] = useState("");
  const [ipArpCacheTimeoutIsCustom, setIpArpCacheTimeoutIsCustom] = useState(false);
  const [ipSourceValidation, setIpSourceValidation] = useState("");
  const [ipDisableArpFilter, setIpDisableArpFilter] = useState(false);
  const [ipDisableForwarding, setIpDisableForwarding] = useState(false);
  const [ipEnableArpAccept, setIpEnableArpAccept] = useState(false);
  const [ipEnableArpAnnounce, setIpEnableArpAnnounce] = useState(false);
  const [ipEnableArpIgnore, setIpEnableArpIgnore] = useState(false);
  const [ipEnableDirectedBroadcast, setIpEnableDirectedBroadcast] = useState(false);
  const [ipEnableProxyArp, setIpEnableProxyArp] = useState(false);
  const [ipProxyArpPvlan, setIpProxyArpPvlan] = useState(false);

  // IPv6 Settings
  const [ipv6AcceptDad, setIpv6AcceptDad] = useState("");
  const [ipv6AdjustMss, setIpv6AdjustMss] = useState("");
  const [ipv6AdjustMssIsCustom, setIpv6AdjustMssIsCustom] = useState(false);
  const [ipv6BaseReachableTime, setIpv6BaseReachableTime] = useState("");
  const [ipv6BaseReachableTimeIsCustom, setIpv6BaseReachableTimeIsCustom] = useState(false);
  const [ipv6DupAddrDetectTransmits, setIpv6DupAddrDetectTransmits] = useState("");
  const [dadIsCustom, setDadIsCustom] = useState(false);
  const [ipv6SourceValidation, setIpv6SourceValidation] = useState("");
  const [ipv6DisableForwarding, setIpv6DisableForwarding] = useState(false);

  // Advanced
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");
  const [redirect, setRedirect] = useState("");

  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supportsNoRequestDns = capabilities?.features?.dhcpv6_no_request_dns?.supported ?? false;
  const supportsNoRequestDomainName = capabilities?.features?.dhcpv6_no_request_domain_name?.supported ?? false;
  const supportsInterfaceIdentifier = capabilities?.features?.ipv6_interface_identifier?.supported ?? false;

  const mtuMode = mtuIsCustom ? "custom" : (!mtu ? "default" : MTU_PRESETS.includes(mtu) ? mtu : "custom");
  const ipAdjustMssMode = ipAdjustMssIsCustom ? "custom" : (!ipAdjustMss ? "none" : ipAdjustMss === "clamp-mss-to-pmtu" ? "clamp" : "custom");
  const ipArpCacheTimeoutMode = ipArpCacheTimeoutIsCustom ? "custom" : (!ipArpCacheTimeout ? "none" : TIMEOUT_PRESETS.includes(ipArpCacheTimeout) ? ipArpCacheTimeout : "custom");
  const ipv6AdjustMssMode = ipv6AdjustMssIsCustom ? "custom" : (!ipv6AdjustMss ? "none" : ipv6AdjustMss === "clamp-mss-to-pmtu" ? "clamp" : "custom");
  const ipv6BaseReachableTimeMode = ipv6BaseReachableTimeIsCustom ? "custom" : (!ipv6BaseReachableTime ? "none" : TIMEOUT_PRESETS.includes(ipv6BaseReachableTime) ? ipv6BaseReachableTime : "custom");
  const dadTransmitsMode = dadIsCustom ? "custom" : (!ipv6DupAddrDetectTransmits ? "default" : DAD_PRESETS.includes(ipv6DupAddrDetectTransmits) ? ipv6DupAddrDetectTransmits : "custom");

  const getNextInterfaceName = (): string => {
    let i = 0;
    while (existingInterfaces.includes(`wwan${i}`)) i++;
    return `wwan${i}`;
  };

  const resetForm = () => {
    setName(getNextInterfaceName());
    setApn(""); setAuthUsername(""); setAuthPassword(""); setShowPassword(false);
    setConnectOnDemand(false); setDisableLinkDetect(false); setDisable(false);
    setDescription(""); setMtu(""); setMtuIsCustom(false); setVrf("");
    setAddresses("");
    setDhcpClientId(""); setDhcpDefaultRouteDistance(""); setDhcpHostName(""); setDhcpMtu("");
    setDhcpNoDefaultRoute(false); setDhcpReject([]); setDhcpRejectInput("");
    setDhcpUserClass(""); setDhcpVendorClassId("");
    setDhcpv6Duid(""); setDhcpv6NoRelease(false); setDhcpv6ParametersOnly(false);
    setDhcpv6RapidCommit(false); setDhcpv6Temporary(false);
    setDhcpv6NoRequestDns(false); setDhcpv6NoRequestDomainName(false);
    setDhcpv6Pd([]); setDhcpv6PdInput("");
    setIpv6AddressEui64(""); setIpv6AddressAutoconf(false);
    setIpv6AddressNoDefaultLinkLocal(false); setIpv6AddressInterfaceIdentifier("");
    setIpAdjustMss(""); setIpAdjustMssIsCustom(false);
    setIpArpCacheTimeout(""); setIpArpCacheTimeoutIsCustom(false);
    setIpSourceValidation("");
    setIpDisableArpFilter(false); setIpDisableForwarding(false);
    setIpEnableArpAccept(false); setIpEnableArpAnnounce(false);
    setIpEnableArpIgnore(false); setIpEnableDirectedBroadcast(false);
    setIpEnableProxyArp(false); setIpProxyArpPvlan(false);
    setIpv6AcceptDad("");
    setIpv6AdjustMss(""); setIpv6AdjustMssIsCustom(false);
    setIpv6BaseReachableTime(""); setIpv6BaseReachableTimeIsCustom(false);
    setIpv6DupAddrDetectTransmits(""); setDadIsCustom(false);
    setIpv6SourceValidation(""); setIpv6DisableForwarding(false);
    setMirrorIngress(""); setMirrorEgress(""); setRedirect("");
    setError(null);
  };

  useEffect(() => {
    if (open) {
      resetForm();
      showService.getAllInterfaces().then((res) => setAvailableInterfaces(res.interfaces)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const validateForm = (): string | null => {
    if (!name.trim()) return "Interface name is required";
    if (!/^wwan\d+$/.test(name)) return "Name must be wwan0, wwan1, wwan2, …";
    if (existingInterfaces.includes(name)) return `Interface ${name} already exists`;
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError(null);

    try {
      const addrList = addresses.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);
      const eui64List = ipv6AddressEui64.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);

      const config: Parameters<typeof wwanService.createInterface>[0] = { name };

      if (apn.trim()) config.apn = apn.trim();
      if (authUsername.trim()) config.auth_username = authUsername.trim();
      if (authPassword.trim()) config.auth_password = authPassword.trim();
      if (connectOnDemand) config.connect_on_demand = true;
      if (disable) config.disable = true;
      if (disableLinkDetect) config.disable_link_detect = true;
      if (description.trim()) config.description = description.trim();
      if (mtu) config.mtu = mtu;
      if (vrf.trim()) config.vrf = vrf.trim();
      if (addrList.length > 0) config.addresses = addrList;
      if (mirrorIngress.trim()) config.mirror_ingress = mirrorIngress.trim();
      if (mirrorEgress.trim()) config.mirror_egress = mirrorEgress.trim();
      if (redirect.trim()) config.redirect = redirect.trim();
      if (dhcpClientId.trim()) config.dhcp_client_id = dhcpClientId.trim();
      if (dhcpDefaultRouteDistance.trim()) config.dhcp_default_route_distance = dhcpDefaultRouteDistance.trim();
      if (dhcpHostName.trim()) config.dhcp_host_name = dhcpHostName.trim();
      if (dhcpMtu.trim()) config.dhcp_mtu = dhcpMtu.trim();
      if (dhcpNoDefaultRoute) config.dhcp_no_default_route = true;
      if (dhcpReject.length > 0) config.dhcp_reject = dhcpReject;
      if (dhcpUserClass.trim()) config.dhcp_user_class = dhcpUserClass.trim();
      if (dhcpVendorClassId.trim()) config.dhcp_vendor_class_id = dhcpVendorClassId.trim();
      if (dhcpv6Duid.trim()) config.dhcpv6_duid = dhcpv6Duid.trim();
      if (dhcpv6NoRelease) config.dhcpv6_no_release = true;
      if (dhcpv6ParametersOnly) config.dhcpv6_parameters_only = true;
      if (dhcpv6RapidCommit) config.dhcpv6_rapid_commit = true;
      if (dhcpv6Temporary) config.dhcpv6_temporary = true;
      if (supportsNoRequestDns && dhcpv6NoRequestDns) config.dhcpv6_no_request_dns = true;
      if (supportsNoRequestDomainName && dhcpv6NoRequestDomainName) config.dhcpv6_no_request_domain_name = true;
      if (dhcpv6Pd.length > 0) config.dhcpv6_pd = dhcpv6Pd;
      if (ipAdjustMss) config.ip_adjust_mss = ipAdjustMss;
      if (ipArpCacheTimeout) config.ip_arp_cache_timeout = ipArpCacheTimeout;
      if (ipDisableArpFilter) config.ip_disable_arp_filter = true;
      if (ipDisableForwarding) config.ip_disable_forwarding = true;
      if (ipEnableArpAccept) config.ip_enable_arp_accept = true;
      if (ipEnableArpAnnounce) config.ip_enable_arp_announce = true;
      if (ipEnableArpIgnore) config.ip_enable_arp_ignore = true;
      if (ipEnableDirectedBroadcast) config.ip_enable_directed_broadcast = true;
      if (ipEnableProxyArp) config.ip_enable_proxy_arp = true;
      if (ipProxyArpPvlan) config.ip_proxy_arp_pvlan = true;
      if (ipSourceValidation) config.ip_source_validation = ipSourceValidation;
      if (ipv6AcceptDad) config.ipv6_accept_dad = ipv6AcceptDad;
      if (ipv6AddressAutoconf) config.ipv6_address_autoconf = true;
      if (eui64List.length > 0) config.ipv6_address_eui64 = eui64List;
      if (ipv6AddressNoDefaultLinkLocal) config.ipv6_address_no_default_link_local = true;
      if (supportsInterfaceIdentifier && ipv6AddressInterfaceIdentifier.trim()) config.ipv6_address_interface_identifier = ipv6AddressInterfaceIdentifier.trim();
      if (ipv6AdjustMss) config.ipv6_adjust_mss = ipv6AdjustMss;
      if (ipv6BaseReachableTime) config.ipv6_base_reachable_time = ipv6BaseReachableTime;
      if (ipv6DisableForwarding) config.ipv6_disable_forwarding = true;
      if (ipv6DupAddrDetectTransmits) config.ipv6_dup_addr_detect_transmits = ipv6DupAddrDetectTransmits;
      if (ipv6SourceValidation) config.ipv6_source_validation = ipv6SourceValidation;

      const result = await wwanService.createInterface(config);
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to create WWAN interface");
      }
    } catch (err) {
      const msg = (err as ApiError).message;
      setError(typeof msg === "string" ? msg : JSON.stringify(msg, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Signal className="h-5 w-5" />
            Create WWAN Interface
          </DialogTitle>
          <DialogDescription>
            Create a new Wireless WAN (cellular modem) interface.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="connection" className="mt-2">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="ip">IP</TabsTrigger>
            <TabsTrigger value="ipv6">IPv6</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Connection Tab */}
          <TabsContent value="connection" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Interface Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="wwan0"
              />
              <p className="text-xs text-muted-foreground">Must match pattern: wwan0, wwan1, wwan2, …</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apn">APN</Label>
              <Input
                id="apn"
                value={apn}
                onChange={(e) => setApn(e.target.value)}
                placeholder="internet"
              />
              <p className="text-xs text-muted-foreground">Access Point Name provided by your carrier</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="authUsername">Auth Username</Label>
              <Input
                id="authUsername"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder="Optional"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="authPassword">Auth Password</Label>
              <div className="relative">
                <Input
                  id="authPassword"
                  type={showPassword ? "text" : "password"}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Optional"
                  autoComplete="new-password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="connectOnDemand" checked={connectOnDemand} onCheckedChange={(c) => setConnectOnDemand(c === true)} />
              <Label htmlFor="connectOnDemand" className="font-normal">Connect on Demand</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="disableLinkDetect" checked={disableLinkDetect} onCheckedChange={(c) => setDisableLinkDetect(c === true)} />
              <Label htmlFor="disableLinkDetect" className="font-normal">Disable Link Detect</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="disable" checked={disable} onCheckedChange={(c) => setDisable(c === true)} />
              <Label htmlFor="disable" className="font-normal">Disable Interface</Label>
            </div>
          </TabsContent>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mtu">MTU</Label>
              <Select
                value={mtuMode}
                onValueChange={(v) => {
                  if (v === "default") { setMtu(""); setMtuIsCustom(false); }
                  else if (v === "custom") { setMtu(""); setMtuIsCustom(true); }
                  else { setMtu(v); setMtuIsCustom(false); }
                }}
              >
                <SelectTrigger id="mtu"><SelectValue placeholder="Default (1430)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default (1430)</SelectItem>
                  <SelectItem value="1280">1280 — IPv6 minimum</SelectItem>
                  <SelectItem value="1400">1400 — common for VPN</SelectItem>
                  <SelectItem value="1430">1430 — WWAN default</SelectItem>
                  <SelectItem value="1500">1500 — standard Ethernet</SelectItem>
                  <SelectItem value="custom">Custom value (68–1500)</SelectItem>
                </SelectContent>
              </Select>
              {mtuMode === "custom" && (
                <Input
                  value={mtu}
                  onChange={(e) => setMtu(e.target.value)}
                  placeholder="Enter MTU (68–1500)"
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vrf">VRF</Label>
              <Input
                id="vrf"
                value={vrf}
                onChange={(e) => setVrf(e.target.value)}
                placeholder="Optional VRF name"
              />
            </div>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label htmlFor="addresses">IP Addresses</Label>
              <Textarea
                id="addresses"
                value={addresses}
                onChange={(e) => setAddresses(e.target.value)}
                placeholder={"10.0.0.1/32\ndhcp\ndhcpv6"}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">One per line — CIDR, dhcp, or dhcpv6</p>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium">DHCP Options</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="dhcpClientId" className="text-xs">Client ID</Label>
                  <Input id="dhcpClientId" value={dhcpClientId} onChange={(e) => setDhcpClientId(e.target.value)} placeholder="Optional" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dhcpHostName" className="text-xs">Host Name</Label>
                  <Input id="dhcpHostName" value={dhcpHostName} onChange={(e) => setDhcpHostName(e.target.value)} placeholder="Optional" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dhcpUserClass" className="text-xs">User Class</Label>
                  <Input id="dhcpUserClass" value={dhcpUserClass} onChange={(e) => setDhcpUserClass(e.target.value)} placeholder="Optional" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dhcpVendorClassId" className="text-xs">Vendor Class ID</Label>
                  <Input id="dhcpVendorClassId" value={dhcpVendorClassId} onChange={(e) => setDhcpVendorClassId(e.target.value)} placeholder="Optional" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dhcpRouteDistance" className="text-xs">Default Route Distance (1–255)</Label>
                  <Input id="dhcpRouteDistance" value={dhcpDefaultRouteDistance} onChange={(e) => setDhcpDefaultRouteDistance(e.target.value)} placeholder="Optional" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dhcpMtu" className="text-xs">DHCP MTU</Label>
                  <Input id="dhcpMtu" value={dhcpMtu} onChange={(e) => setDhcpMtu(e.target.value)} placeholder="Optional" className="h-8 text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="dhcpNoDefaultRoute" checked={dhcpNoDefaultRoute} onCheckedChange={(c) => setDhcpNoDefaultRoute(c === true)} />
                <Label htmlFor="dhcpNoDefaultRoute" className="font-normal text-sm">No Default Route</Label>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Reject Entries</Label>
                <div className="flex gap-2">
                  <Input
                    value={dhcpRejectInput}
                    onChange={(e) => setDhcpRejectInput(e.target.value)}
                    placeholder="IP or subnet to reject"
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && dhcpRejectInput.trim()) {
                        setDhcpReject([...dhcpReject, dhcpRejectInput.trim()]);
                        setDhcpRejectInput("");
                        e.preventDefault();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => {
                    if (dhcpRejectInput.trim()) { setDhcpReject([...dhcpReject, dhcpRejectInput.trim()]); setDhcpRejectInput(""); }
                  }}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                {dhcpReject.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {dhcpReject.map((r, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs bg-accent px-2 py-0.5 rounded">
                        {r}
                        <button onClick={() => setDhcpReject(dhcpReject.filter((_, idx) => idx !== i))} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium">DHCPv6 Options</h4>
              <div className="space-y-1">
                <Label htmlFor="dhcpv6Duid" className="text-xs">DUID</Label>
                <Input id="dhcpv6Duid" value={dhcpv6Duid} onChange={(e) => setDhcpv6Duid(e.target.value)} placeholder="Optional" className="h-8 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="dhcpv6NoRelease" checked={dhcpv6NoRelease} onCheckedChange={(c) => setDhcpv6NoRelease(c === true)} />
                  <Label htmlFor="dhcpv6NoRelease" className="font-normal text-sm">No Release</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="dhcpv6ParametersOnly" checked={dhcpv6ParametersOnly} onCheckedChange={(c) => setDhcpv6ParametersOnly(c === true)} />
                  <Label htmlFor="dhcpv6ParametersOnly" className="font-normal text-sm">Parameters Only</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="dhcpv6RapidCommit" checked={dhcpv6RapidCommit} onCheckedChange={(c) => setDhcpv6RapidCommit(c === true)} />
                  <Label htmlFor="dhcpv6RapidCommit" className="font-normal text-sm">Rapid Commit</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="dhcpv6Temporary" checked={dhcpv6Temporary} onCheckedChange={(c) => setDhcpv6Temporary(c === true)} />
                  <Label htmlFor="dhcpv6Temporary" className="font-normal text-sm">Temporary</Label>
                </div>
                {supportsNoRequestDns && (
                  <div className="flex items-center gap-2">
                    <Checkbox id="dhcpv6NoRequestDns" checked={dhcpv6NoRequestDns} onCheckedChange={(c) => setDhcpv6NoRequestDns(c === true)} />
                    <Label htmlFor="dhcpv6NoRequestDns" className="font-normal text-sm">No Request DNS</Label>
                  </div>
                )}
                {supportsNoRequestDomainName && (
                  <div className="flex items-center gap-2">
                    <Checkbox id="dhcpv6NoRequestDomainName" checked={dhcpv6NoRequestDomainName} onCheckedChange={(c) => setDhcpv6NoRequestDomainName(c === true)} />
                    <Label htmlFor="dhcpv6NoRequestDomainName" className="font-normal text-sm">No Request Domain Name</Label>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Prefix Delegation (PD) Instances</Label>
                <div className="flex gap-2">
                  <Input
                    value={dhcpv6PdInput}
                    onChange={(e) => setDhcpv6PdInput(e.target.value)}
                    placeholder="Instance ID (e.g. 0)"
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && dhcpv6PdInput.trim()) {
                        setDhcpv6Pd([...dhcpv6Pd, dhcpv6PdInput.trim()]);
                        setDhcpv6PdInput("");
                        e.preventDefault();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => {
                    if (dhcpv6PdInput.trim()) { setDhcpv6Pd([...dhcpv6Pd, dhcpv6PdInput.trim()]); setDhcpv6PdInput(""); }
                  }}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                {dhcpv6Pd.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {dhcpv6Pd.map((pd, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs bg-accent px-2 py-0.5 rounded">
                        pd{pd}
                        <button onClick={() => setDhcpv6Pd(dhcpv6Pd.filter((_, idx) => idx !== i))} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-medium">IPv6 Address Options</h4>
              <div className="space-y-2">
                <Label htmlFor="ipv6Eui64" className="text-xs">EUI-64 Prefixes</Label>
                <Textarea
                  id="ipv6Eui64"
                  value={ipv6AddressEui64}
                  onChange={(e) => setIpv6AddressEui64(e.target.value)}
                  placeholder="2001:db8::/64"
                  rows={2}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">One /64 prefix per line</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="ipv6Autoconf" checked={ipv6AddressAutoconf} onCheckedChange={(c) => setIpv6AddressAutoconf(c === true)} />
                  <Label htmlFor="ipv6Autoconf" className="font-normal text-sm">Autoconf (SLAAC)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="noDefaultLinkLocal" checked={ipv6AddressNoDefaultLinkLocal} onCheckedChange={(c) => setIpv6AddressNoDefaultLinkLocal(c === true)} />
                  <Label htmlFor="noDefaultLinkLocal" className="font-normal text-sm">No Default Link-Local</Label>
                </div>
              </div>
              {supportsInterfaceIdentifier && (
                <div className="space-y-1">
                  <Label htmlFor="interfaceIdentifier" className="text-xs">Interface Identifier</Label>
                  <Input
                    id="interfaceIdentifier"
                    value={ipv6AddressInterfaceIdentifier}
                    onChange={(e) => setIpv6AddressInterfaceIdentifier(e.target.value)}
                    placeholder="e.g. ::1"
                    className="h-8 text-sm"
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* IP Settings Tab */}
          <TabsContent value="ip" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="ipAdjustMss">Adjust TCP MSS</Label>
              <Select
                value={ipAdjustMssMode}
                onValueChange={(v) => {
                  if (v === "none") { setIpAdjustMss(""); setIpAdjustMssIsCustom(false); }
                  else if (v === "clamp") { setIpAdjustMss("clamp-mss-to-pmtu"); setIpAdjustMssIsCustom(false); }
                  else { setIpAdjustMss(""); setIpAdjustMssIsCustom(true); }
                }}
              >
                <SelectTrigger id="ipAdjustMss"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (default)</SelectItem>
                  <SelectItem value="clamp">Clamp to PMTU</SelectItem>
                  <SelectItem value="custom">Custom value (536–65535)</SelectItem>
                </SelectContent>
              </Select>
              {ipAdjustMssMode === "custom" && (
                <Input value={ipAdjustMss} onChange={(e) => setIpAdjustMss(e.target.value)} placeholder="Enter value (536–65535)" className="mt-2" />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ipArpCacheTimeout">ARP Cache Timeout</Label>
              <Select
                value={ipArpCacheTimeoutMode}
                onValueChange={(v) => {
                  if (v === "none") { setIpArpCacheTimeout(""); setIpArpCacheTimeoutIsCustom(false); }
                  else if (v === "custom") { setIpArpCacheTimeout(""); setIpArpCacheTimeoutIsCustom(true); }
                  else { setIpArpCacheTimeout(v); setIpArpCacheTimeoutIsCustom(false); }
                }}
              >
                <SelectTrigger id="ipArpCacheTimeout"><SelectValue placeholder="Default (30s)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Default (30s)</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                  <SelectItem value="600">10 minutes</SelectItem>
                  <SelectItem value="3600">1 hour</SelectItem>
                  <SelectItem value="custom">Custom (1–86400 seconds)</SelectItem>
                </SelectContent>
              </Select>
              {ipArpCacheTimeoutMode === "custom" && (
                <Input value={ipArpCacheTimeout} onChange={(e) => setIpArpCacheTimeout(e.target.value)} placeholder="Enter seconds (1–86400)" className="mt-2" />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ipSourceValidation">Source Validation</Label>
              <Select value={ipSourceValidation || "none"} onValueChange={(v) => setIpSourceValidation(v === "none" ? "" : v)}>
                <SelectTrigger id="ipSourceValidation"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="strict">Strict</SelectItem>
                  <SelectItem value="loose">Loose</SelectItem>
                  <SelectItem value="disable">Disable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { id: "ipDisableArpFilter", checked: ipDisableArpFilter, onChange: setIpDisableArpFilter, label: "Disable ARP Filter" },
                { id: "ipDisableForwarding", checked: ipDisableForwarding, onChange: setIpDisableForwarding, label: "Disable Forwarding" },
                { id: "ipEnableArpAccept", checked: ipEnableArpAccept, onChange: setIpEnableArpAccept, label: "Enable ARP Accept" },
                { id: "ipEnableArpAnnounce", checked: ipEnableArpAnnounce, onChange: setIpEnableArpAnnounce, label: "Enable ARP Announce" },
                { id: "ipEnableArpIgnore", checked: ipEnableArpIgnore, onChange: setIpEnableArpIgnore, label: "Enable ARP Ignore" },
                { id: "ipEnableDirectedBroadcast", checked: ipEnableDirectedBroadcast, onChange: setIpEnableDirectedBroadcast, label: "Enable Directed Broadcast" },
                { id: "ipEnableProxyArp", checked: ipEnableProxyArp, onChange: setIpEnableProxyArp, label: "Enable Proxy ARP" },
                { id: "ipProxyArpPvlan", checked: ipProxyArpPvlan, onChange: setIpProxyArpPvlan, label: "Private VLAN Proxy ARP" },
              ].map(({ id, checked, onChange, label }) => (
                <div key={id} className="flex items-center gap-2">
                  <Checkbox id={id} checked={checked} onCheckedChange={(c) => onChange(c === true)} />
                  <Label htmlFor={id} className="font-normal text-sm">{label}</Label>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* IPv6 Settings Tab */}
          <TabsContent value="ipv6" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="ipv6AcceptDad">Accept DAD</Label>
              <Select value={ipv6AcceptDad || "default"} onValueChange={(v) => setIpv6AcceptDad(v === "default" ? "" : v)}>
                <SelectTrigger id="ipv6AcceptDad"><SelectValue placeholder="Default" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="0">0 — Disabled</SelectItem>
                  <SelectItem value="1">1 — Enabled (default)</SelectItem>
                  <SelectItem value="2">2 — Enabled, disable IPv6 if MAC-based duplicate found</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ipv6AdjustMss">Adjust TCP MSS (IPv6)</Label>
              <Select
                value={ipv6AdjustMssMode}
                onValueChange={(v) => {
                  if (v === "none") { setIpv6AdjustMss(""); setIpv6AdjustMssIsCustom(false); }
                  else if (v === "clamp") { setIpv6AdjustMss("clamp-mss-to-pmtu"); setIpv6AdjustMssIsCustom(false); }
                  else { setIpv6AdjustMss(""); setIpv6AdjustMssIsCustom(true); }
                }}
              >
                <SelectTrigger id="ipv6AdjustMss"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (default)</SelectItem>
                  <SelectItem value="clamp">Clamp to PMTU</SelectItem>
                  <SelectItem value="custom">Custom value (536–65535)</SelectItem>
                </SelectContent>
              </Select>
              {ipv6AdjustMssMode === "custom" && (
                <Input value={ipv6AdjustMss} onChange={(e) => setIpv6AdjustMss(e.target.value)} placeholder="Enter value (536–65535)" className="mt-2" />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ipv6BaseReachableTime">Base Reachable Time</Label>
              <Select
                value={ipv6BaseReachableTimeMode}
                onValueChange={(v) => {
                  if (v === "none") { setIpv6BaseReachableTime(""); setIpv6BaseReachableTimeIsCustom(false); }
                  else if (v === "custom") { setIpv6BaseReachableTime(""); setIpv6BaseReachableTimeIsCustom(true); }
                  else { setIpv6BaseReachableTime(v); setIpv6BaseReachableTimeIsCustom(false); }
                }}
              >
                <SelectTrigger id="ipv6BaseReachableTime"><SelectValue placeholder="Default (30s)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Default (30s)</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                  <SelectItem value="custom">Custom (1–86400 seconds)</SelectItem>
                </SelectContent>
              </Select>
              {ipv6BaseReachableTimeMode === "custom" && (
                <Input value={ipv6BaseReachableTime} onChange={(e) => setIpv6BaseReachableTime(e.target.value)} placeholder="Enter seconds (1–86400)" className="mt-2" />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ipv6DupAddrDetectTransmits">Duplicate Address Detect Transmits</Label>
              <Select
                value={dadTransmitsMode}
                onValueChange={(v) => {
                  if (v === "default") { setIpv6DupAddrDetectTransmits(""); setDadIsCustom(false); }
                  else if (v === "custom") { setIpv6DupAddrDetectTransmits(""); setDadIsCustom(true); }
                  else { setIpv6DupAddrDetectTransmits(v); setDadIsCustom(false); }
                }}
              >
                <SelectTrigger id="ipv6DupAddrDetectTransmits"><SelectValue placeholder="Default" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="0">0 — Disabled</SelectItem>
                  <SelectItem value="1">1 — 1 transmit</SelectItem>
                  <SelectItem value="2">2 — 2 transmits</SelectItem>
                  <SelectItem value="3">3 — 3 transmits</SelectItem>
                  <SelectItem value="custom">Custom count</SelectItem>
                </SelectContent>
              </Select>
              {dadTransmitsMode === "custom" && (
                <Input value={ipv6DupAddrDetectTransmits} onChange={(e) => setIpv6DupAddrDetectTransmits(e.target.value)} placeholder="Enter count (0 or greater)" className="mt-2" />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ipv6SourceValidation">Source Validation (IPv6)</Label>
              <Select value={ipv6SourceValidation || "none"} onValueChange={(v) => setIpv6SourceValidation(v === "none" ? "" : v)}>
                <SelectTrigger id="ipv6SourceValidation"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="strict">Strict</SelectItem>
                  <SelectItem value="loose">Loose</SelectItem>
                  <SelectItem value="disable">Disable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="ipv6DisableForwarding" checked={ipv6DisableForwarding} onCheckedChange={(c) => setIpv6DisableForwarding(c === true)} />
              <Label htmlFor="ipv6DisableForwarding" className="font-normal">Disable IPv6 Forwarding</Label>
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            <h4 className="text-sm font-medium text-foreground">Traffic Mirroring &amp; Redirect</h4>
            <div className="space-y-2">
              <Label>Mirror Ingress →</Label>
              <Select value={mirrorIngress || "none"} onValueChange={(v) => setMirrorIngress(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {availableInterfaces.map((iface) => (
                    <SelectItem key={iface.name} value={iface.name}>{iface.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mirror Egress →</Label>
              <Select value={mirrorEgress || "none"} onValueChange={(v) => setMirrorEgress(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {availableInterfaces.map((iface) => (
                    <SelectItem key={iface.name} value={iface.name}>{iface.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Redirect To</Label>
              <Select value={redirect || "none"} onValueChange={(v) => setRedirect(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {availableInterfaces.map((iface) => (
                    <SelectItem key={iface.name} value={iface.name}>{iface.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 mt-4">
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
