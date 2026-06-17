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
import { VrfSelect } from "@/components/ui/vrf-select";
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
import { wwanService, type WwanInterface, type WwanCapabilities } from "@/lib/api/wwan";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";

interface EditWwanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: WwanCapabilities | null;
  interfaceData: WwanInterface | null;
}

const MTU_PRESETS = ["1280", "1400", "1430", "1500"];
const TIMEOUT_PRESETS = ["30", "60", "300", "600", "3600"];
const DAD_PRESETS = ["0", "1", "2", "3"];

const getMssMode = (v: string) => !v ? "none" : v === "clamp-mss-to-pmtu" ? "clamp" : "custom";
const getMtuMode = (v: string) => !v ? "default" : MTU_PRESETS.includes(v) ? v : "custom";
const getTimeoutMode = (v: string) => !v ? "none" : TIMEOUT_PRESETS.includes(v) ? v : "custom";
const getDadMode = (v: string) => !v ? "default" : DAD_PRESETS.includes(v) ? v : "custom";

export function EditWwanModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  interfaceData,
}: EditWwanModalProps) {
  // Connection
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

  const mtuMode = mtuIsCustom ? "custom" : getMtuMode(mtu);
  const ipAdjustMssMode = ipAdjustMssIsCustom ? "custom" : getMssMode(ipAdjustMss);
  const ipArpCacheTimeoutMode = ipArpCacheTimeoutIsCustom ? "custom" : getTimeoutMode(ipArpCacheTimeout);
  const ipv6AdjustMssMode = ipv6AdjustMssIsCustom ? "custom" : getMssMode(ipv6AdjustMss);
  const ipv6BaseReachableTimeMode = ipv6BaseReachableTimeIsCustom ? "custom" : getTimeoutMode(ipv6BaseReachableTime);
  const dadTransmitsMode = dadIsCustom ? "custom" : getDadMode(ipv6DupAddrDetectTransmits);

  useEffect(() => {
    if (!interfaceData) return;

    showService.getAllInterfaces().then((res) => setAvailableInterfaces(res.interfaces)).catch(() => {});
    setApn(interfaceData.apn ?? "");
    setAuthUsername(interfaceData.auth_username ?? "");
    setAuthPassword(interfaceData.auth_password ?? "");
    setShowPassword(false);
    setConnectOnDemand(interfaceData.connect_on_demand);
    setDisableLinkDetect(interfaceData.disable_link_detect);
    setDisable(interfaceData.disable);
    setDescription(interfaceData.description ?? "");
    const iMtu = interfaceData.mtu ?? "";
    setMtu(iMtu);
    setMtuIsCustom(!!iMtu && !MTU_PRESETS.includes(iMtu));
    setVrf(interfaceData.vrf ?? "");
    setAddresses(interfaceData.addresses.join("\n"));
    setDhcpClientId(interfaceData.dhcp_client_id ?? "");
    setDhcpDefaultRouteDistance(interfaceData.dhcp_default_route_distance ?? "");
    setDhcpHostName(interfaceData.dhcp_host_name ?? "");
    setDhcpMtu(interfaceData.dhcp_mtu ?? "");
    setDhcpNoDefaultRoute(interfaceData.dhcp_no_default_route);
    setDhcpReject([...(interfaceData.dhcp_reject ?? [])]);
    setDhcpRejectInput("");
    setDhcpUserClass(interfaceData.dhcp_user_class ?? "");
    setDhcpVendorClassId(interfaceData.dhcp_vendor_class_id ?? "");
    setDhcpv6Duid(interfaceData.dhcpv6_duid ?? "");
    setDhcpv6NoRelease(interfaceData.dhcpv6_no_release);
    setDhcpv6ParametersOnly(interfaceData.dhcpv6_parameters_only);
    setDhcpv6RapidCommit(interfaceData.dhcpv6_rapid_commit);
    setDhcpv6Temporary(interfaceData.dhcpv6_temporary);
    setDhcpv6NoRequestDns(interfaceData.dhcpv6_no_request_dns ?? false);
    setDhcpv6NoRequestDomainName(interfaceData.dhcpv6_no_request_domain_name ?? false);
    setDhcpv6Pd((interfaceData.dhcpv6_pd ?? []).map((pd) => pd.id));
    setDhcpv6PdInput("");
    setIpv6AddressEui64(interfaceData.ipv6_address_eui64.join("\n"));
    setIpv6AddressAutoconf(interfaceData.ipv6_address_autoconf);
    setIpv6AddressNoDefaultLinkLocal(interfaceData.ipv6_address_no_default_link_local);
    setIpv6AddressInterfaceIdentifier(interfaceData.ipv6_address_interface_identifier ?? "");
    const iaMss = interfaceData.ip_adjust_mss ?? "";
    setIpAdjustMss(iaMss);
    setIpAdjustMssIsCustom(!!iaMss && iaMss !== "clamp-mss-to-pmtu");
    const iAct = interfaceData.ip_arp_cache_timeout ?? "";
    setIpArpCacheTimeout(iAct);
    setIpArpCacheTimeoutIsCustom(!!iAct && !TIMEOUT_PRESETS.includes(iAct));
    setIpSourceValidation(interfaceData.ip_source_validation ?? "");
    setIpDisableArpFilter(interfaceData.ip_disable_arp_filter);
    setIpDisableForwarding(interfaceData.ip_disable_forwarding);
    setIpEnableArpAccept(interfaceData.ip_enable_arp_accept);
    setIpEnableArpAnnounce(interfaceData.ip_enable_arp_announce);
    setIpEnableArpIgnore(interfaceData.ip_enable_arp_ignore);
    setIpEnableDirectedBroadcast(interfaceData.ip_enable_directed_broadcast);
    setIpEnableProxyArp(interfaceData.ip_enable_proxy_arp);
    setIpProxyArpPvlan(interfaceData.ip_proxy_arp_pvlan);
    setIpv6AcceptDad(interfaceData.ipv6_accept_dad ?? "");
    const i6Mss = interfaceData.ipv6_adjust_mss ?? "";
    setIpv6AdjustMss(i6Mss);
    setIpv6AdjustMssIsCustom(!!i6Mss && i6Mss !== "clamp-mss-to-pmtu");
    const i6Brt = interfaceData.ipv6_base_reachable_time ?? "";
    setIpv6BaseReachableTime(i6Brt);
    setIpv6BaseReachableTimeIsCustom(!!i6Brt && !TIMEOUT_PRESETS.includes(i6Brt));
    const i6Dad = interfaceData.ipv6_dup_addr_detect_transmits ?? "";
    setIpv6DupAddrDetectTransmits(i6Dad);
    setDadIsCustom(!!i6Dad && !DAD_PRESETS.includes(i6Dad));
    setIpv6SourceValidation(interfaceData.ipv6_source_validation ?? "");
    setIpv6DisableForwarding(interfaceData.ipv6_disable_forwarding);
    setMirrorIngress(interfaceData.mirror_ingress ?? "");
    setMirrorEgress(interfaceData.mirror_egress ?? "");
    setRedirect(interfaceData.redirect ?? "");
    setError(null);
  }, [interfaceData]);

  const handleSubmit = async () => {
    if (!interfaceData) return;

    setLoading(true);
    setError(null);

    try {
      const addrList = addresses.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);
      const eui64List = ipv6AddressEui64.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);

      const result = await wwanService.updateInterface(interfaceData.name, interfaceData, {
        description: description.trim() || null,
        apn: apn.trim() || null,
        auth_username: authUsername.trim() || null,
        auth_password: authPassword.trim() || null,
        connect_on_demand: connectOnDemand,
        disable,
        disable_link_detect: disableLinkDetect,
        mtu: mtu || null,
        vrf: vrf.trim() || null,
        addresses: addrList,
        redirect: redirect.trim() || null,
        mirror_ingress: mirrorIngress.trim() || null,
        mirror_egress: mirrorEgress.trim() || null,
        dhcp_client_id: dhcpClientId.trim() || null,
        dhcp_default_route_distance: dhcpDefaultRouteDistance.trim() || null,
        dhcp_host_name: dhcpHostName.trim() || null,
        dhcp_mtu: dhcpMtu.trim() || null,
        dhcp_no_default_route: dhcpNoDefaultRoute,
        dhcp_reject: dhcpReject,
        dhcp_user_class: dhcpUserClass.trim() || null,
        dhcp_vendor_class_id: dhcpVendorClassId.trim() || null,
        dhcpv6_duid: dhcpv6Duid.trim() || null,
        dhcpv6_no_release: dhcpv6NoRelease,
        dhcpv6_parameters_only: dhcpv6ParametersOnly,
        dhcpv6_rapid_commit: dhcpv6RapidCommit,
        dhcpv6_temporary: dhcpv6Temporary,
        ...(supportsNoRequestDns ? { dhcpv6_no_request_dns: dhcpv6NoRequestDns } : {}),
        ...(supportsNoRequestDomainName ? { dhcpv6_no_request_domain_name: dhcpv6NoRequestDomainName } : {}),
        dhcpv6_pd: dhcpv6Pd,
        ip_adjust_mss: ipAdjustMss || null,
        ip_arp_cache_timeout: ipArpCacheTimeout || null,
        ip_disable_arp_filter: ipDisableArpFilter,
        ip_disable_forwarding: ipDisableForwarding,
        ip_enable_arp_accept: ipEnableArpAccept,
        ip_enable_arp_announce: ipEnableArpAnnounce,
        ip_enable_arp_ignore: ipEnableArpIgnore,
        ip_enable_directed_broadcast: ipEnableDirectedBroadcast,
        ip_enable_proxy_arp: ipEnableProxyArp,
        ip_proxy_arp_pvlan: ipProxyArpPvlan,
        ip_source_validation: ipSourceValidation || null,
        ipv6_accept_dad: ipv6AcceptDad || null,
        ipv6_address_autoconf: ipv6AddressAutoconf,
        ipv6_address_eui64: eui64List,
        ipv6_address_no_default_link_local: ipv6AddressNoDefaultLinkLocal,
        ...(supportsInterfaceIdentifier ? { ipv6_address_interface_identifier: ipv6AddressInterfaceIdentifier.trim() || null } : {}),
        ipv6_adjust_mss: ipv6AdjustMss || null,
        ipv6_base_reachable_time: ipv6BaseReachableTime || null,
        ipv6_disable_forwarding: ipv6DisableForwarding,
        ipv6_dup_addr_detect_transmits: ipv6DupAddrDetectTransmits || null,
        ipv6_source_validation: ipv6SourceValidation || null,
      });

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to update WWAN interface");
      }
    } catch (err) {
      const msg = (err as ApiError).message;
      setError(typeof msg === "string" ? msg : JSON.stringify(msg, null, 2));
    } finally {
      setLoading(false);
    }
  };

  if (!interfaceData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Signal className="h-5 w-5" />
            Edit WWAN Interface
          </DialogTitle>
          <DialogDescription>
            Editing interface{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
              {interfaceData.name}
            </code>
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
              <Label>Interface Name</Label>
              <code className="block rounded bg-muted px-3 py-2 font-mono text-sm text-foreground">
                {interfaceData.name}
              </code>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-apn">APN</Label>
              <Input
                id="edit-apn"
                value={apn}
                onChange={(e) => setApn(e.target.value)}
                placeholder="internet"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-authUsername">Auth Username</Label>
              <Input
                id="edit-authUsername"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder="Optional"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-authPassword">Auth Password</Label>
              <div className="relative">
                <Input
                  id="edit-authPassword"
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
              <Checkbox id="edit-connectOnDemand" checked={connectOnDemand} onCheckedChange={(c) => setConnectOnDemand(c === true)} />
              <Label htmlFor="edit-connectOnDemand" className="font-normal">Connect on Demand</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="edit-disableLinkDetect" checked={disableLinkDetect} onCheckedChange={(c) => setDisableLinkDetect(c === true)} />
              <Label htmlFor="edit-disableLinkDetect" className="font-normal">Disable Link Detect</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="edit-disable" checked={disable} onCheckedChange={(c) => setDisable(c === true)} />
              <Label htmlFor="edit-disable" className="font-normal">Disable Interface</Label>
            </div>
          </TabsContent>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-mtu">MTU</Label>
              <Select
                value={mtuMode}
                onValueChange={(v) => {
                  if (v === "default") { setMtu(""); setMtuIsCustom(false); }
                  else if (v === "custom") { setMtu(""); setMtuIsCustom(true); }
                  else { setMtu(v); setMtuIsCustom(false); }
                }}
              >
                <SelectTrigger id="edit-mtu"><SelectValue placeholder="Default (1430)" /></SelectTrigger>
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
                <Input value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="Enter MTU (68–1500)" className="mt-2" />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-vrf">VRF</Label>
              <VrfSelect
                id="edit-vrf"
                value={vrf}
                onValueChange={setVrf}
              />
            </div>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-addresses">IP Addresses</Label>
              <Textarea
                id="edit-addresses"
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
                  <Label htmlFor="edit-dhcpClientId" className="text-xs">Client ID</Label>
                  <Input id="edit-dhcpClientId" value={dhcpClientId} onChange={(e) => setDhcpClientId(e.target.value)} placeholder="Optional" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-dhcpHostName" className="text-xs">Host Name</Label>
                  <Input id="edit-dhcpHostName" value={dhcpHostName} onChange={(e) => setDhcpHostName(e.target.value)} placeholder="Optional" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-dhcpUserClass" className="text-xs">User Class</Label>
                  <Input id="edit-dhcpUserClass" value={dhcpUserClass} onChange={(e) => setDhcpUserClass(e.target.value)} placeholder="Optional" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-dhcpVendorClassId" className="text-xs">Vendor Class ID</Label>
                  <Input id="edit-dhcpVendorClassId" value={dhcpVendorClassId} onChange={(e) => setDhcpVendorClassId(e.target.value)} placeholder="Optional" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-dhcpRouteDistance" className="text-xs">Default Route Distance (1–255)</Label>
                  <Input id="edit-dhcpRouteDistance" value={dhcpDefaultRouteDistance} onChange={(e) => setDhcpDefaultRouteDistance(e.target.value)} placeholder="Optional" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-dhcpMtu" className="text-xs">DHCP MTU</Label>
                  <Input id="edit-dhcpMtu" value={dhcpMtu} onChange={(e) => setDhcpMtu(e.target.value)} placeholder="Optional" className="h-8 text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="edit-dhcpNoDefaultRoute" checked={dhcpNoDefaultRoute} onCheckedChange={(c) => setDhcpNoDefaultRoute(c === true)} />
                <Label htmlFor="edit-dhcpNoDefaultRoute" className="font-normal text-sm">No Default Route</Label>
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
                <Label htmlFor="edit-dhcpv6Duid" className="text-xs">DUID</Label>
                <Input id="edit-dhcpv6Duid" value={dhcpv6Duid} onChange={(e) => setDhcpv6Duid(e.target.value)} placeholder="Optional" className="h-8 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="edit-dhcpv6NoRelease" checked={dhcpv6NoRelease} onCheckedChange={(c) => setDhcpv6NoRelease(c === true)} />
                  <Label htmlFor="edit-dhcpv6NoRelease" className="font-normal text-sm">No Release</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="edit-dhcpv6ParametersOnly" checked={dhcpv6ParametersOnly} onCheckedChange={(c) => setDhcpv6ParametersOnly(c === true)} />
                  <Label htmlFor="edit-dhcpv6ParametersOnly" className="font-normal text-sm">Parameters Only</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="edit-dhcpv6RapidCommit" checked={dhcpv6RapidCommit} onCheckedChange={(c) => setDhcpv6RapidCommit(c === true)} />
                  <Label htmlFor="edit-dhcpv6RapidCommit" className="font-normal text-sm">Rapid Commit</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="edit-dhcpv6Temporary" checked={dhcpv6Temporary} onCheckedChange={(c) => setDhcpv6Temporary(c === true)} />
                  <Label htmlFor="edit-dhcpv6Temporary" className="font-normal text-sm">Temporary</Label>
                </div>
                {supportsNoRequestDns && (
                  <div className="flex items-center gap-2">
                    <Checkbox id="edit-dhcpv6NoRequestDns" checked={dhcpv6NoRequestDns} onCheckedChange={(c) => setDhcpv6NoRequestDns(c === true)} />
                    <Label htmlFor="edit-dhcpv6NoRequestDns" className="font-normal text-sm">No Request DNS</Label>
                  </div>
                )}
                {supportsNoRequestDomainName && (
                  <div className="flex items-center gap-2">
                    <Checkbox id="edit-dhcpv6NoRequestDomainName" checked={dhcpv6NoRequestDomainName} onCheckedChange={(c) => setDhcpv6NoRequestDomainName(c === true)} />
                    <Label htmlFor="edit-dhcpv6NoRequestDomainName" className="font-normal text-sm">No Request Domain Name</Label>
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
                <Label htmlFor="edit-ipv6Eui64" className="text-xs">EUI-64 Prefixes</Label>
                <Textarea
                  id="edit-ipv6Eui64"
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
                  <Checkbox id="edit-ipv6Autoconf" checked={ipv6AddressAutoconf} onCheckedChange={(c) => setIpv6AddressAutoconf(c === true)} />
                  <Label htmlFor="edit-ipv6Autoconf" className="font-normal text-sm">Autoconf (SLAAC)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="edit-noDefaultLinkLocal" checked={ipv6AddressNoDefaultLinkLocal} onCheckedChange={(c) => setIpv6AddressNoDefaultLinkLocal(c === true)} />
                  <Label htmlFor="edit-noDefaultLinkLocal" className="font-normal text-sm">No Default Link-Local</Label>
                </div>
              </div>
              {supportsInterfaceIdentifier && (
                <div className="space-y-1">
                  <Label htmlFor="edit-interfaceIdentifier" className="text-xs">Interface Identifier</Label>
                  <Input
                    id="edit-interfaceIdentifier"
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
              <Label htmlFor="edit-ipAdjustMss">Adjust TCP MSS</Label>
              <Select
                value={ipAdjustMssMode}
                onValueChange={(v) => {
                  if (v === "none") { setIpAdjustMss(""); setIpAdjustMssIsCustom(false); }
                  else if (v === "clamp") { setIpAdjustMss("clamp-mss-to-pmtu"); setIpAdjustMssIsCustom(false); }
                  else { setIpAdjustMss(""); setIpAdjustMssIsCustom(true); }
                }}
              >
                <SelectTrigger id="edit-ipAdjustMss"><SelectValue placeholder="None" /></SelectTrigger>
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
              <Label htmlFor="edit-ipArpCacheTimeout">ARP Cache Timeout</Label>
              <Select
                value={ipArpCacheTimeoutMode}
                onValueChange={(v) => {
                  if (v === "none") { setIpArpCacheTimeout(""); setIpArpCacheTimeoutIsCustom(false); }
                  else if (v === "custom") { setIpArpCacheTimeout(""); setIpArpCacheTimeoutIsCustom(true); }
                  else { setIpArpCacheTimeout(v); setIpArpCacheTimeoutIsCustom(false); }
                }}
              >
                <SelectTrigger id="edit-ipArpCacheTimeout"><SelectValue placeholder="Default (30s)" /></SelectTrigger>
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
              <Label htmlFor="edit-ipSourceValidation">Source Validation</Label>
              <Select value={ipSourceValidation || "none"} onValueChange={(v) => setIpSourceValidation(v === "none" ? "" : v)}>
                <SelectTrigger id="edit-ipSourceValidation"><SelectValue placeholder="None" /></SelectTrigger>
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
                { id: "edit-ipDisableArpFilter", checked: ipDisableArpFilter, onChange: setIpDisableArpFilter, label: "Disable ARP Filter" },
                { id: "edit-ipDisableForwarding", checked: ipDisableForwarding, onChange: setIpDisableForwarding, label: "Disable Forwarding" },
                { id: "edit-ipEnableArpAccept", checked: ipEnableArpAccept, onChange: setIpEnableArpAccept, label: "Enable ARP Accept" },
                { id: "edit-ipEnableArpAnnounce", checked: ipEnableArpAnnounce, onChange: setIpEnableArpAnnounce, label: "Enable ARP Announce" },
                { id: "edit-ipEnableArpIgnore", checked: ipEnableArpIgnore, onChange: setIpEnableArpIgnore, label: "Enable ARP Ignore" },
                { id: "edit-ipEnableDirectedBroadcast", checked: ipEnableDirectedBroadcast, onChange: setIpEnableDirectedBroadcast, label: "Enable Directed Broadcast" },
                { id: "edit-ipEnableProxyArp", checked: ipEnableProxyArp, onChange: setIpEnableProxyArp, label: "Enable Proxy ARP" },
                { id: "edit-ipProxyArpPvlan", checked: ipProxyArpPvlan, onChange: setIpProxyArpPvlan, label: "Private VLAN Proxy ARP" },
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
              <Label htmlFor="edit-ipv6AcceptDad">Accept DAD</Label>
              <Select value={ipv6AcceptDad || "default"} onValueChange={(v) => setIpv6AcceptDad(v === "default" ? "" : v)}>
                <SelectTrigger id="edit-ipv6AcceptDad"><SelectValue placeholder="Default" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="0">0 — Disabled</SelectItem>
                  <SelectItem value="1">1 — Enabled (default)</SelectItem>
                  <SelectItem value="2">2 — Enabled, disable IPv6 if MAC-based duplicate found</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-ipv6AdjustMss">Adjust TCP MSS (IPv6)</Label>
              <Select
                value={ipv6AdjustMssMode}
                onValueChange={(v) => {
                  if (v === "none") { setIpv6AdjustMss(""); setIpv6AdjustMssIsCustom(false); }
                  else if (v === "clamp") { setIpv6AdjustMss("clamp-mss-to-pmtu"); setIpv6AdjustMssIsCustom(false); }
                  else { setIpv6AdjustMss(""); setIpv6AdjustMssIsCustom(true); }
                }}
              >
                <SelectTrigger id="edit-ipv6AdjustMss"><SelectValue placeholder="None" /></SelectTrigger>
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
              <Label htmlFor="edit-ipv6BaseReachableTime">Base Reachable Time</Label>
              <Select
                value={ipv6BaseReachableTimeMode}
                onValueChange={(v) => {
                  if (v === "none") { setIpv6BaseReachableTime(""); setIpv6BaseReachableTimeIsCustom(false); }
                  else if (v === "custom") { setIpv6BaseReachableTime(""); setIpv6BaseReachableTimeIsCustom(true); }
                  else { setIpv6BaseReachableTime(v); setIpv6BaseReachableTimeIsCustom(false); }
                }}
              >
                <SelectTrigger id="edit-ipv6BaseReachableTime"><SelectValue placeholder="Default (30s)" /></SelectTrigger>
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
              <Label htmlFor="edit-ipv6DupAddrDetectTransmits">Duplicate Address Detect Transmits</Label>
              <Select
                value={dadTransmitsMode}
                onValueChange={(v) => {
                  if (v === "default") { setIpv6DupAddrDetectTransmits(""); setDadIsCustom(false); }
                  else if (v === "custom") { setIpv6DupAddrDetectTransmits(""); setDadIsCustom(true); }
                  else { setIpv6DupAddrDetectTransmits(v); setDadIsCustom(false); }
                }}
              >
                <SelectTrigger id="edit-ipv6DupAddrDetectTransmits"><SelectValue placeholder="Default" /></SelectTrigger>
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
              <Label htmlFor="edit-ipv6SourceValidation">Source Validation (IPv6)</Label>
              <Select value={ipv6SourceValidation || "none"} onValueChange={(v) => setIpv6SourceValidation(v === "none" ? "" : v)}>
                <SelectTrigger id="edit-ipv6SourceValidation"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="strict">Strict</SelectItem>
                  <SelectItem value="loose">Loose</SelectItem>
                  <SelectItem value="disable">Disable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="edit-ipv6DisableForwarding" checked={ipv6DisableForwarding} onCheckedChange={(c) => setIpv6DisableForwarding(c === true)} />
              <Label htmlFor="edit-ipv6DisableForwarding" className="font-normal">Disable IPv6 Forwarding</Label>
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            <h4 className="text-sm font-medium text-foreground">Traffic Mirroring &amp; Redirect</h4>
            <div className="space-y-2">
              <Label>Mirror Ingress →</Label>
              <InterfaceSelect
                value={mirrorIngress || "none"}
                onValueChange={(v) => setMirrorIngress(v === "none" ? "" : v)}
                interfaces={availableInterfaces}
                noneOption={{ label: "None", value: "none" }}
                placeholder="None"
              />
            </div>
            <div className="space-y-2">
              <Label>Mirror Egress →</Label>
              <InterfaceSelect
                value={mirrorEgress || "none"}
                onValueChange={(v) => setMirrorEgress(v === "none" ? "" : v)}
                interfaces={availableInterfaces}
                noneOption={{ label: "None", value: "none" }}
                placeholder="None"
              />
            </div>
            <div className="space-y-2">
              <Label>Redirect To</Label>
              <InterfaceSelect
                value={redirect || "none"}
                onValueChange={(v) => setRedirect(v === "none" ? "" : v)}
                interfaces={availableInterfaces}
                noneOption={{ label: "None", value: "none" }}
                placeholder="None"
              />
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
