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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, ChevronDown, ChevronRight, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  virtualEthernetService,
  type VirtualEthernetCapabilities,
  type VirtualEthernetCreateConfig,
  type VirtualEthernetInterface,
  type VirtualEthernetVifInput,
  type VirtualEthernetVifSInput,
  type VirtualEthernetVifCInput,
} from "@/lib/api/virtual-ethernet";
import { ApiError } from "@/lib/types/api";

const SOURCE_VALIDATION_OPTIONS = [
  { value: "strict", label: "Strict" },
  { value: "loose", label: "Loose" },
  { value: "disable", label: "Disable" },
];

interface EditVirtualEthernetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: VirtualEthernetInterface | null;
  capabilities: VirtualEthernetCapabilities | null;
}

// ── VIF form state ────────────────────────────────────────────────────────────

interface VifFormState {
  vlan_id: string;
  description: string;
  disabled: boolean;
  disable_link_detect: boolean;
  addresses: string[];
  addressInput: string;
  mtu: string;
  mac: string;
  vrf: string;
  redirect: string;
  egress_qos: string;
  ingress_qos: string;
  mirror_ingress: string;
  mirror_egress: string;
  // DHCP
  dhcpClientId: string;
  dhcpHostName: string;
  dhcpVendorClassId: string;
  dhcpUserClass: string;
  dhcpNoDefaultRoute: boolean;
  dhcpDefaultRouteDistance: string;
  dhcpReject: string[];
  dhcpRejectInput: string;
  dhcpMtu: boolean;
  // DHCPv6
  dhcpv6Duid: string;
  dhcpv6NoRelease: boolean;
  dhcpv6NoRequestDns: boolean;
  dhcpv6NoRequestDomainName: boolean;
  dhcpv6ParametersOnly: boolean;
  dhcpv6RapidCommit: boolean;
  dhcpv6Temporary: boolean;
  // IP
  ipAdjustMss: string;
  ipAdjustMssClamp: boolean;
  ipArpCacheTimeout: string;
  ipDisableArpFilter: boolean;
  ipEnableArpAccept: boolean;
  ipEnableArpAnnounce: boolean;
  ipEnableArpIgnore: boolean;
  ipEnableDirectedBroadcast: boolean;
  ipEnableProxyArp: boolean;
  ipProxyArpPvlan: boolean;
  ipDisableForwarding: boolean;
  ipSourceValidation: string;
  // IPv6
  ipv6AcceptDad: string;
  ipv6AdjustMss: string;
  ipv6AdjustMssClamp: boolean;
  ipv6BaseReachableTime: string;
  ipv6DisableForwarding: boolean;
  ipv6DupAddrDetect: string;
  ipv6SourceValidation: string;
  ipv6AddressAutoconf: boolean;
  ipv6Eui64: string[];
  ipv6Eui64Input: string;
  ipv6NoDefaultLinkLocal: boolean;
  ipv6InterfaceIdentifier: string;
  // Section toggles
  showDhcp: boolean;
  showDhcpv6: boolean;
  showIp: boolean;
  showIpv6: boolean;
}

function emptyVif(): VifFormState {
  return {
    vlan_id: "", description: "", disabled: false, disable_link_detect: false,
    addresses: [], addressInput: "", mtu: "", mac: "", vrf: "", redirect: "",
    egress_qos: "", ingress_qos: "", mirror_ingress: "", mirror_egress: "",
    dhcpClientId: "", dhcpHostName: "", dhcpVendorClassId: "", dhcpUserClass: "",
    dhcpNoDefaultRoute: false, dhcpDefaultRouteDistance: "", dhcpReject: [],
    dhcpRejectInput: "", dhcpMtu: false,
    dhcpv6Duid: "", dhcpv6NoRelease: false, dhcpv6NoRequestDns: false,
    dhcpv6NoRequestDomainName: false, dhcpv6ParametersOnly: false,
    dhcpv6RapidCommit: false, dhcpv6Temporary: false,
    ipAdjustMss: "", ipAdjustMssClamp: false, ipArpCacheTimeout: "",
    ipDisableArpFilter: false, ipEnableArpAccept: false, ipEnableArpAnnounce: false,
    ipEnableArpIgnore: false, ipEnableDirectedBroadcast: false, ipEnableProxyArp: false,
    ipProxyArpPvlan: false, ipDisableForwarding: false, ipSourceValidation: "",
    ipv6AcceptDad: "", ipv6AdjustMss: "", ipv6AdjustMssClamp: false,
    ipv6BaseReachableTime: "", ipv6DisableForwarding: false, ipv6DupAddrDetect: "",
    ipv6SourceValidation: "", ipv6AddressAutoconf: false, ipv6Eui64: [],
    ipv6Eui64Input: "", ipv6NoDefaultLinkLocal: false, ipv6InterfaceIdentifier: "",
    showDhcp: false, showDhcpv6: false, showIp: false, showIpv6: false,
  };
}

function vifFormToInput(f: VifFormState): VirtualEthernetVifInput {
  const hasDhcp = f.dhcpClientId || f.dhcpHostName || f.dhcpVendorClassId || f.dhcpUserClass ||
    f.dhcpNoDefaultRoute || f.dhcpDefaultRouteDistance || f.dhcpReject.length > 0 || f.dhcpMtu;
  const hasDhcpv6 = f.dhcpv6Duid || f.dhcpv6NoRelease || f.dhcpv6NoRequestDns ||
    f.dhcpv6NoRequestDomainName || f.dhcpv6ParametersOnly || f.dhcpv6RapidCommit || f.dhcpv6Temporary;
  const hasIp = f.ipAdjustMss || f.ipAdjustMssClamp || f.ipArpCacheTimeout ||
    f.ipDisableArpFilter || f.ipEnableArpAccept || f.ipEnableArpAnnounce || f.ipEnableArpIgnore ||
    f.ipEnableDirectedBroadcast || f.ipEnableProxyArp || f.ipProxyArpPvlan ||
    f.ipDisableForwarding || f.ipSourceValidation;
  const hasIpv6 = f.ipv6AcceptDad || f.ipv6AdjustMss || f.ipv6AdjustMssClamp ||
    f.ipv6BaseReachableTime || f.ipv6DisableForwarding || f.ipv6DupAddrDetect ||
    f.ipv6SourceValidation || f.ipv6AddressAutoconf || f.ipv6Eui64.length > 0 ||
    f.ipv6NoDefaultLinkLocal || f.ipv6InterfaceIdentifier;
  return {
    vlan_id: f.vlan_id,
    description: f.description || undefined,
    disabled: f.disabled,
    disable_link_detect: f.disable_link_detect,
    addresses: f.addresses,
    mtu: f.mtu || undefined,
    mac: f.mac || undefined,
    vrf: f.vrf || undefined,
    redirect: f.redirect || undefined,
    egress_qos: f.egress_qos || undefined,
    ingress_qos: f.ingress_qos || undefined,
    mirror_ingress: f.mirror_ingress || undefined,
    mirror_egress: f.mirror_egress || undefined,
    dhcp_options: hasDhcp ? {
      client_id: f.dhcpClientId || undefined, host_name: f.dhcpHostName || undefined,
      vendor_class_id: f.dhcpVendorClassId || undefined, user_class: f.dhcpUserClass || undefined,
      no_default_route: f.dhcpNoDefaultRoute,
      default_route_distance: f.dhcpDefaultRouteDistance || undefined,
      reject: f.dhcpReject, mtu: f.dhcpMtu,
    } : undefined,
    dhcpv6_options: hasDhcpv6 ? {
      duid: f.dhcpv6Duid || undefined, no_release: f.dhcpv6NoRelease,
      no_request_dns: f.dhcpv6NoRequestDns, no_request_domain_name: f.dhcpv6NoRequestDomainName,
      parameters_only: f.dhcpv6ParametersOnly, rapid_commit: f.dhcpv6RapidCommit,
      temporary: f.dhcpv6Temporary,
    } : undefined,
    ip: hasIp ? {
      adjust_mss: f.ipAdjustMssClamp ? undefined : (f.ipAdjustMss || undefined),
      adjust_mss_clamp_to_pmtu: f.ipAdjustMssClamp,
      arp_cache_timeout: f.ipArpCacheTimeout || undefined,
      disable_arp_filter: f.ipDisableArpFilter, enable_arp_accept: f.ipEnableArpAccept,
      enable_arp_announce: f.ipEnableArpAnnounce, enable_arp_ignore: f.ipEnableArpIgnore,
      enable_directed_broadcast: f.ipEnableDirectedBroadcast, enable_proxy_arp: f.ipEnableProxyArp,
      proxy_arp_pvlan: f.ipProxyArpPvlan, disable_forwarding: f.ipDisableForwarding,
      source_validation: f.ipSourceValidation || undefined,
    } : undefined,
    ipv6: hasIpv6 ? {
      accept_dad: f.ipv6AcceptDad || undefined,
      adjust_mss: f.ipv6AdjustMssClamp ? undefined : (f.ipv6AdjustMss || undefined),
      adjust_mss_clamp_to_pmtu: f.ipv6AdjustMssClamp,
      base_reachable_time: f.ipv6BaseReachableTime || undefined,
      disable_forwarding: f.ipv6DisableForwarding,
      dup_addr_detect_transmits: f.ipv6DupAddrDetect || undefined,
      source_validation: f.ipv6SourceValidation || undefined,
      address_autoconf: f.ipv6AddressAutoconf, address_eui64: f.ipv6Eui64,
      address_no_default_link_local: f.ipv6NoDefaultLinkLocal,
      address_interface_identifier: f.ipv6InterfaceIdentifier || undefined,
    } : undefined,
  };
}

// ── VIF-S form state ──────────────────────────────────────────────────────────

interface VifSFormState extends Omit<VifFormState, "egress_qos" | "ingress_qos"> {
  protocol: string;
  vif_c: VifCFormState[];
}

interface VifCFormState {
  vlan_id: string;
  description: string;
  disabled: boolean;
  disable_link_detect: boolean;
  addresses: string[];
  addressInput: string;
  mtu: string;
  mac: string;
  vrf: string;
  redirect: string;
  mirror_ingress: string;
  mirror_egress: string;
}

function emptyVifS(): VifSFormState {
  const base = emptyVif();
  return { ...base, protocol: "", vif_c: [] };
}

function emptyVifC(): VifCFormState {
  return { vlan_id: "", description: "", disabled: false, disable_link_detect: false, addresses: [], addressInput: "", mtu: "", mac: "", vrf: "", redirect: "", mirror_ingress: "", mirror_egress: "" };
}

function vifSFormToInput(f: VifSFormState): VirtualEthernetVifSInput {
  const base = vifFormToInput({ ...f, egress_qos: "", ingress_qos: "" });
  return {
    ...base,
    protocol: f.protocol || undefined,
    vif_c: f.vif_c.map(vifCFormToInput),
  };
}

function vifCFormToInput(f: VifCFormState): VirtualEthernetVifCInput {
  return {
    vlan_id: f.vlan_id,
    description: f.description || undefined,
    disabled: f.disabled,
    disable_link_detect: f.disable_link_detect,
    addresses: f.addresses,
    mtu: f.mtu || undefined,
    mac: f.mac || undefined,
    vrf: f.vrf || undefined,
    redirect: f.redirect || undefined,
    mirror_ingress: f.mirror_ingress || undefined,
    mirror_egress: f.mirror_egress || undefined,
  };
}

// ── VIF inline form component ────────────────────────────────────────────────

type VifFormLike = Omit<VifFormState, "egress_qos" | "ingress_qos"> & { egress_qos?: string; ingress_qos?: string; protocol?: string };

function VifForm({
  form,
  onChange,
  capabilities,
  showQos = false,
  showProtocol = false,
}: {
  form: VifFormLike;
  onChange: (patch: Partial<VifFormLike>) => void;
  capabilities: VirtualEthernetCapabilities | null;
  showQos?: boolean;
  showProtocol?: boolean;
}) {
  const feat = (key: string) => capabilities?.features?.[key]?.supported ?? false;

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">VLAN ID (1–4094) *</Label>
          <Input type="number" min={1} max={4094} value={form.vlan_id} onChange={(e) => onChange({ vlan_id: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Description</Label>
          <Input value={form.description} onChange={(e) => onChange({ description: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">MTU</Label>
          <Input type="number" value={form.mtu} onChange={(e) => onChange({ mtu: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">MAC</Label>
          <Input value={form.mac} onChange={(e) => onChange({ mac: e.target.value })} placeholder="xx:xx:xx:xx:xx:xx" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">VRF</Label>
          <Input value={form.vrf} onChange={(e) => onChange({ vrf: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Redirect</Label>
          <Input value={form.redirect} onChange={(e) => onChange({ redirect: e.target.value })} />
        </div>
        {showQos && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Egress QoS</Label>
              <Input value={form.egress_qos} onChange={(e) => onChange({ egress_qos: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ingress QoS</Label>
              <Input value={form.ingress_qos} onChange={(e) => onChange({ ingress_qos: e.target.value })} />
            </div>
          </>
        )}
        {showProtocol && (
          <div className="space-y-1">
            <Label className="text-xs">Protocol</Label>
            <Select value={form.protocol || "__none__"} onValueChange={(v) => onChange({ protocol: v === "__none__" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Default</SelectItem>
                <SelectItem value="802.1ad">802.1ad</SelectItem>
                <SelectItem value="802.1q">802.1q</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs">Mirror Ingress</Label>
          <Input value={form.mirror_ingress} onChange={(e) => onChange({ mirror_ingress: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Mirror Egress</Label>
          <Input value={form.mirror_egress} onChange={(e) => onChange({ mirror_egress: e.target.value })} />
        </div>
      </div>

      {/* Addresses */}
      <div className="space-y-1">
        <Label className="text-xs">Addresses</Label>
        <div className="flex gap-2">
          <Input
            value={form.addressInput}
            onChange={(e) => onChange({ addressInput: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const v = form.addressInput.trim();
                if (v && !form.addresses.includes(v)) onChange({ addresses: [...form.addresses, v], addressInput: "" });
                else onChange({ addressInput: "" });
              }
            }}
            placeholder="192.0.2.1/24"
          />
          <Button type="button" variant="outline" size="sm" onClick={() => {
            const v = form.addressInput.trim();
            if (v && !form.addresses.includes(v)) onChange({ addresses: [...form.addresses, v], addressInput: "" });
          }}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {form.addresses.map((a) => (
            <Badge key={a} variant="secondary" className="gap-1 pr-1">
              {a}
              <button onClick={() => onChange({ addresses: form.addresses.filter((x) => x !== a) })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox checked={form.disabled} onCheckedChange={(c) => onChange({ disabled: !!c })} id={`vif-disabled-${form.vlan_id}`} />
          <Label htmlFor={`vif-disabled-${form.vlan_id}`} className="text-xs font-normal">Disabled</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox checked={form.disable_link_detect} onCheckedChange={(c) => onChange({ disable_link_detect: !!c })} id={`vif-ld-${form.vlan_id}`} />
          <Label htmlFor={`vif-ld-${form.vlan_id}`} className="text-xs font-normal">Disable Link Detect</Label>
        </div>
      </div>

      {/* DHCP collapsible */}
      <div>
        <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => onChange({ showDhcp: !form.showDhcp })}>
          {form.showDhcp ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          DHCP Options
        </button>
        {form.showDhcp && (
          <div className="mt-2 space-y-2 pl-3 border-l">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label className="text-xs">Client ID</Label><Input value={form.dhcpClientId} onChange={(e) => onChange({ dhcpClientId: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Hostname</Label><Input value={form.dhcpHostName} onChange={(e) => onChange({ dhcpHostName: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Vendor Class ID</Label><Input value={form.dhcpVendorClassId} onChange={(e) => onChange({ dhcpVendorClassId: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">User Class</Label><Input value={form.dhcpUserClass} onChange={(e) => onChange({ dhcpUserClass: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Default Route Distance</Label><Input type="number" value={form.dhcpDefaultRouteDistance} onChange={(e) => onChange({ dhcpDefaultRouteDistance: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1"><Checkbox checked={form.dhcpNoDefaultRoute} onCheckedChange={(c) => onChange({ dhcpNoDefaultRoute: !!c })} id={`dhcp-ndr-${form.vlan_id}`} /><Label htmlFor={`dhcp-ndr-${form.vlan_id}`} className="text-xs font-normal">No Default Route</Label></div>
              <div className="flex items-center gap-1"><Checkbox checked={form.dhcpMtu} onCheckedChange={(c) => onChange({ dhcpMtu: !!c })} id={`dhcp-mtu-${form.vlan_id}`} /><Label htmlFor={`dhcp-mtu-${form.vlan_id}`} className="text-xs font-normal">MTU</Label></div>
            </div>
            <div className="flex gap-2">
              <Input className="flex-1" placeholder="Reject server IP" value={form.dhcpRejectInput} onChange={(e) => onChange({ dhcpRejectInput: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = form.dhcpRejectInput.trim(); if (v && !form.dhcpReject.includes(v)) onChange({ dhcpReject: [...form.dhcpReject, v], dhcpRejectInput: "" }); else onChange({ dhcpRejectInput: "" }); } }} />
              <Button type="button" variant="outline" size="sm" onClick={() => { const v = form.dhcpRejectInput.trim(); if (v && !form.dhcpReject.includes(v)) onChange({ dhcpReject: [...form.dhcpReject, v], dhcpRejectInput: "" }); }}><Plus className="h-3 w-3" /></Button>
            </div>
            <div className="flex flex-wrap gap-1">{form.dhcpReject.map((s) => <Badge key={s} variant="secondary" className="gap-1 pr-1 text-xs">{s}<button onClick={() => onChange({ dhcpReject: form.dhcpReject.filter((x) => x !== s) })}><X className="h-3 w-3" /></button></Badge>)}</div>
          </div>
        )}
      </div>

      {/* DHCPv6 collapsible */}
      <div>
        <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => onChange({ showDhcpv6: !form.showDhcpv6 })}>
          {form.showDhcpv6 ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          DHCPv6 Options
        </button>
        {form.showDhcpv6 && (
          <div className="mt-2 space-y-2 pl-3 border-l">
            <div className="space-y-1"><Label className="text-xs">DUID</Label><Input value={form.dhcpv6Duid} onChange={(e) => onChange({ dhcpv6Duid: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              {([["dhcpv6NoRelease", "No Release"], ["dhcpv6ParametersOnly", "Parameters Only"], ["dhcpv6RapidCommit", "Rapid Commit"], ["dhcpv6Temporary", "Temporary"]] as const).map(([k, label]) => (
                <div key={k} className="flex items-center gap-1"><Checkbox checked={form[k]} onCheckedChange={(c) => onChange({ [k]: !!c })} id={`${k}-${form.vlan_id}`} /><Label htmlFor={`${k}-${form.vlan_id}`} className="text-xs font-normal">{label}</Label></div>
              ))}
              {feat("dhcpv6_no_request_dns") && <div className="flex items-center gap-1"><Checkbox checked={form.dhcpv6NoRequestDns} onCheckedChange={(c) => onChange({ dhcpv6NoRequestDns: !!c })} id={`dns-${form.vlan_id}`} /><Label htmlFor={`dns-${form.vlan_id}`} className="text-xs font-normal">No Request DNS</Label></div>}
              {feat("dhcpv6_no_request_domain_name") && <div className="flex items-center gap-1"><Checkbox checked={form.dhcpv6NoRequestDomainName} onCheckedChange={(c) => onChange({ dhcpv6NoRequestDomainName: !!c })} id={`dom-${form.vlan_id}`} /><Label htmlFor={`dom-${form.vlan_id}`} className="text-xs font-normal">No Request Domain</Label></div>}
            </div>
          </div>
        )}
      </div>

      {/* IP Settings collapsible */}
      <div>
        <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => onChange({ showIp: !form.showIp })}>
          {form.showIp ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          IP Settings
        </button>
        {form.showIp && (
          <div className="mt-2 space-y-2 pl-3 border-l">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label className="text-xs">ARP Cache Timeout</Label><Input type="number" value={form.ipArpCacheTimeout} onChange={(e) => onChange({ ipArpCacheTimeout: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Source Validation</Label>
                <Select value={form.ipSourceValidation || "none"} onValueChange={(v) => onChange({ ipSourceValidation: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">None</SelectItem>{SOURCE_VALIDATION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Adjust MSS</Label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs"><input type="radio" checked={!form.ipAdjustMssClamp && !form.ipAdjustMss} onChange={() => onChange({ ipAdjustMssClamp: false, ipAdjustMss: "" })} />Off</label>
                <label className="flex items-center gap-1 text-xs"><input type="radio" checked={form.ipAdjustMssClamp} onChange={() => onChange({ ipAdjustMssClamp: true, ipAdjustMss: "" })} />Clamp PMTU</label>
                <label className="flex items-center gap-1 text-xs"><input type="radio" checked={!form.ipAdjustMssClamp && !!form.ipAdjustMss} onChange={() => onChange({ ipAdjustMssClamp: false })} />Manual</label>
              </div>
              {!form.ipAdjustMssClamp && <Input value={form.ipAdjustMss} onChange={(e) => onChange({ ipAdjustMss: e.target.value })} placeholder="MSS value" />}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["ipDisableArpFilter", "Disable ARP Filter"], ["ipEnableArpAccept", "Enable ARP Accept"],
                ["ipEnableArpAnnounce", "Enable ARP Announce"], ["ipEnableArpIgnore", "Enable ARP Ignore"],
                ["ipEnableDirectedBroadcast", "Directed Broadcast"], ["ipEnableProxyArp", "Proxy ARP"],
                ["ipProxyArpPvlan", "Proxy ARP PVLAN"], ["ipDisableForwarding", "Disable Forwarding"],
              ] as const).map(([k, label]) => (
                <div key={k} className="flex items-center gap-1"><Checkbox checked={form[k]} onCheckedChange={(c) => onChange({ [k]: !!c })} id={`${k}-${form.vlan_id}`} /><Label htmlFor={`${k}-${form.vlan_id}`} className="text-xs font-normal">{label}</Label></div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* IPv6 Settings collapsible */}
      <div>
        <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => onChange({ showIpv6: !form.showIpv6 })}>
          {form.showIpv6 ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          IPv6 Settings
        </button>
        {form.showIpv6 && (
          <div className="mt-2 space-y-2 pl-3 border-l">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label className="text-xs">Accept DAD (0–3)</Label><Input type="number" min={0} max={3} value={form.ipv6AcceptDad} onChange={(e) => onChange({ ipv6AcceptDad: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Base Reachable Time</Label><Input type="number" value={form.ipv6BaseReachableTime} onChange={(e) => onChange({ ipv6BaseReachableTime: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Dup Addr Detect</Label><Input type="number" value={form.ipv6DupAddrDetect} onChange={(e) => onChange({ ipv6DupAddrDetect: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Source Validation</Label>
                <Select value={form.ipv6SourceValidation || "none"} onValueChange={(v) => onChange({ ipv6SourceValidation: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">None</SelectItem>{SOURCE_VALIDATION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Adjust MSS (IPv6)</Label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs"><input type="radio" checked={!form.ipv6AdjustMssClamp && !form.ipv6AdjustMss} onChange={() => onChange({ ipv6AdjustMssClamp: false, ipv6AdjustMss: "" })} />Off</label>
                <label className="flex items-center gap-1 text-xs"><input type="radio" checked={form.ipv6AdjustMssClamp} onChange={() => onChange({ ipv6AdjustMssClamp: true, ipv6AdjustMss: "" })} />Clamp PMTU</label>
                <label className="flex items-center gap-1 text-xs"><input type="radio" checked={!form.ipv6AdjustMssClamp && !!form.ipv6AdjustMss} onChange={() => onChange({ ipv6AdjustMssClamp: false })} />Manual</label>
              </div>
              {!form.ipv6AdjustMssClamp && <Input value={form.ipv6AdjustMss} onChange={(e) => onChange({ ipv6AdjustMss: e.target.value })} placeholder="MSS value" />}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["ipv6DisableForwarding", "Disable Forwarding"],
                ["ipv6AddressAutoconf", "Address Autoconf"],
                ["ipv6NoDefaultLinkLocal", "No Default Link Local"],
              ] as const).map(([k, label]) => (
                <div key={k} className="flex items-center gap-1"><Checkbox checked={form[k]} onCheckedChange={(c) => onChange({ [k]: !!c })} id={`${k}-${form.vlan_id}`} /><Label htmlFor={`${k}-${form.vlan_id}`} className="text-xs font-normal">{label}</Label></div>
              ))}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">EUI64 Prefixes</Label>
              <div className="flex gap-2">
                <Input value={form.ipv6Eui64Input} onChange={(e) => onChange({ ipv6Eui64Input: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = form.ipv6Eui64Input.trim(); if (v && !form.ipv6Eui64.includes(v)) onChange({ ipv6Eui64: [...form.ipv6Eui64, v], ipv6Eui64Input: "" }); else onChange({ ipv6Eui64Input: "" }); } }} placeholder="IPv6 prefix" />
                <Button type="button" variant="outline" size="sm" onClick={() => { const v = form.ipv6Eui64Input.trim(); if (v && !form.ipv6Eui64.includes(v)) onChange({ ipv6Eui64: [...form.ipv6Eui64, v], ipv6Eui64Input: "" }); }}><Plus className="h-3 w-3" /></Button>
              </div>
              <div className="flex flex-wrap gap-1">{form.ipv6Eui64.map((p) => <Badge key={p} variant="secondary" className="gap-1 pr-1 text-xs">{p}<button onClick={() => onChange({ ipv6Eui64: form.ipv6Eui64.filter((x) => x !== p) })}><X className="h-3 w-3" /></button></Badge>)}</div>
            </div>
            {feat("ipv6_address_interface_identifier") && (
              <div className="space-y-1"><Label className="text-xs">Interface Identifier</Label><Input value={form.ipv6InterfaceIdentifier} onChange={(e) => onChange({ ipv6InterfaceIdentifier: e.target.value })} /></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function EditVirtualEthernetModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
  capabilities,
}: EditVirtualEthernetModalProps) {
  const feat = (key: string) => capabilities?.features?.[key]?.supported ?? false;

  // Basic
  const [peerName, setPeerName] = useState("");
  const [description, setDescription] = useState("");
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");
  const [netns, setNetns] = useState("");
  const [disabled, setDisabled] = useState(false);

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

  // DHCPv6
  const [dhcpv6Duid, setDhcpv6Duid] = useState("");
  const [dhcpv6NoRelease, setDhcpv6NoRelease] = useState(false);
  const [dhcpv6NoRequestDns, setDhcpv6NoRequestDns] = useState(false);
  const [dhcpv6NoRequestDomainName, setDhcpv6NoRequestDomainName] = useState(false);
  const [dhcpv6ParametersOnly, setDhcpv6ParametersOnly] = useState(false);
  const [dhcpv6RapidCommit, setDhcpv6RapidCommit] = useState(false);
  const [dhcpv6Temporary, setDhcpv6Temporary] = useState(false);

  // VIF state
  const [vifs, setVifs] = useState<VifFormState[]>([]);
  const [showVifForm, setShowVifForm] = useState(false);
  const [editingVifIdx, setEditingVifIdx] = useState<number | null>(null);
  const [newVif, setNewVif] = useState<VifFormState>(emptyVif());

  // VIF-S state
  const [vifSList, setVifSList] = useState<VifSFormState[]>([]);
  const [showVifSForm, setShowVifSForm] = useState(false);
  const [editingVifSIdx, setEditingVifSIdx] = useState<number | null>(null);
  const [newVifS, setNewVifS] = useState<VifSFormState>(emptyVifS());
  const [expandedVifS, setExpandedVifS] = useState<Set<number>>(new Set());
  const [showVifCFormForS, setShowVifCFormForS] = useState<number | null>(null);
  const [newVifC, setNewVifC] = useState<VifCFormState>(emptyVifC());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !interfaceData) return;
    const d = interfaceData;
    setPeerName(d.peer_name ?? "");
    setDescription(d.description ?? "");
    setMtu(d.mtu ?? "");
    setVrf(d.vrf ?? "");
    setNetns(d.netns ?? "");
    setDisabled(d.disabled);
    setAddresses([...d.addresses]);
    setAddressInput("");

    const dhcp = d.dhcp_options;
    setDhcpClientId(dhcp?.client_id ?? "");
    setDhcpHostName(dhcp?.host_name ?? "");
    setDhcpVendorClassId(dhcp?.vendor_class_id ?? "");
    setDhcpUserClass(dhcp?.user_class ?? "");
    setDhcpNoDefaultRoute(dhcp?.no_default_route ?? false);
    setDhcpDefaultRouteDistance(dhcp?.default_route_distance ?? "");
    setDhcpReject([...(dhcp?.reject ?? [])]);
    setDhcpRejectInput("");
    setDhcpMtu(dhcp?.mtu ?? false);

    const dv6 = d.dhcpv6_options;
    setDhcpv6Duid(dv6?.duid ?? "");
    setDhcpv6NoRelease(dv6?.no_release ?? false);
    setDhcpv6NoRequestDns(dv6?.no_request_dns ?? false);
    setDhcpv6NoRequestDomainName(dv6?.no_request_domain_name ?? false);
    setDhcpv6ParametersOnly(dv6?.parameters_only ?? false);
    setDhcpv6RapidCommit(dv6?.rapid_commit ?? false);
    setDhcpv6Temporary(dv6?.temporary ?? false);

    setVifs(d.vif.map((v) => ({
      ...emptyVif(),
      vlan_id: v.vlan_id,
      description: v.description ?? "",
      disabled: v.disabled,
      disable_link_detect: v.disable_link_detect,
      addresses: [...v.addresses],
      mtu: v.mtu ?? "",
      mac: v.mac ?? "",
      vrf: v.vrf ?? "",
      redirect: v.redirect ?? "",
      egress_qos: v.egress_qos ?? "",
      ingress_qos: v.ingress_qos ?? "",
      mirror_ingress: v.mirror?.ingress ?? "",
      mirror_egress: v.mirror?.egress ?? "",
      dhcpClientId: v.dhcp_options?.client_id ?? "",
      dhcpHostName: v.dhcp_options?.host_name ?? "",
      dhcpVendorClassId: v.dhcp_options?.vendor_class_id ?? "",
      dhcpUserClass: v.dhcp_options?.user_class ?? "",
      dhcpNoDefaultRoute: v.dhcp_options?.no_default_route ?? false,
      dhcpDefaultRouteDistance: v.dhcp_options?.default_route_distance ?? "",
      dhcpReject: [...(v.dhcp_options?.reject ?? [])],
      dhcpMtu: v.dhcp_options?.mtu ?? false,
      dhcpv6Duid: v.dhcpv6_options?.duid ?? "",
      dhcpv6NoRelease: v.dhcpv6_options?.no_release ?? false,
      dhcpv6NoRequestDns: v.dhcpv6_options?.no_request_dns ?? false,
      dhcpv6NoRequestDomainName: v.dhcpv6_options?.no_request_domain_name ?? false,
      dhcpv6ParametersOnly: v.dhcpv6_options?.parameters_only ?? false,
      dhcpv6RapidCommit: v.dhcpv6_options?.rapid_commit ?? false,
      dhcpv6Temporary: v.dhcpv6_options?.temporary ?? false,
      ipAdjustMss: (v.ip?.adjust_mss === "clamp-mss-to-pmtu" ? "" : v.ip?.adjust_mss) ?? "",
      ipAdjustMssClamp: v.ip?.adjust_mss === "clamp-mss-to-pmtu" || (v.ip?.adjust_mss_clamp_to_pmtu ?? false),
      ipArpCacheTimeout: v.ip?.arp_cache_timeout ?? "",
      ipDisableArpFilter: v.ip?.disable_arp_filter ?? false,
      ipEnableArpAccept: v.ip?.enable_arp_accept ?? false,
      ipEnableArpAnnounce: v.ip?.enable_arp_announce ?? false,
      ipEnableArpIgnore: v.ip?.enable_arp_ignore ?? false,
      ipEnableDirectedBroadcast: v.ip?.enable_directed_broadcast ?? false,
      ipEnableProxyArp: v.ip?.enable_proxy_arp ?? false,
      ipProxyArpPvlan: v.ip?.proxy_arp_pvlan ?? false,
      ipDisableForwarding: v.ip?.disable_forwarding ?? false,
      ipSourceValidation: v.ip?.source_validation ?? "",
      ipv6AcceptDad: v.ipv6?.accept_dad ?? "",
      ipv6AdjustMss: (v.ipv6?.adjust_mss === "clamp-mss-to-pmtu" ? "" : v.ipv6?.adjust_mss) ?? "",
      ipv6AdjustMssClamp: v.ipv6?.adjust_mss === "clamp-mss-to-pmtu" || (v.ipv6?.adjust_mss_clamp_to_pmtu ?? false),
      ipv6BaseReachableTime: v.ipv6?.base_reachable_time ?? "",
      ipv6DisableForwarding: v.ipv6?.disable_forwarding ?? false,
      ipv6DupAddrDetect: v.ipv6?.dup_addr_detect_transmits ?? "",
      ipv6SourceValidation: v.ipv6?.source_validation ?? "",
      ipv6AddressAutoconf: v.ipv6?.address_autoconf ?? false,
      ipv6Eui64: [...(v.ipv6?.address_eui64 ?? [])],
      ipv6NoDefaultLinkLocal: v.ipv6?.address_no_default_link_local ?? false,
      ipv6InterfaceIdentifier: v.ipv6?.address_interface_identifier ?? "",
    })));

    setVifSList(d.vif_s.map((vs) => ({
      ...emptyVifS(),
      vlan_id: vs.vlan_id,
      description: vs.description ?? "",
      disabled: vs.disabled,
      disable_link_detect: vs.disable_link_detect,
      addresses: [...vs.addresses],
      mtu: vs.mtu ?? "",
      mac: vs.mac ?? "",
      vrf: vs.vrf ?? "",
      redirect: vs.redirect ?? "",
      protocol: vs.protocol ?? "",
      mirror_ingress: vs.mirror?.ingress ?? "",
      mirror_egress: vs.mirror?.egress ?? "",
      vif_c: vs.vif_c.map((vc) => ({
        vlan_id: vc.vlan_id,
        description: vc.description ?? "",
        disabled: vc.disabled,
        disable_link_detect: vc.disable_link_detect,
        addresses: [...vc.addresses],
        addressInput: "",
        mtu: vc.mtu ?? "",
        mac: vc.mac ?? "",
        vrf: vc.vrf ?? "",
        redirect: vc.redirect ?? "",
        mirror_ingress: vc.mirror?.ingress ?? "",
        mirror_egress: vc.mirror?.egress ?? "",
      })),
    })));

    setShowVifForm(false);
    setEditingVifIdx(null);
    setNewVif(emptyVif());
    setShowVifSForm(false);
    setEditingVifSIdx(null);
    setNewVifS(emptyVifS());
    setExpandedVifS(new Set());
    setShowVifCFormForS(null);
    setNewVifC(emptyVifC());
    setError(null);
  }, [open, interfaceData]);

  const addAddress = () => {
    const v = addressInput.trim();
    if (v && !addresses.includes(v)) setAddresses((p) => [...p, v]);
    setAddressInput("");
  };

  const validate = (): string | null => {
    if (mtu) {
      const m = Number(mtu);
      if (!Number.isInteger(m) || m < 68 || m > 16000) return "MTU must be between 68 and 16000.";
    }
    for (const vif of vifs) {
      if (!vif.vlan_id || Number(vif.vlan_id) < 1 || Number(vif.vlan_id) > 4094) {
        return "VIF VLAN ID must be between 1 and 4094.";
      }
    }
    for (const vs of vifSList) {
      if (!vs.vlan_id || Number(vs.vlan_id) < 1 || Number(vs.vlan_id) > 4094) {
        return "VIF-S VLAN ID must be between 1 and 4094.";
      }
      for (const vc of vs.vif_c) {
        if (!vc.vlan_id || Number(vc.vlan_id) < 1 || Number(vc.vlan_id) > 4094) {
          return "VIF-C VLAN ID must be between 1 and 4094.";
        }
      }
    }
    return null;
  };

  const buildUpdate = (): Partial<VirtualEthernetCreateConfig> => {
    if (!interfaceData) return {};
    const d = interfaceData;
    const upd: Partial<VirtualEthernetCreateConfig> = {};

    if (description !== (d.description ?? "")) upd.description = description || undefined;
    if (disabled !== d.disabled) upd.disabled = disabled;
    if (peerName !== (d.peer_name ?? "")) upd.peer_name = peerName || undefined;
    if (netns !== (d.netns ?? "")) upd.netns = netns || undefined;
    if (mtu !== (d.mtu ?? "")) upd.mtu = mtu || undefined;
    if (vrf !== (d.vrf ?? "")) upd.vrf = vrf || undefined;

    const addrChanged = JSON.stringify([...addresses].sort()) !== JSON.stringify([...d.addresses].sort());
    if (addrChanged) upd.addresses = addresses;

    const dhcpChanged =
      dhcpClientId !== (d.dhcp_options?.client_id ?? "") ||
      dhcpHostName !== (d.dhcp_options?.host_name ?? "") ||
      dhcpVendorClassId !== (d.dhcp_options?.vendor_class_id ?? "") ||
      dhcpUserClass !== (d.dhcp_options?.user_class ?? "") ||
      dhcpNoDefaultRoute !== (d.dhcp_options?.no_default_route ?? false) ||
      dhcpDefaultRouteDistance !== (d.dhcp_options?.default_route_distance ?? "") ||
      JSON.stringify(dhcpReject.sort()) !== JSON.stringify([...(d.dhcp_options?.reject ?? [])].sort()) ||
      dhcpMtu !== (d.dhcp_options?.mtu ?? false);
    if (dhcpChanged) {
      upd.dhcp_options = {
        client_id: dhcpClientId || undefined, host_name: dhcpHostName || undefined,
        vendor_class_id: dhcpVendorClassId || undefined, user_class: dhcpUserClass || undefined,
        no_default_route: dhcpNoDefaultRoute,
        default_route_distance: dhcpDefaultRouteDistance || undefined,
        reject: dhcpReject, mtu: dhcpMtu,
      };
    }

    const dhcpv6Changed =
      dhcpv6Duid !== (d.dhcpv6_options?.duid ?? "") ||
      dhcpv6NoRelease !== (d.dhcpv6_options?.no_release ?? false) ||
      dhcpv6NoRequestDns !== (d.dhcpv6_options?.no_request_dns ?? false) ||
      dhcpv6NoRequestDomainName !== (d.dhcpv6_options?.no_request_domain_name ?? false) ||
      dhcpv6ParametersOnly !== (d.dhcpv6_options?.parameters_only ?? false) ||
      dhcpv6RapidCommit !== (d.dhcpv6_options?.rapid_commit ?? false) ||
      dhcpv6Temporary !== (d.dhcpv6_options?.temporary ?? false);
    if (dhcpv6Changed) {
      upd.dhcpv6_options = {
        duid: dhcpv6Duid || undefined, no_release: dhcpv6NoRelease,
        no_request_dns: dhcpv6NoRequestDns, no_request_domain_name: dhcpv6NoRequestDomainName,
        parameters_only: dhcpv6ParametersOnly, rapid_commit: dhcpv6RapidCommit,
        temporary: dhcpv6Temporary,
      };
    }

    const vifChanged = JSON.stringify(vifs.map(vifFormToInput)) !== JSON.stringify(d.vif.map((v) => ({
      vlan_id: v.vlan_id, description: v.description ?? undefined, disabled: v.disabled,
      disable_link_detect: v.disable_link_detect, addresses: v.addresses,
      mtu: v.mtu ?? undefined, mac: v.mac ?? undefined, vrf: v.vrf ?? undefined,
      redirect: v.redirect ?? undefined, egress_qos: v.egress_qos ?? undefined,
      ingress_qos: v.ingress_qos ?? undefined,
      mirror_ingress: v.mirror?.ingress ?? undefined, mirror_egress: v.mirror?.egress ?? undefined,
    })));
    if (vifChanged) upd.vif = vifs.map(vifFormToInput);

    const vifSChanged = JSON.stringify(vifSList.map(vifSFormToInput)) !== JSON.stringify(d.vif_s.map((vs) => ({
      vlan_id: vs.vlan_id, description: vs.description ?? undefined, disabled: vs.disabled,
      disable_link_detect: vs.disable_link_detect, addresses: vs.addresses,
      mtu: vs.mtu ?? undefined, mac: vs.mac ?? undefined, vrf: vs.vrf ?? undefined,
      redirect: vs.redirect ?? undefined, protocol: vs.protocol ?? undefined,
      mirror_ingress: vs.mirror?.ingress ?? undefined, mirror_egress: vs.mirror?.egress ?? undefined,
      vif_c: vs.vif_c.map((vc) => ({
        vlan_id: vc.vlan_id, description: vc.description ?? undefined, disabled: vc.disabled,
        disable_link_detect: vc.disable_link_detect, addresses: vc.addresses,
        mtu: vc.mtu ?? undefined, mac: vc.mac ?? undefined, vrf: vc.vrf ?? undefined,
        redirect: vc.redirect ?? undefined, mirror_ingress: vc.mirror?.ingress ?? undefined,
        mirror_egress: vc.mirror?.egress ?? undefined,
      })),
    })));
    if (vifSChanged) upd.vif_s = vifSList.map(vifSFormToInput);

    return upd;
  };

  const handleSubmit = async () => {
    if (!interfaceData) return;
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    setError(null);
    try {
      const upd = buildUpdate();
      const result = await virtualEthernetService.updateInterface(interfaceData.name, interfaceData, upd);
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Operation failed");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to update interface");
    } finally {
      setLoading(false);
    }
  };

  if (!interfaceData) return null;

  const saveVif = () => {
    if (!newVif.vlan_id) { setError("VIF VLAN ID is required."); return; }
    if (editingVifIdx !== null) {
      setVifs((p) => p.map((v, i) => i === editingVifIdx ? newVif : v));
      setEditingVifIdx(null);
    } else {
      setVifs((p) => [...p, newVif]);
    }
    setNewVif(emptyVif());
    setShowVifForm(false);
  };

  const saveVifS = () => {
    if (!newVifS.vlan_id) { setError("VIF-S VLAN ID is required."); return; }
    if (editingVifSIdx !== null) {
      setVifSList((p) => p.map((v, i) => i === editingVifSIdx ? newVifS : v));
      setEditingVifSIdx(null);
    } else {
      setVifSList((p) => [...p, newVifS]);
    }
    setNewVifS(emptyVifS());
    setShowVifSForm(false);
  };

  const saveVifC = (vsIdx: number) => {
    if (!newVifC.vlan_id) { setError("VIF-C VLAN ID is required."); return; }
    setVifSList((p) => p.map((vs, i) => i === vsIdx ? { ...vs, vif_c: [...vs.vif_c, newVifC] } : vs));
    setNewVifC(emptyVifC());
    setShowVifCFormForS(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Virtual Ethernet Interface: {interfaceData.name}</DialogTitle>
          <DialogDescription>
            Modify the configuration for virtual-ethernet interface {interfaceData.name}.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="vif">VIF</TabsTrigger>
            <TabsTrigger value="qinq">QinQ</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Interface Name</Label>
              <Input value={interfaceData.name} disabled className="font-mono" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="e-peerName">Peer Name</Label>
                <Input id="e-peerName" value={peerName} onChange={(e) => setPeerName(e.target.value)} placeholder="veth1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-description">Description</Label>
                <Input id="e-description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-mtu">MTU</Label>
                <Input id="e-mtu" type="number" value={mtu} onChange={(e) => setMtu(e.target.value)} min={68} max={16000} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-vrf">VRF</Label>
                <Input id="e-vrf" value={vrf} onChange={(e) => setVrf(e.target.value)} />
              </div>
            </div>

            {feat("netns") && (
              <div className="space-y-2">
                <Label htmlFor="e-netns">Network Namespace</Label>
                <Input id="e-netns" value={netns} onChange={(e) => setNetns(e.target.value)} placeholder="myns" />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox checked={disabled} onCheckedChange={(c) => setDisabled(!!c)} id="e-disabled" />
              <Label htmlFor="e-disabled">Disabled</Label>
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

            <Separator />
            <p className="text-sm font-medium">DHCP Options</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-xs">Client ID</Label><Input value={dhcpClientId} onChange={(e) => setDhcpClientId(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Hostname</Label><Input value={dhcpHostName} onChange={(e) => setDhcpHostName(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Vendor Class ID</Label><Input value={dhcpVendorClassId} onChange={(e) => setDhcpVendorClassId(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">User Class</Label><Input value={dhcpUserClass} onChange={(e) => setDhcpUserClass(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Default Route Distance</Label><Input type="number" value={dhcpDefaultRouteDistance} onChange={(e) => setDhcpDefaultRouteDistance(e.target.value)} /></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><Checkbox checked={dhcpNoDefaultRoute} onCheckedChange={(c) => setDhcpNoDefaultRoute(!!c)} id="e-dhcpNoDef" /><Label htmlFor="e-dhcpNoDef" className="text-sm font-normal">No Default Route</Label></div>
              <div className="flex items-center gap-2"><Checkbox checked={dhcpMtu} onCheckedChange={(c) => setDhcpMtu(!!c)} id="e-dhcpMtu" /><Label htmlFor="e-dhcpMtu" className="text-sm font-normal">Request MTU</Label></div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reject Servers</Label>
              <div className="flex gap-2">
                <Input value={dhcpRejectInput} onChange={(e) => setDhcpRejectInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = dhcpRejectInput.trim(); if (v && !dhcpReject.includes(v)) setDhcpReject((p) => [...p, v]); setDhcpRejectInput(""); } }} placeholder="Server IP" />
                <Button type="button" variant="outline" size="sm" onClick={() => { const v = dhcpRejectInput.trim(); if (v && !dhcpReject.includes(v)) setDhcpReject((p) => [...p, v]); setDhcpRejectInput(""); }}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-1">{dhcpReject.map((s) => <Badge key={s} variant="secondary" className="gap-1 pr-1">{s}<button onClick={() => setDhcpReject((p) => p.filter((x) => x !== s))}><X className="h-3 w-3" /></button></Badge>)}</div>
            </div>

            <Separator />
            <p className="text-sm font-medium">DHCPv6 Options</p>
            <div className="space-y-1"><Label className="text-xs">DUID</Label><Input value={dhcpv6Duid} onChange={(e) => setDhcpv6Duid(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              {([
                [dhcpv6NoRelease, setDhcpv6NoRelease, "No Release"],
                [dhcpv6ParametersOnly, setDhcpv6ParametersOnly, "Parameters Only"],
                [dhcpv6RapidCommit, setDhcpv6RapidCommit, "Rapid Commit"],
                [dhcpv6Temporary, setDhcpv6Temporary, "Temporary"],
              ] as const).map(([val, setter, label]) => (
                <div key={label} className="flex items-center gap-2"><Checkbox checked={val} onCheckedChange={(c) => setter(!!c)} id={`e-dhcpv6-${label}`} /><Label htmlFor={`e-dhcpv6-${label}`} className="text-sm font-normal">{label}</Label></div>
              ))}
              {feat("dhcpv6_no_request_dns") && <div className="flex items-center gap-2"><Checkbox checked={dhcpv6NoRequestDns} onCheckedChange={(c) => setDhcpv6NoRequestDns(!!c)} id="e-dhcpv6NoDns" /><Label htmlFor="e-dhcpv6NoDns" className="text-sm font-normal">No Request DNS</Label></div>}
              {feat("dhcpv6_no_request_domain_name") && <div className="flex items-center gap-2"><Checkbox checked={dhcpv6NoRequestDomainName} onCheckedChange={(c) => setDhcpv6NoRequestDomainName(!!c)} id="e-dhcpv6NoDomain" /><Label htmlFor="e-dhcpv6NoDomain" className="text-sm font-normal">No Request Domain Name</Label></div>}
            </div>
          </TabsContent>

          {/* VIF Tab */}
          <TabsContent value="vif" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">802.1q VLAN Sub-interfaces</p>
              <Button type="button" variant="outline" size="sm" onClick={() => { setNewVif(emptyVif()); setEditingVifIdx(null); setShowVifForm(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add VIF
              </Button>
            </div>
            {showVifForm && (
              <>
                <VifForm form={newVif} onChange={(patch) => setNewVif((p) => ({ ...p, ...patch }))} capabilities={capabilities} showQos />
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={saveVif}>Save VIF</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setShowVifForm(false); setEditingVifIdx(null); setNewVif(emptyVif()); }}>Cancel</Button>
                </div>
              </>
            )}
            {vifs.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>VLAN ID</TableHead>
                      <TableHead>Addresses</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vifs.map((vif, i) => (
                      <TableRow key={vif.vlan_id}>
                        <TableCell><Badge variant="secondary">{vif.vlan_id}</Badge></TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {vif.addresses.slice(0, 2).map((a) => <code key={a} className="text-xs font-mono px-1 py-0.5 rounded bg-accent">{a}</code>)}
                            {vif.addresses.length > 2 && <Badge variant="secondary" className="text-xs">+{vif.addresses.length - 2}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{vif.description || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={vif.disabled ? "bg-red-500/10 text-red-500 border-red-500/20 text-xs" : "bg-green-500/10 text-green-500 border-green-500/20 text-xs"}>
                            {vif.disabled ? "Disabled" : "Enabled"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setNewVif({ ...vif }); setEditingVifIdx(i); setShowVifForm(true); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setVifs((p) => p.filter((_, j) => j !== i))}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No VIF sub-interfaces configured.</p>
            )}
          </TabsContent>

          {/* QinQ Tab */}
          <TabsContent value="qinq" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">QinQ VIF-S Sub-interfaces</p>
              <Button type="button" variant="outline" size="sm" onClick={() => { setNewVifS(emptyVifS()); setEditingVifSIdx(null); setShowVifSForm(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add VIF-S
              </Button>
            </div>

            {showVifSForm && (
              <>
                <VifForm
                  form={newVifS}
                  onChange={(patch) => setNewVifS((p) => ({ ...p, ...patch }))}
                  capabilities={capabilities}
                  showProtocol
                />
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={saveVifS}>Save VIF-S</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => { setShowVifSForm(false); setEditingVifSIdx(null); setNewVifS(emptyVifS()); }}>Cancel</Button>
                </div>
              </>
            )}

            {vifSList.length > 0 ? (
              <div className="rounded-md border divide-y">
                {vifSList.map((vs, si) => (
                  <div key={vs.vlan_id}>
                    <div className="flex items-center justify-between p-3">
                      <button
                        type="button"
                        className="flex items-center gap-2 text-sm font-medium"
                        onClick={() => setExpandedVifS((prev) => { const next = new Set(prev); next.has(si) ? next.delete(si) : next.add(si); return next; })}
                      >
                        {expandedVifS.has(si) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <Badge variant="secondary">S-VLAN {vs.vlan_id}</Badge>
                        {vs.protocol && <Badge variant="outline" className="text-xs">{vs.protocol}</Badge>}
                        <span className="text-muted-foreground">{vs.description || ""}</span>
                        <span className="text-xs text-muted-foreground">{vs.vif_c.length} VIF-C</span>
                      </button>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setNewVifS({ ...vs }); setEditingVifSIdx(si); setShowVifSForm(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setVifSList((p) => p.filter((_, j) => j !== si))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {expandedVifS.has(si) && (
                      <div className="px-6 pb-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground">VIF-C Sub-interfaces</p>
                          <Button type="button" variant="outline" size="sm" className="h-6 text-xs" onClick={() => { setNewVifC(emptyVifC()); setShowVifCFormForS(si); }}>
                            <Plus className="h-3 w-3 mr-1" /> Add VIF-C
                          </Button>
                        </div>
                        {showVifCFormForS === si && (
                          <div className="space-y-2 p-2 border rounded bg-muted/20">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1"><Label className="text-xs">C-VLAN ID *</Label><Input type="number" min={1} max={4094} value={newVifC.vlan_id} onChange={(e) => setNewVifC((p) => ({ ...p, vlan_id: e.target.value }))} /></div>
                              <div className="space-y-1"><Label className="text-xs">Description</Label><Input value={newVifC.description} onChange={(e) => setNewVifC((p) => ({ ...p, description: e.target.value }))} /></div>
                              <div className="space-y-1"><Label className="text-xs">MTU</Label><Input type="number" value={newVifC.mtu} onChange={(e) => setNewVifC((p) => ({ ...p, mtu: e.target.value }))} /></div>
                              <div className="space-y-1"><Label className="text-xs">MAC</Label><Input value={newVifC.mac} onChange={(e) => setNewVifC((p) => ({ ...p, mac: e.target.value }))} placeholder="xx:xx:xx:xx:xx:xx" /></div>
                              <div className="space-y-1"><Label className="text-xs">VRF</Label><Input value={newVifC.vrf} onChange={(e) => setNewVifC((p) => ({ ...p, vrf: e.target.value }))} /></div>
                              <div className="space-y-1"><Label className="text-xs">Redirect</Label><Input value={newVifC.redirect} onChange={(e) => setNewVifC((p) => ({ ...p, redirect: e.target.value }))} /></div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1"><Checkbox checked={newVifC.disabled} onCheckedChange={(c) => setNewVifC((p) => ({ ...p, disabled: !!c }))} id="vifc-disabled" /><Label htmlFor="vifc-disabled" className="text-xs font-normal">Disabled</Label></div>
                              <div className="flex items-center gap-1"><Checkbox checked={newVifC.disable_link_detect} onCheckedChange={(c) => setNewVifC((p) => ({ ...p, disable_link_detect: !!c }))} id="vifc-ld" /><Label htmlFor="vifc-ld" className="text-xs font-normal">Disable Link Detect</Label></div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Addresses</Label>
                              <div className="flex gap-2">
                                <Input value={newVifC.addressInput} onChange={(e) => setNewVifC((p) => ({ ...p, addressInput: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = newVifC.addressInput.trim(); if (v && !newVifC.addresses.includes(v)) setNewVifC((p) => ({ ...p, addresses: [...p.addresses, v], addressInput: "" })); else setNewVifC((p) => ({ ...p, addressInput: "" })); } }} placeholder="192.0.2.1/24" />
                                <Button type="button" variant="outline" size="sm" onClick={() => { const v = newVifC.addressInput.trim(); if (v && !newVifC.addresses.includes(v)) setNewVifC((p) => ({ ...p, addresses: [...p.addresses, v], addressInput: "" })); }}><Plus className="h-3 w-3" /></Button>
                              </div>
                              <div className="flex flex-wrap gap-1">{newVifC.addresses.map((a) => <Badge key={a} variant="secondary" className="gap-1 pr-1 text-xs">{a}<button onClick={() => setNewVifC((p) => ({ ...p, addresses: p.addresses.filter((x) => x !== a) }))}><X className="h-3 w-3" /></button></Badge>)}</div>
                            </div>
                            <div className="flex gap-2">
                              <Button type="button" size="sm" className="h-7 text-xs" onClick={() => saveVifC(si)}>Add</Button>
                              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setShowVifCFormForS(null); setNewVifC(emptyVifC()); }}>Cancel</Button>
                            </div>
                          </div>
                        )}
                        {vs.vif_c.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">C-VLAN ID</TableHead>
                                <TableHead className="text-xs">Addresses</TableHead>
                                <TableHead className="text-xs">Description</TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {vs.vif_c.map((vc, ci) => (
                                <TableRow key={vc.vlan_id}>
                                  <TableCell><Badge variant="outline" className="text-xs">{vc.vlan_id}</Badge></TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {vc.addresses.slice(0, 2).map((a) => <code key={a} className="text-xs font-mono px-1 py-0.5 rounded bg-accent">{a}</code>)}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{vc.description || "—"}</TableCell>
                                  <TableCell>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => setVifSList((p) => p.map((s, j) => j === si ? { ...s, vif_c: s.vif_c.filter((_, l) => l !== ci) } : s))}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-2">No VIF-C sub-interfaces.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No VIF-S sub-interfaces configured.</p>
            )}
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
