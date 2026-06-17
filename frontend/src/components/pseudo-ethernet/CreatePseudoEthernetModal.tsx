"use client";

import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import { pseudoEthernetService, type PseudoEthernetCapabilities, type PseudoEthernetCreateConfig, type PseudoEthernetDhcpv6PdInterfaceInput } from "@/lib/api/pseudo-ethernet";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import type { EthernetInterface } from "@/lib/api/types/ethernet";
import { ApiError } from "@/lib/types/api";

const PETH_NAME_RE = /^peth[0-9]+$/;
const MAC_RE = /^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/;

const MODE_DESCRIPTIONS: Record<string, string> = {
  private: "Isolates VMs — no traffic between them even on same host",
  vepa: "All traffic goes through external switch (802.1Qbg VEPA mode)",
  bridge: "Direct communication allowed between VMs on same host",
  passthru: "Only one VM uses the interface — direct hardware access",
};

const SOURCE_VALIDATION_OPTIONS = [
  { value: "strict", label: "Strict" },
  { value: "loose", label: "Loose" },
  { value: "disable", label: "Disable" },
];

interface PdInstanceForm {
  instance: string;
  length: string;
  interfaces: PseudoEthernetDhcpv6PdInterfaceInput[];
}

interface CreatePseudoEthernetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  availableInterfaces: EthernetInterface[];
  capabilities: PseudoEthernetCapabilities | null;
  existingNames: string[];
}

export function CreatePseudoEthernetModal({
  open,
  onOpenChange,
  onSuccess,
  availableInterfaces,
  capabilities,
  existingNames,
}: CreatePseudoEthernetModalProps) {
  const feat = (key: string) => capabilities?.features?.[key]?.supported ?? false;

  // Basic
  const [name, setName] = useState("peth0");
  const [sourceInterface, setSourceInterface] = useState("");
  const [mode, setMode] = useState("private");
  const [description, setDescription] = useState("");
  const [mac, setMac] = useState("");
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");
  const [redirect, setRedirect] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [disableLinkDetect, setDisableLinkDetect] = useState(false);

  // Addresses
  const [addresses, setAddresses] = useState<string[]>([]);
  const [addressInput, setAddressInput] = useState("");

  // DHCP Options
  const [dhcpClientId, setDhcpClientId] = useState("");
  const [dhcpHostName, setDhcpHostName] = useState("");
  const [dhcpVendorClassId, setDhcpVendorClassId] = useState("");
  const [dhcpUserClass, setDhcpUserClass] = useState("");
  const [dhcpNoDefaultRoute, setDhcpNoDefaultRoute] = useState(false);
  const [dhcpDefaultRouteDistance, setDhcpDefaultRouteDistance] = useState("");
  const [dhcpReject, setDhcpReject] = useState<string[]>([]);
  const [dhcpRejectInput, setDhcpRejectInput] = useState("");
  const [dhcpMtu, setDhcpMtu] = useState(false);

  // IP settings
  const [ipAdjustMss, setIpAdjustMss] = useState("");
  const [ipAdjustMssClamp, setIpAdjustMssClamp] = useState(false);
  const [ipArpCacheTimeout, setIpArpCacheTimeout] = useState("");
  const [ipDisableArpFilter, setIpDisableArpFilter] = useState(false);
  const [ipEnableArpAccept, setIpEnableArpAccept] = useState(false);
  const [ipEnableArpAnnounce, setIpEnableArpAnnounce] = useState(false);
  const [ipEnableArpIgnore, setIpEnableArpIgnore] = useState(false);
  const [ipEnableDirectedBroadcast, setIpEnableDirectedBroadcast] = useState(false);
  const [ipEnableProxyArp, setIpEnableProxyArp] = useState(false);
  const [ipProxyArpPvlan, setIpProxyArpPvlan] = useState(false);
  const [ipDisableForwarding, setIpDisableForwarding] = useState(false);
  const [ipSourceValidation, setIpSourceValidation] = useState("");

  // IPv6 settings
  const [ipv6AcceptDad, setIpv6AcceptDad] = useState("");
  const [ipv6AdjustMss, setIpv6AdjustMss] = useState("");
  const [ipv6AdjustMssClamp, setIpv6AdjustMssClamp] = useState(false);
  const [ipv6BaseReachableTime, setIpv6BaseReachableTime] = useState("");
  const [ipv6DisableForwarding, setIpv6DisableForwarding] = useState(false);
  const [ipv6DupAddrDetect, setIpv6DupAddrDetect] = useState("");
  const [ipv6SourceValidation, setIpv6SourceValidation] = useState("");
  const [ipv6AddressAutoconf, setIpv6AddressAutoconf] = useState(false);
  const [ipv6Eui64, setIpv6Eui64] = useState<string[]>([]);
  const [ipv6Eui64Input, setIpv6Eui64Input] = useState("");
  const [ipv6NoDefaultLinkLocal, setIpv6NoDefaultLinkLocal] = useState(false);
  const [ipv6InterfaceIdentifier, setIpv6InterfaceIdentifier] = useState("");

  // DHCPv6
  const [dhcpv6Duid, setDhcpv6Duid] = useState("");
  const [dhcpv6NoRelease, setDhcpv6NoRelease] = useState(false);
  const [dhcpv6NoRequestDns, setDhcpv6NoRequestDns] = useState(false);
  const [dhcpv6NoRequestDomainName, setDhcpv6NoRequestDomainName] = useState(false);
  const [dhcpv6ParametersOnly, setDhcpv6ParametersOnly] = useState(false);
  const [dhcpv6RapidCommit, setDhcpv6RapidCommit] = useState(false);
  const [dhcpv6Temporary, setDhcpv6Temporary] = useState(false);
  const [pdInstances, setPdInstances] = useState<PdInstanceForm[]>([]);

  // Mirror
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");

  const [allInterfaces, setAllInterfaces] = useState<InterfaceName[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    showService.getAllInterfaces().then((r) => setAllInterfaces(r.interfaces)).catch(() => {});
    setName("peth0");
    setSourceInterface("");
    setMode("private");
    setDescription("");
    setMac("");
    setMtu("");
    setVrf("");
    setRedirect("");
    setDisabled(false);
    setDisableLinkDetect(false);
    setAddresses([]);
    setAddressInput("");
    setDhcpClientId(""); setDhcpHostName(""); setDhcpVendorClassId(""); setDhcpUserClass("");
    setDhcpNoDefaultRoute(false); setDhcpDefaultRouteDistance(""); setDhcpReject([]); setDhcpRejectInput(""); setDhcpMtu(false);
    setIpAdjustMss(""); setIpAdjustMssClamp(false); setIpArpCacheTimeout("");
    setIpDisableArpFilter(false); setIpEnableArpAccept(false); setIpEnableArpAnnounce(false);
    setIpEnableArpIgnore(false); setIpEnableDirectedBroadcast(false); setIpEnableProxyArp(false);
    setIpProxyArpPvlan(false); setIpDisableForwarding(false); setIpSourceValidation("");
    setIpv6AcceptDad(""); setIpv6AdjustMss(""); setIpv6AdjustMssClamp(false);
    setIpv6BaseReachableTime(""); setIpv6DisableForwarding(false); setIpv6DupAddrDetect("");
    setIpv6SourceValidation(""); setIpv6AddressAutoconf(false); setIpv6Eui64([]); setIpv6Eui64Input("");
    setIpv6NoDefaultLinkLocal(false); setIpv6InterfaceIdentifier("");
    setDhcpv6Duid(""); setDhcpv6NoRelease(false); setDhcpv6NoRequestDns(false);
    setDhcpv6NoRequestDomainName(false); setDhcpv6ParametersOnly(false);
    setDhcpv6RapidCommit(false); setDhcpv6Temporary(false); setPdInstances([]);
    setMirrorIngress(""); setMirrorEgress("");
    setError(null);
  }, [open]);

  const addAddress = () => {
    const v = addressInput.trim();
    if (v && !addresses.includes(v)) setAddresses((p) => [...p, v]);
    setAddressInput("");
  };

  const addDhcpReject = () => {
    const v = dhcpRejectInput.trim();
    if (v && !dhcpReject.includes(v)) setDhcpReject((p) => [...p, v]);
    setDhcpRejectInput("");
  };

  const addEui64 = () => {
    const v = ipv6Eui64Input.trim();
    if (v && !ipv6Eui64.includes(v)) setIpv6Eui64((p) => [...p, v]);
    setIpv6Eui64Input("");
  };

  const validate = (): string | null => {
    const n = name.trim();
    if (!n) return "Interface name is required.";
    if (!PETH_NAME_RE.test(n)) return "Interface name must match pattern 'pethN' (e.g. peth0).";
    if (existingNames.includes(n)) return `Interface '${n}' already exists.`;
    if (!sourceInterface) return "Source interface is required.";
    if (mac && !MAC_RE.test(mac)) return "MAC address must be in format xx:xx:xx:xx:xx:xx.";
    if (mtu) {
      const m = Number(mtu);
      if (!Number.isInteger(m) || m < 68 || m > 9000) return "MTU must be between 68 and 9000.";
    }
    return null;
  };

  const buildConfig = (): PseudoEthernetCreateConfig => {
    const hasDhcp = dhcpClientId || dhcpHostName || dhcpVendorClassId || dhcpUserClass ||
      dhcpNoDefaultRoute || dhcpDefaultRouteDistance || dhcpReject.length > 0 || dhcpMtu;

    const hasDhcpv6 = dhcpv6Duid || dhcpv6NoRelease || dhcpv6NoRequestDns ||
      dhcpv6NoRequestDomainName || dhcpv6ParametersOnly || dhcpv6RapidCommit ||
      dhcpv6Temporary || pdInstances.length > 0;

    const hasIp = ipAdjustMss || ipAdjustMssClamp || ipArpCacheTimeout ||
      ipDisableArpFilter || ipEnableArpAccept || ipEnableArpAnnounce || ipEnableArpIgnore ||
      ipEnableDirectedBroadcast || ipEnableProxyArp || ipProxyArpPvlan ||
      ipDisableForwarding || ipSourceValidation;

    const hasIpv6 = ipv6AcceptDad || ipv6AdjustMss || ipv6AdjustMssClamp ||
      ipv6BaseReachableTime || ipv6DisableForwarding || ipv6DupAddrDetect ||
      ipv6SourceValidation || ipv6AddressAutoconf || ipv6Eui64.length > 0 ||
      ipv6NoDefaultLinkLocal || ipv6InterfaceIdentifier;

    return {
      name: name.trim(),
      description: description.trim() || undefined,
      disabled,
      disable_link_detect: disableLinkDetect,
      source_interface: sourceInterface,
      mode: mode || undefined,
      mac: mac.trim() || undefined,
      mtu: mtu.trim() || undefined,
      vrf: vrf.trim() || undefined,
      redirect: redirect.trim() || undefined,
      addresses,
      dhcp_options: hasDhcp ? {
        client_id: dhcpClientId.trim() || undefined,
        host_name: dhcpHostName.trim() || undefined,
        vendor_class_id: dhcpVendorClassId.trim() || undefined,
        user_class: dhcpUserClass.trim() || undefined,
        no_default_route: dhcpNoDefaultRoute,
        default_route_distance: dhcpDefaultRouteDistance.trim() || undefined,
        reject: dhcpReject,
        mtu: dhcpMtu,
      } : undefined,
      dhcpv6_options: hasDhcpv6 ? {
        duid: dhcpv6Duid.trim() || undefined,
        no_release: dhcpv6NoRelease,
        no_request_dns: dhcpv6NoRequestDns,
        no_request_domain_name: dhcpv6NoRequestDomainName,
        parameters_only: dhcpv6ParametersOnly,
        rapid_commit: dhcpv6RapidCommit,
        temporary: dhcpv6Temporary,
        pd: pdInstances.map((p) => ({
          instance: p.instance.trim(),
          length: p.length.trim() || undefined,
          interfaces: p.interfaces.filter((i) => i.name?.trim()).map((i) => ({
            name: i.name!.trim(),
            address: i.address?.trim() || undefined,
            sla_id: i.sla_id?.trim() || undefined,
          })),
        })),
      } : undefined,
      ip: hasIp ? {
        adjust_mss: ipAdjustMssClamp ? undefined : (ipAdjustMss.trim() || undefined),
        adjust_mss_clamp_to_pmtu: ipAdjustMssClamp,
        arp_cache_timeout: ipArpCacheTimeout.trim() || undefined,
        disable_arp_filter: ipDisableArpFilter,
        enable_arp_accept: ipEnableArpAccept,
        enable_arp_announce: ipEnableArpAnnounce,
        enable_arp_ignore: ipEnableArpIgnore,
        enable_directed_broadcast: ipEnableDirectedBroadcast,
        enable_proxy_arp: ipEnableProxyArp,
        proxy_arp_pvlan: ipProxyArpPvlan,
        disable_forwarding: ipDisableForwarding,
        source_validation: ipSourceValidation || undefined,
      } : undefined,
      ipv6: hasIpv6 ? {
        accept_dad: ipv6AcceptDad.trim() || undefined,
        adjust_mss: ipv6AdjustMssClamp ? undefined : (ipv6AdjustMss.trim() || undefined),
        adjust_mss_clamp_to_pmtu: ipv6AdjustMssClamp,
        base_reachable_time: ipv6BaseReachableTime.trim() || undefined,
        disable_forwarding: ipv6DisableForwarding,
        dup_addr_detect_transmits: ipv6DupAddrDetect.trim() || undefined,
        source_validation: ipv6SourceValidation || undefined,
        address_autoconf: ipv6AddressAutoconf,
        address_eui64: ipv6Eui64,
        address_no_default_link_local: ipv6NoDefaultLinkLocal,
        address_interface_identifier: ipv6InterfaceIdentifier.trim() || undefined,
      } : undefined,
      mirror_ingress: mirrorIngress.trim() || undefined,
      mirror_egress: mirrorEgress.trim() || undefined,
    };
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await pseudoEthernetService.createInterface(buildConfig());
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Operation failed");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to create interface");
    } finally {
      setLoading(false);
    }
  };

  const hasDhcpAddress = addresses.some((a) => a === "dhcp" || a === "dhcpv6");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Pseudo-Ethernet Interface</DialogTitle>
          <DialogDescription>
            Configure a new MacVLAN pseudo-ethernet interface bound to a physical Ethernet port.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="ipv4">IPv4</TabsTrigger>
            <TabsTrigger value="ipv6">IPv6</TabsTrigger>
            <TabsTrigger value="mirror">Mirror</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Interface Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="peth0"
                />
                <p className="text-xs text-muted-foreground">Pattern: pethN</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sourceInterface">Source Interface *</Label>
                <InterfaceSelect
                  value={sourceInterface}
                  onValueChange={setSourceInterface}
                  id="sourceInterface"
                  interfaces={availableInterfaces.map((i) => ({ name: i.name, type: i.type, description: i.description ?? null }))}
                  placeholder="Select ethernet interface"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mode">Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger id="mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(capabilities?.mode_values ?? ["private", "vepa", "bridge", "passthru"]).map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mode && MODE_DESCRIPTIONS[mode] && (
                <p className="text-xs text-muted-foreground">{MODE_DESCRIPTIONS[mode]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mac">MAC Address</Label>
                <Input
                  id="mac"
                  value={mac}
                  onChange={(e) => setMac(e.target.value)}
                  placeholder="xx:xx:xx:xx:xx:xx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mtu">MTU</Label>
                <Input
                  id="mtu"
                  type="number"
                  value={mtu}
                  onChange={(e) => setMtu(e.target.value)}
                  placeholder="68–9000"
                  min={68}
                  max={9000}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vrf">VRF</Label>
                <VrfSelect
                  id="vrf"
                  value={vrf}
                  onValueChange={setVrf}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="redirect">Redirect</Label>
                <VrfSelect
                  id="redirect"
                  value={redirect}
                  onValueChange={setRedirect}
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox id="disabled" checked={disabled} onCheckedChange={(c) => setDisabled(!!c)} />
                <Label htmlFor="disabled">Disabled</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="disableLinkDetect" checked={disableLinkDetect} onCheckedChange={(c) => setDisableLinkDetect(!!c)} />
                <Label htmlFor="disableLinkDetect">Disable Link Detect</Label>
              </div>
            </div>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>IP Addresses</Label>
              <div className="flex gap-2">
                <Input
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAddress())}
                  placeholder="192.0.2.1/24 or dhcp or dhcpv6"
                />
                <Button type="button" variant="outline" size="sm" onClick={addAddress}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {addresses.map((addr) => (
                  <Badge key={addr} variant="secondary" className="gap-1 pr-1">
                    {addr}
                    <button onClick={() => setAddresses((p) => p.filter((a) => a !== addr))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {(hasDhcpAddress || dhcpClientId || dhcpHostName || dhcpVendorClassId || dhcpUserClass || dhcpNoDefaultRoute || dhcpReject.length > 0 || dhcpMtu) && (
              <>
                <Separator />
                <p className="text-sm font-medium">DHCP Options</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Client ID</Label>
                    <Input value={dhcpClientId} onChange={(e) => setDhcpClientId(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hostname</Label>
                    <Input value={dhcpHostName} onChange={(e) => setDhcpHostName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Vendor Class ID</Label>
                    <Input value={dhcpVendorClassId} onChange={(e) => setDhcpVendorClassId(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>User Class</Label>
                    <Input value={dhcpUserClass} onChange={(e) => setDhcpUserClass(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={dhcpNoDefaultRoute} onCheckedChange={(c) => setDhcpNoDefaultRoute(!!c)} id="dhcpNoDef" />
                    <Label htmlFor="dhcpNoDef">No Default Route</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Route Distance</Label>
                    <Input type="number" value={dhcpDefaultRouteDistance} onChange={(e) => setDhcpDefaultRouteDistance(e.target.value)} min={1} max={255} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={dhcpMtu} onCheckedChange={(c) => setDhcpMtu(!!c)} id="dhcpMtu" />
                  <Label htmlFor="dhcpMtu">Request MTU from DHCP</Label>
                </div>
                <div className="space-y-2">
                  <Label>Reject Servers</Label>
                  <div className="flex gap-2">
                    <Input
                      value={dhcpRejectInput}
                      onChange={(e) => setDhcpRejectInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDhcpReject())}
                      placeholder="Server IP to reject"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addDhcpReject}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {dhcpReject.map((s) => (
                      <Badge key={s} variant="secondary" className="gap-1 pr-1">
                        {s}
                        <button onClick={() => setDhcpReject((p) => p.filter((x) => x !== s))}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
            {!hasDhcpAddress && (
              <p className="text-xs text-muted-foreground">
                Add &apos;dhcp&apos; or &apos;dhcpv6&apos; as an address to see DHCP options, or click below to expand.
              </p>
            )}
            {!hasDhcpAddress && !dhcpClientId && (
              <Button type="button" variant="outline" size="sm" onClick={() => setDhcpClientId(" ")}>
                Expand DHCP Options
              </Button>
            )}
          </TabsContent>

          {/* IPv4 Tab */}
          <TabsContent value="ipv4" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Adjust MSS</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={!ipAdjustMssClamp && !ipAdjustMss} onChange={() => { setIpAdjustMssClamp(false); setIpAdjustMss(""); }} />
                  Disabled
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={ipAdjustMssClamp} onChange={() => { setIpAdjustMssClamp(true); setIpAdjustMss(""); }} />
                  Clamp to PMTU
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={!ipAdjustMssClamp && !!ipAdjustMss} onChange={() => { setIpAdjustMssClamp(false); }} />
                  Manual value
                </label>
              </div>
              {!ipAdjustMssClamp && (
                <Input
                  value={ipAdjustMss}
                  onChange={(e) => setIpAdjustMss(e.target.value)}
                  placeholder="MSS value in bytes"
                  disabled={ipAdjustMssClamp}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>ARP Cache Timeout (ms)</Label>
              <Input type="number" value={ipArpCacheTimeout} onChange={(e) => setIpArpCacheTimeout(e.target.value)} placeholder="Milliseconds" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                [ipDisableArpFilter, setIpDisableArpFilter, "Disable ARP Filter"],
                [ipEnableArpAccept, setIpEnableArpAccept, "Enable ARP Accept"],
                [ipEnableArpAnnounce, setIpEnableArpAnnounce, "Enable ARP Announce"],
                [ipEnableArpIgnore, setIpEnableArpIgnore, "Enable ARP Ignore"],
                [ipEnableDirectedBroadcast, setIpEnableDirectedBroadcast, "Enable Directed Broadcast"],
                [ipEnableProxyArp, setIpEnableProxyArp, "Enable Proxy ARP"],
                [ipProxyArpPvlan, setIpProxyArpPvlan, "Proxy ARP PVLAN"],
                [ipDisableForwarding, setIpDisableForwarding, "Disable Forwarding"],
              ].map(([val, setter, label]) => (
                <div key={label as string} className="flex items-center gap-2">
                  <Checkbox
                    checked={val as boolean}
                    onCheckedChange={(c) => (setter as (v: boolean) => void)(!!c)}
                    id={`ip-${label}`}
                  />
                  <Label htmlFor={`ip-${label}`} className="text-sm font-normal">{label as string}</Label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Source Validation</Label>
              <Select value={ipSourceValidation || "none"} onValueChange={(v) => setIpSourceValidation(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {SOURCE_VALIDATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* IPv6 + DHCPv6 Tab */}
          <TabsContent value="ipv6" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Accept DAD (0–3)</Label>
                <Input type="number" min={0} max={3} value={ipv6AcceptDad} onChange={(e) => setIpv6AcceptDad(e.target.value)} placeholder="0–3" />
              </div>
              <div className="space-y-2">
                <Label>Base Reachable Time</Label>
                <Input type="number" value={ipv6BaseReachableTime} onChange={(e) => setIpv6BaseReachableTime(e.target.value)} placeholder="ms" />
              </div>
              <div className="space-y-2">
                <Label>Dup Addr Detect Transmits</Label>
                <Input type="number" value={ipv6DupAddrDetect} onChange={(e) => setIpv6DupAddrDetect(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>IPv6 Source Validation</Label>
                <Select value={ipv6SourceValidation || "none"} onValueChange={(v) => setIpv6SourceValidation(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {SOURCE_VALIDATION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Adjust MSS (IPv6)</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={!ipv6AdjustMssClamp && !ipv6AdjustMss} onChange={() => { setIpv6AdjustMssClamp(false); setIpv6AdjustMss(""); }} />
                  Disabled
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={ipv6AdjustMssClamp} onChange={() => { setIpv6AdjustMssClamp(true); setIpv6AdjustMss(""); }} />
                  Clamp to PMTU
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={!ipv6AdjustMssClamp && !!ipv6AdjustMss} onChange={() => setIpv6AdjustMssClamp(false)} />
                  Manual value
                </label>
              </div>
              {!ipv6AdjustMssClamp && (
                <Input value={ipv6AdjustMss} onChange={(e) => setIpv6AdjustMss(e.target.value)} placeholder="MSS value in bytes" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                [ipv6DisableForwarding, setIpv6DisableForwarding, "Disable Forwarding"],
                [ipv6AddressAutoconf, setIpv6AddressAutoconf, "Address Autoconf (SLAAC)"],
                [ipv6NoDefaultLinkLocal, setIpv6NoDefaultLinkLocal, "No Default Link Local"],
              ].map(([val, setter, label]) => (
                <div key={label as string} className="flex items-center gap-2">
                  <Checkbox checked={val as boolean} onCheckedChange={(c) => (setter as (v: boolean) => void)(!!c)} id={`ipv6-${label}`} />
                  <Label htmlFor={`ipv6-${label}`} className="text-sm font-normal">{label as string}</Label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>EUI64 Prefixes</Label>
              <div className="flex gap-2">
                <Input
                  value={ipv6Eui64Input}
                  onChange={(e) => setIpv6Eui64Input(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEui64())}
                  placeholder="IPv6 prefix (e.g. 2001:db8::/64)"
                />
                <Button type="button" variant="outline" size="sm" onClick={addEui64}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {ipv6Eui64.map((p) => (
                  <Badge key={p} variant="secondary" className="gap-1 pr-1">
                    {p}
                    <button onClick={() => setIpv6Eui64((prev) => prev.filter((x) => x !== p))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {feat("ipv6_address_interface_identifier") && (
              <div className="space-y-2">
                <Label>Interface Identifier</Label>
                <Input
                  value={ipv6InterfaceIdentifier}
                  onChange={(e) => setIpv6InterfaceIdentifier(e.target.value)}
                  placeholder="SLAAC interface identifier"
                />
              </div>
            )}

            <Separator />
            <p className="text-sm font-medium">DHCPv6 Options</p>

            <div className="space-y-2">
              <Label>DUID</Label>
              <Input value={dhcpv6Duid} onChange={(e) => setDhcpv6Duid(e.target.value)} placeholder="DHCPv6 unique identifier" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {([
                [dhcpv6NoRelease, setDhcpv6NoRelease, "No Release"],
                [dhcpv6ParametersOnly, setDhcpv6ParametersOnly, "Parameters Only"],
                [dhcpv6RapidCommit, setDhcpv6RapidCommit, "Rapid Commit"],
                [dhcpv6Temporary, setDhcpv6Temporary, "Temporary"],
              ] as const).map(([val, setter, label]) => (
                <div key={label} className="flex items-center gap-2">
                  <Checkbox checked={val} onCheckedChange={(c) => setter(!!c)} id={`dhcpv6-${label}`} />
                  <Label htmlFor={`dhcpv6-${label}`} className="text-sm font-normal">{label}</Label>
                </div>
              ))}
              {feat("dhcpv6_no_request_dns") && (
                <div className="flex items-center gap-2">
                  <Checkbox checked={dhcpv6NoRequestDns} onCheckedChange={(c) => setDhcpv6NoRequestDns(!!c)} id="dhcpv6NoDns" />
                  <Label htmlFor="dhcpv6NoDns" className="text-sm font-normal">No Request DNS</Label>
                </div>
              )}
              {feat("dhcpv6_no_request_domain_name") && (
                <div className="flex items-center gap-2">
                  <Checkbox checked={dhcpv6NoRequestDomainName} onCheckedChange={(c) => setDhcpv6NoRequestDomainName(!!c)} id="dhcpv6NoDomain" />
                  <Label htmlFor="dhcpv6NoDomain" className="text-sm font-normal">No Request Domain Name</Label>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>PD Instances</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setPdInstances((p) => [...p, { instance: String(p.length + 1), length: "", interfaces: [] }])}>
                  <Plus className="h-4 w-4 mr-1" /> Add PD
                </Button>
              </div>
              {pdInstances.map((pd, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">PD Instance {pd.instance}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPdInstances((p) => p.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Instance ID</Label>
                      <Input
                        value={pd.instance}
                        onChange={(e) => setPdInstances((p) => p.map((r, j) => j === i ? { ...r, instance: e.target.value } : r))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Length (32–64)</Label>
                      <Input
                        type="number"
                        min={32}
                        max={64}
                        value={pd.length}
                        onChange={(e) => setPdInstances((p) => p.map((r, j) => j === i ? { ...r, length: e.target.value } : r))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Delegated Interfaces</Label>
                      <Button type="button" variant="outline" size="sm" className="h-6 text-xs" onClick={() => setPdInstances((p) => p.map((r, j) => j === i ? { ...r, interfaces: [...r.interfaces, { name: "", address: "", sla_id: "" }] } : r))}>
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                    </div>
                    {pd.interfaces.map((di, k) => (
                      <div key={k} className="flex gap-2 items-center">
                        <Input className="flex-1" placeholder="Interface" value={di.name ?? ""} onChange={(e) => setPdInstances((p) => p.map((r, j) => j === i ? { ...r, interfaces: r.interfaces.map((x, l) => l === k ? { ...x, name: e.target.value } : x) } : r))} />
                        <Input className="flex-1" placeholder="Address" value={di.address ?? ""} onChange={(e) => setPdInstances((p) => p.map((r, j) => j === i ? { ...r, interfaces: r.interfaces.map((x, l) => l === k ? { ...x, address: e.target.value } : x) } : r))} />
                        <Input className="w-20" placeholder="SLA ID" value={di.sla_id ?? ""} onChange={(e) => setPdInstances((p) => p.map((r, j) => j === i ? { ...r, interfaces: r.interfaces.map((x, l) => l === k ? { ...x, sla_id: e.target.value } : x) } : r))} />
                        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setPdInstances((p) => p.map((r, j) => j === i ? { ...r, interfaces: r.interfaces.filter((_, l) => l !== k) } : r))}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Mirror Tab */}
          <TabsContent value="mirror" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Mirror Ingress</Label>
              <InterfaceSelect
                value={mirrorIngress || "__none__"}
                onValueChange={(v) => setMirrorIngress(v === "__none__" ? "" : v)}
                interfaces={allInterfaces}
                noneOption={{ label: "None", value: "__none__" }}
                placeholder="Select destination interface"
              />
            </div>
            <div className="space-y-2">
              <Label>Mirror Egress</Label>
              <InterfaceSelect
                value={mirrorEgress || "__none__"}
                onValueChange={(v) => setMirrorEgress(v === "__none__" ? "" : v)}
                interfaces={allInterfaces}
                noneOption={{ label: "None", value: "__none__" }}
                placeholder="Select destination interface"
              />
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <pre className="text-sm text-destructive whitespace-pre-wrap flex-1">{error}</pre>
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
