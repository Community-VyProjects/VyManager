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
import { AlertCircle, Loader2, Plus, Pencil, Trash2, X, ChevronDown, ChevronRight } from "lucide-react";
import {
  pseudoEthernetService,
  type PseudoEthernetCapabilities,
  type PseudoEthernetCreateConfig,
  type PseudoEthernetInterface,
  type PseudoEthernetVifInput,
  type PseudoEthernetVifSInput,
  type PseudoEthernetVifCInput,
} from "@/lib/api/pseudo-ethernet";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import type { EthernetInterface } from "@/lib/api/types/ethernet";
import { ApiError } from "@/lib/types/api";

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

interface EditPseudoEthernetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: PseudoEthernetInterface | null;
  availableInterfaces: EthernetInterface[];
  capabilities: PseudoEthernetCapabilities | null;
}

// ── VIF inline form ──────────────────────────────────────────────────────────

interface VifFormState {
  vlan_id: string;
  description: string;
  disabled: boolean;
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
}

function emptyVif(): VifFormState {
  return { vlan_id: "", description: "", disabled: false, addresses: [], addressInput: "", mtu: "", mac: "", vrf: "", redirect: "", egress_qos: "", ingress_qos: "", mirror_ingress: "", mirror_egress: "" };
}

function vifFormToInput(f: VifFormState): PseudoEthernetVifInput {
  return {
    vlan_id: f.vlan_id,
    description: f.description || undefined,
    disabled: f.disabled,
    addresses: f.addresses,
    mtu: f.mtu || undefined,
    mac: f.mac || undefined,
    vrf: f.vrf || undefined,
    redirect: f.redirect || undefined,
    egress_qos: f.egress_qos || undefined,
    ingress_qos: f.ingress_qos || undefined,
    mirror_ingress: f.mirror_ingress || undefined,
    mirror_egress: f.mirror_egress || undefined,
  };
}

function VifForm({ form, onChange }: { form: VifFormState; onChange: (patch: Partial<VifFormState>) => void }) {
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
        <div className="space-y-1">
          <Label className="text-xs">Egress QoS</Label>
          <Input value={form.egress_qos} onChange={(e) => onChange({ egress_qos: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ingress QoS</Label>
          <Input value={form.ingress_qos} onChange={(e) => onChange({ ingress_qos: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Mirror Ingress</Label>
          <Input value={form.mirror_ingress} onChange={(e) => onChange({ mirror_ingress: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Mirror Egress</Label>
          <Input value={form.mirror_egress} onChange={(e) => onChange({ mirror_egress: e.target.value })} />
        </div>
      </div>
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
      <div className="flex items-center gap-2">
        <Checkbox checked={form.disabled} onCheckedChange={(c) => onChange({ disabled: !!c })} id="vif-disabled" />
        <Label htmlFor="vif-disabled" className="text-xs font-normal">Disabled</Label>
      </div>
    </div>
  );
}

// ── VIF-C form ───────────────────────────────────────────────────────────────

interface VifCFormState {
  vlan_id: string;
  description: string;
  disabled: boolean;
  addresses: string[];
  addressInput: string;
  mtu: string;
  mac: string;
  vrf: string;
  redirect: string;
  mirror_ingress: string;
  mirror_egress: string;
}

function emptyVifC(): VifCFormState {
  return { vlan_id: "", description: "", disabled: false, addresses: [], addressInput: "", mtu: "", mac: "", vrf: "", redirect: "", mirror_ingress: "", mirror_egress: "" };
}

function vifCFormToInput(f: VifCFormState): PseudoEthernetVifCInput {
  return {
    vlan_id: f.vlan_id,
    description: f.description || undefined,
    disabled: f.disabled,
    addresses: f.addresses,
    mtu: f.mtu || undefined,
    mac: f.mac || undefined,
    vrf: f.vrf || undefined,
    redirect: f.redirect || undefined,
    mirror_ingress: f.mirror_ingress || undefined,
    mirror_egress: f.mirror_egress || undefined,
  };
}

// ── VIF-S form state ─────────────────────────────────────────────────────────

interface VifSFormState {
  vlan_id: string;
  description: string;
  disabled: boolean;
  addresses: string[];
  addressInput: string;
  mtu: string;
  mac: string;
  vrf: string;
  redirect: string;
  mirror_ingress: string;
  mirror_egress: string;
  vif_c: VifCFormState[];
}

function emptyVifS(): VifSFormState {
  return { vlan_id: "", description: "", disabled: false, addresses: [], addressInput: "", mtu: "", mac: "", vrf: "", redirect: "", mirror_ingress: "", mirror_egress: "", vif_c: [] };
}

function vifSFormToInput(f: VifSFormState): PseudoEthernetVifSInput {
  return {
    vlan_id: f.vlan_id,
    description: f.description || undefined,
    disabled: f.disabled,
    addresses: f.addresses,
    mtu: f.mtu || undefined,
    mac: f.mac || undefined,
    vrf: f.vrf || undefined,
    redirect: f.redirect || undefined,
    mirror_ingress: f.mirror_ingress || undefined,
    mirror_egress: f.mirror_egress || undefined,
    vif_c: f.vif_c.map(vifCFormToInput),
  };
}

// ── Main component ───────────────────────────────────────────────────────────

export function EditPseudoEthernetModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
  availableInterfaces,
  capabilities,
}: EditPseudoEthernetModalProps) {
  const feat = (key: string) => capabilities?.features?.[key]?.supported ?? false;

  const [sourceInterface, setSourceInterface] = useState("");
  const [mode, setMode] = useState("private");
  const [description, setDescription] = useState("");
  const [mac, setMac] = useState("");
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");
  const [redirect, setRedirect] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [disableLinkDetect, setDisableLinkDetect] = useState(false);
  const [addresses, setAddresses] = useState<string[]>([]);
  const [addressInput, setAddressInput] = useState("");

  const [dhcpClientId, setDhcpClientId] = useState("");
  const [dhcpHostName, setDhcpHostName] = useState("");
  const [dhcpVendorClassId, setDhcpVendorClassId] = useState("");
  const [dhcpUserClass, setDhcpUserClass] = useState("");
  const [dhcpNoDefaultRoute, setDhcpNoDefaultRoute] = useState(false);
  const [dhcpDefaultRouteDistance, setDhcpDefaultRouteDistance] = useState("");
  const [dhcpReject, setDhcpReject] = useState<string[]>([]);
  const [dhcpRejectInput, setDhcpRejectInput] = useState("");
  const [dhcpMtu, setDhcpMtu] = useState(false);

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

  const [dhcpv6Duid, setDhcpv6Duid] = useState("");
  const [dhcpv6NoRelease, setDhcpv6NoRelease] = useState(false);
  const [dhcpv6NoRequestDns, setDhcpv6NoRequestDns] = useState(false);
  const [dhcpv6NoRequestDomainName, setDhcpv6NoRequestDomainName] = useState(false);
  const [dhcpv6ParametersOnly, setDhcpv6ParametersOnly] = useState(false);
  const [dhcpv6RapidCommit, setDhcpv6RapidCommit] = useState(false);
  const [dhcpv6Temporary, setDhcpv6Temporary] = useState(false);

  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");

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

  const [allInterfaces, setAllInterfaces] = useState<InterfaceName[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !interfaceData) return;
    showService.getAllInterfaces().then((r) => setAllInterfaces(r.interfaces)).catch(() => {});
    const d = interfaceData;
    setSourceInterface(d.source_interface ?? "");
    setMode(d.mode ?? "private");
    setDescription(d.description ?? "");
    setMac(d.mac ?? "");
    setMtu(d.mtu ?? "");
    setVrf(d.vrf ?? "");
    setRedirect(d.redirect ?? "");
    setDisabled(d.disabled);
    setDisableLinkDetect(d.disable_link_detect);
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

    const ip = d.ip;
    const isClamp = ip?.adjust_mss === "clamp-mss-to-pmtu";
    setIpAdjustMssClamp(isClamp || false);
    setIpAdjustMss(isClamp ? "" : (ip?.adjust_mss ?? ""));
    setIpArpCacheTimeout(ip?.arp_cache_timeout ?? "");
    setIpDisableArpFilter(ip?.disable_arp_filter ?? false);
    setIpEnableArpAccept(ip?.enable_arp_accept ?? false);
    setIpEnableArpAnnounce(ip?.enable_arp_announce ?? false);
    setIpEnableArpIgnore(ip?.enable_arp_ignore ?? false);
    setIpEnableDirectedBroadcast(ip?.enable_directed_broadcast ?? false);
    setIpEnableProxyArp(ip?.enable_proxy_arp ?? false);
    setIpProxyArpPvlan(ip?.proxy_arp_pvlan ?? false);
    setIpDisableForwarding(ip?.disable_forwarding ?? false);
    setIpSourceValidation(ip?.source_validation ?? "");

    const ipv6 = d.ipv6;
    const isIpv6Clamp = ipv6?.adjust_mss === "clamp-mss-to-pmtu";
    setIpv6AcceptDad(ipv6?.accept_dad ?? "");
    setIpv6AdjustMssClamp(isIpv6Clamp || false);
    setIpv6AdjustMss(isIpv6Clamp ? "" : (ipv6?.adjust_mss ?? ""));
    setIpv6BaseReachableTime(ipv6?.base_reachable_time ?? "");
    setIpv6DisableForwarding(ipv6?.disable_forwarding ?? false);
    setIpv6DupAddrDetect(ipv6?.dup_addr_detect_transmits ?? "");
    setIpv6SourceValidation(ipv6?.source_validation ?? "");
    setIpv6AddressAutoconf(ipv6?.address_autoconf ?? false);
    setIpv6Eui64([...(ipv6?.address_eui64 ?? [])]);
    setIpv6Eui64Input("");
    setIpv6NoDefaultLinkLocal(ipv6?.address_no_default_link_local ?? false);
    setIpv6InterfaceIdentifier(ipv6?.address_interface_identifier ?? "");

    const dv6 = d.dhcpv6_options;
    setDhcpv6Duid(dv6?.duid ?? "");
    setDhcpv6NoRelease(dv6?.no_release ?? false);
    setDhcpv6NoRequestDns(dv6?.no_request_dns ?? false);
    setDhcpv6NoRequestDomainName(dv6?.no_request_domain_name ?? false);
    setDhcpv6ParametersOnly(dv6?.parameters_only ?? false);
    setDhcpv6RapidCommit(dv6?.rapid_commit ?? false);
    setDhcpv6Temporary(dv6?.temporary ?? false);

    setMirrorIngress(d.mirror?.ingress ?? "");
    setMirrorEgress(d.mirror?.egress ?? "");

    setVifs(d.vif.map((v) => ({
      vlan_id: v.vlan_id,
      description: v.description ?? "",
      disabled: v.disabled,
      addresses: [...v.addresses],
      addressInput: "",
      mtu: v.mtu ?? "",
      mac: v.mac ?? "",
      vrf: v.vrf ?? "",
      redirect: v.redirect ?? "",
      egress_qos: v.egress_qos ?? "",
      ingress_qos: v.ingress_qos ?? "",
      mirror_ingress: v.mirror?.ingress ?? "",
      mirror_egress: v.mirror?.egress ?? "",
    })));

    setVifSList(d.vif_s.map((vs) => ({
      vlan_id: vs.vlan_id,
      description: vs.description ?? "",
      disabled: vs.disabled,
      addresses: [...vs.addresses],
      addressInput: "",
      mtu: vs.mtu ?? "",
      mac: vs.mac ?? "",
      vrf: vs.vrf ?? "",
      redirect: vs.redirect ?? "",
      mirror_ingress: vs.mirror?.ingress ?? "",
      mirror_egress: vs.mirror?.egress ?? "",
      vif_c: vs.vif_c.map((vc) => ({
        vlan_id: vc.vlan_id,
        description: vc.description ?? "",
        disabled: vc.disabled,
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
    if (mac && !MAC_RE.test(mac)) return "MAC address must be in format xx:xx:xx:xx:xx:xx.";
    if (mtu) {
      const m = Number(mtu);
      if (!Number.isInteger(m) || m < 68 || m > 9000) return "MTU must be between 68 and 9000.";
    }
    for (const vif of vifs) {
      if (!vif.vlan_id || Number(vif.vlan_id) < 1 || Number(vif.vlan_id) > 4094) {
        return `VIF VLAN ID must be between 1 and 4094.`;
      }
    }
    for (const vs of vifSList) {
      if (!vs.vlan_id || Number(vs.vlan_id) < 1 || Number(vs.vlan_id) > 4094) {
        return `VIF-S VLAN ID must be between 1 and 4094.`;
      }
      for (const vc of vs.vif_c) {
        if (!vc.vlan_id || Number(vc.vlan_id) < 1 || Number(vc.vlan_id) > 4094) {
          return `VIF-C VLAN ID must be between 1 and 4094.`;
        }
      }
    }
    return null;
  };

  const buildUpdate = (): Partial<PseudoEthernetCreateConfig> => {
    if (!interfaceData) return {};
    const d = interfaceData;
    const upd: Partial<PseudoEthernetCreateConfig> = {};

    if (sourceInterface !== (d.source_interface ?? "")) upd.source_interface = sourceInterface || undefined;
    if (mode !== (d.mode ?? "private")) upd.mode = mode || undefined;
    if (description !== (d.description ?? "")) upd.description = description || undefined;
    if (mac !== (d.mac ?? "")) upd.mac = mac || undefined;
    if (mtu !== (d.mtu ?? "")) upd.mtu = mtu || undefined;
    if (vrf !== (d.vrf ?? "")) upd.vrf = vrf || undefined;
    if (redirect !== (d.redirect ?? "")) upd.redirect = redirect || undefined;
    if (disabled !== d.disabled) upd.disabled = disabled;
    if (disableLinkDetect !== d.disable_link_detect) upd.disable_link_detect = disableLinkDetect;

    const addrChanged = JSON.stringify([...addresses].sort()) !== JSON.stringify([...d.addresses].sort());
    if (addrChanged) upd.addresses = addresses;

    const dhcpChanged = dhcpClientId !== (d.dhcp_options?.client_id ?? "") ||
      dhcpHostName !== (d.dhcp_options?.host_name ?? "") ||
      dhcpVendorClassId !== (d.dhcp_options?.vendor_class_id ?? "") ||
      dhcpUserClass !== (d.dhcp_options?.user_class ?? "") ||
      dhcpNoDefaultRoute !== (d.dhcp_options?.no_default_route ?? false) ||
      dhcpDefaultRouteDistance !== (d.dhcp_options?.default_route_distance ?? "") ||
      JSON.stringify(dhcpReject.sort()) !== JSON.stringify([...(d.dhcp_options?.reject ?? [])].sort()) ||
      dhcpMtu !== (d.dhcp_options?.mtu ?? false);
    if (dhcpChanged) {
      upd.dhcp_options = {
        client_id: dhcpClientId || undefined,
        host_name: dhcpHostName || undefined,
        vendor_class_id: dhcpVendorClassId || undefined,
        user_class: dhcpUserClass || undefined,
        no_default_route: dhcpNoDefaultRoute,
        default_route_distance: dhcpDefaultRouteDistance || undefined,
        reject: dhcpReject,
        mtu: dhcpMtu,
      };
    }

    // VIF changed — always wipe/rebuild
    const vifChanged = JSON.stringify(vifs.map(vifFormToInput)) !== JSON.stringify(d.vif.map((v) => ({
      vlan_id: v.vlan_id, description: v.description ?? undefined, disabled: v.disabled,
      addresses: v.addresses, mtu: v.mtu ?? undefined, mac: v.mac ?? undefined,
      vrf: v.vrf ?? undefined, redirect: v.redirect ?? undefined,
      egress_qos: v.egress_qos ?? undefined, ingress_qos: v.ingress_qos ?? undefined,
      mirror_ingress: v.mirror?.ingress ?? undefined, mirror_egress: v.mirror?.egress ?? undefined,
    })));
    if (vifChanged) upd.vif = vifs.map(vifFormToInput);

    const vifSChanged = JSON.stringify(vifSList.map(vifSFormToInput)) !== JSON.stringify(d.vif_s.map((vs) => vifSFormToInput({
      vlan_id: vs.vlan_id, description: vs.description ?? "", disabled: vs.disabled,
      addresses: vs.addresses, addressInput: "", mtu: vs.mtu ?? "", mac: vs.mac ?? "",
      vrf: vs.vrf ?? "", redirect: vs.redirect ?? "",
      mirror_ingress: vs.mirror?.ingress ?? "", mirror_egress: vs.mirror?.egress ?? "",
      vif_c: vs.vif_c.map((vc) => ({
        vlan_id: vc.vlan_id, description: vc.description ?? "", disabled: vc.disabled,
        addresses: vc.addresses, addressInput: "", mtu: vc.mtu ?? "", mac: vc.mac ?? "",
        vrf: vc.vrf ?? "", redirect: vc.redirect ?? "",
        mirror_ingress: vc.mirror?.ingress ?? "", mirror_egress: vc.mirror?.egress ?? "",
      })),
    })));
    if (vifSChanged) upd.vif_s = vifSList.map(vifSFormToInput);

    if (mirrorIngress !== (d.mirror?.ingress ?? "")) upd.mirror_ingress = mirrorIngress || undefined;
    if (mirrorEgress !== (d.mirror?.egress ?? "")) upd.mirror_egress = mirrorEgress || undefined;

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
      const result = await pseudoEthernetService.updateInterface(interfaceData.name, interfaceData, upd);
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

  // VIF save
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

  // VIF-S save
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

  // VIF-C save
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
          <DialogTitle>Edit Pseudo-Ethernet Interface: {interfaceData.name}</DialogTitle>
          <DialogDescription>
            Modify the configuration for pseudo-ethernet interface {interfaceData.name}.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="ipv4">IPv4</TabsTrigger>
            <TabsTrigger value="ipv6">IPv6</TabsTrigger>
            <TabsTrigger value="mirror">Mirror</TabsTrigger>
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
                <Label>Source Interface</Label>
                <InterfaceSelect
                  value={sourceInterface}
                  onValueChange={setSourceInterface}
                  interfaces={availableInterfaces.map((i) => ({ name: i.name, type: i.type, description: i.description ?? null }))}
                  placeholder="Select ethernet interface"
                />
              </div>
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>MAC Address</Label>
                <Input value={mac} onChange={(e) => setMac(e.target.value)} placeholder="xx:xx:xx:xx:xx:xx" />
              </div>
              <div className="space-y-2">
                <Label>MTU</Label>
                <Input type="number" value={mtu} onChange={(e) => setMtu(e.target.value)} min={68} max={9000} />
              </div>
              <div className="space-y-2">
                <Label>VRF</Label>
                <Input value={vrf} onChange={(e) => setVrf(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Redirect</Label>
                <Input value={redirect} onChange={(e) => setRedirect(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox checked={disabled} onCheckedChange={(c) => setDisabled(!!c)} id="e-disabled" />
                <Label htmlFor="e-disabled">Disabled</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={disableLinkDetect} onCheckedChange={(c) => setDisableLinkDetect(!!c)} id="e-ld" />
                <Label htmlFor="e-ld">Disable Link Detect</Label>
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

            <Separator />
            <p className="text-sm font-medium">DHCP Options</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Client ID</Label>
                <Input value={dhcpClientId} onChange={(e) => setDhcpClientId(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hostname</Label>
                <Input value={dhcpHostName} onChange={(e) => setDhcpHostName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vendor Class ID</Label>
                <Input value={dhcpVendorClassId} onChange={(e) => setDhcpVendorClassId(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">User Class</Label>
                <Input value={dhcpUserClass} onChange={(e) => setDhcpUserClass(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Default Route Distance</Label>
                <Input type="number" value={dhcpDefaultRouteDistance} onChange={(e) => setDhcpDefaultRouteDistance(e.target.value)} min={1} max={255} />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox checked={dhcpNoDefaultRoute} onCheckedChange={(c) => setDhcpNoDefaultRoute(!!c)} id="e-dhcpNoDef" />
                <Label htmlFor="e-dhcpNoDef" className="text-sm font-normal">No Default Route</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={dhcpMtu} onCheckedChange={(c) => setDhcpMtu(!!c)} id="e-dhcpMtu" />
                <Label htmlFor="e-dhcpMtu" className="text-sm font-normal">Request MTU</Label>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reject Servers</Label>
              <div className="flex gap-2">
                <Input
                  value={dhcpRejectInput}
                  onChange={(e) => setDhcpRejectInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const v = dhcpRejectInput.trim();
                      if (v && !dhcpReject.includes(v)) setDhcpReject((p) => [...p, v]);
                      setDhcpRejectInput("");
                    }
                  }}
                  placeholder="Server IP"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  const v = dhcpRejectInput.trim();
                  if (v && !dhcpReject.includes(v)) setDhcpReject((p) => [...p, v]);
                  setDhcpRejectInput("");
                }}>
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
                  <input type="radio" checked={!ipAdjustMssClamp && !!ipAdjustMss} onChange={() => setIpAdjustMssClamp(false)} />
                  Manual
                </label>
              </div>
              {!ipAdjustMssClamp && (
                <Input value={ipAdjustMss} onChange={(e) => setIpAdjustMss(e.target.value)} placeholder="MSS value" />
              )}
            </div>
            <div className="space-y-2">
              <Label>ARP Cache Timeout (ms)</Label>
              <Input type="number" value={ipArpCacheTimeout} onChange={(e) => setIpArpCacheTimeout(e.target.value)} />
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
                  <Checkbox checked={val as boolean} onCheckedChange={(c) => (setter as (v: boolean) => void)(!!c)} id={`e-ip-${label}`} />
                  <Label htmlFor={`e-ip-${label}`} className="text-sm font-normal">{label as string}</Label>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Source Validation</Label>
              <Select value={ipSourceValidation || "none"} onValueChange={(v) => setIpSourceValidation(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {SOURCE_VALIDATION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* IPv6 Tab */}
          <TabsContent value="ipv6" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Accept DAD (0–3)</Label>
                <Input type="number" min={0} max={3} value={ipv6AcceptDad} onChange={(e) => setIpv6AcceptDad(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Base Reachable Time</Label>
                <Input type="number" value={ipv6BaseReachableTime} onChange={(e) => setIpv6BaseReachableTime(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dup Addr Detect Transmits</Label>
                <Input type="number" value={ipv6DupAddrDetect} onChange={(e) => setIpv6DupAddrDetect(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">IPv6 Source Validation</Label>
                <Select value={ipv6SourceValidation || "none"} onValueChange={(v) => setIpv6SourceValidation(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {SOURCE_VALIDATION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Adjust MSS (IPv6)</Label>
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
                  Manual
                </label>
              </div>
              {!ipv6AdjustMssClamp && (
                <Input value={ipv6AdjustMss} onChange={(e) => setIpv6AdjustMss(e.target.value)} placeholder="MSS value" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                [ipv6DisableForwarding, setIpv6DisableForwarding, "Disable Forwarding"],
                [ipv6AddressAutoconf, setIpv6AddressAutoconf, "Address Autoconf"],
                [ipv6NoDefaultLinkLocal, setIpv6NoDefaultLinkLocal, "No Default Link Local"],
              ].map(([val, setter, label]) => (
                <div key={label as string} className="flex items-center gap-2">
                  <Checkbox checked={val as boolean} onCheckedChange={(c) => (setter as (v: boolean) => void)(!!c)} id={`e-ipv6-${label}`} />
                  <Label htmlFor={`e-ipv6-${label}`} className="text-sm font-normal">{label as string}</Label>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">EUI64 Prefixes</Label>
              <div className="flex gap-2">
                <Input value={ipv6Eui64Input} onChange={(e) => setIpv6Eui64Input(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = ipv6Eui64Input.trim(); if (v && !ipv6Eui64.includes(v)) setIpv6Eui64((p) => [...p, v]); setIpv6Eui64Input(""); } }} placeholder="IPv6 prefix" />
                <Button type="button" variant="outline" size="sm" onClick={() => { const v = ipv6Eui64Input.trim(); if (v && !ipv6Eui64.includes(v)) setIpv6Eui64((p) => [...p, v]); setIpv6Eui64Input(""); }}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {ipv6Eui64.map((p) => (
                  <Badge key={p} variant="secondary" className="gap-1 pr-1">{p}<button onClick={() => setIpv6Eui64((prev) => prev.filter((x) => x !== p))}><X className="h-3 w-3" /></button></Badge>
                ))}
              </div>
            </div>
            {feat("ipv6_address_interface_identifier") && (
              <div className="space-y-1">
                <Label className="text-xs">Interface Identifier</Label>
                <Input value={ipv6InterfaceIdentifier} onChange={(e) => setIpv6InterfaceIdentifier(e.target.value)} />
              </div>
            )}
            <Separator />
            <p className="text-sm font-medium">DHCPv6 Options</p>
            <div className="space-y-1">
              <Label className="text-xs">DUID</Label>
              <Input value={dhcpv6Duid} onChange={(e) => setDhcpv6Duid(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                [dhcpv6NoRelease, setDhcpv6NoRelease, "No Release"],
                [dhcpv6ParametersOnly, setDhcpv6ParametersOnly, "Parameters Only"],
                [dhcpv6RapidCommit, setDhcpv6RapidCommit, "Rapid Commit"],
                [dhcpv6Temporary, setDhcpv6Temporary, "Temporary"],
              ] as const).map(([val, setter, label]) => (
                <div key={label} className="flex items-center gap-2">
                  <Checkbox checked={val} onCheckedChange={(c) => setter(!!c)} id={`e-dhcpv6-${label}`} />
                  <Label htmlFor={`e-dhcpv6-${label}`} className="text-sm font-normal">{label}</Label>
                </div>
              ))}
              {feat("dhcpv6_no_request_dns") && (
                <div className="flex items-center gap-2">
                  <Checkbox checked={dhcpv6NoRequestDns} onCheckedChange={(c) => setDhcpv6NoRequestDns(!!c)} id="e-dhcpv6NoDns" />
                  <Label htmlFor="e-dhcpv6NoDns" className="text-sm font-normal">No Request DNS</Label>
                </div>
              )}
              {feat("dhcpv6_no_request_domain_name") && (
                <div className="flex items-center gap-2">
                  <Checkbox checked={dhcpv6NoRequestDomainName} onCheckedChange={(c) => setDhcpv6NoRequestDomainName(!!c)} id="e-dhcpv6NoDomain" />
                  <Label htmlFor="e-dhcpv6NoDomain" className="text-sm font-normal">No Request Domain Name</Label>
                </div>
              )}
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
                <VifForm form={newVif} onChange={(patch) => setNewVif((p) => ({ ...p, ...patch }))} />
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
                            {vif.addresses.slice(0, 2).map((a) => (
                              <code key={a} className="text-xs font-mono px-1 py-0.5 rounded bg-accent">{a}</code>
                            ))}
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
                <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">S-VLAN ID (1–4094) *</Label>
                      <Input type="number" min={1} max={4094} value={newVifS.vlan_id} onChange={(e) => setNewVifS((p) => ({ ...p, vlan_id: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Input value={newVifS.description} onChange={(e) => setNewVifS((p) => ({ ...p, description: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">MTU</Label>
                      <Input type="number" value={newVifS.mtu} onChange={(e) => setNewVifS((p) => ({ ...p, mtu: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">VRF</Label>
                      <Input value={newVifS.vrf} onChange={(e) => setNewVifS((p) => ({ ...p, vrf: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={newVifS.disabled} onCheckedChange={(c) => setNewVifS((p) => ({ ...p, disabled: !!c }))} id="vifs-disabled" />
                    <Label htmlFor="vifs-disabled" className="text-xs font-normal">Disabled</Label>
                  </div>
                </div>
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
                              <div className="space-y-1">
                                <Label className="text-xs">C-VLAN ID *</Label>
                                <Input type="number" min={1} max={4094} value={newVifC.vlan_id} onChange={(e) => setNewVifC((p) => ({ ...p, vlan_id: e.target.value }))} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Description</Label>
                                <Input value={newVifC.description} onChange={(e) => setNewVifC((p) => ({ ...p, description: e.target.value }))} />
                              </div>
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
