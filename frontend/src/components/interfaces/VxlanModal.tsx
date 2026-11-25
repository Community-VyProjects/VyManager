"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { MultiValueInput } from "@/components/service/webproxy/MultiValueInput";
import { AlertCircle, Boxes, Loader2, Plus, Trash2 } from "lucide-react";
import { vxlanService, type VxlanInterface, type VxlanCapabilities } from "@/lib/api/vxlan";
import {
  ACCEPT_DAD_VALUES,
  ADJUST_MSS_RANGE,
  ARP_CACHE_TIMEOUT_RANGE,
  BASE_REACHABLE_TIME_RANGE,
  CLAMP_MSS_TO_PMTU,
  DAD_TRANSMITS_RANGE,
  DESCRIPTION_MAX,
  DF_VALUES,
  FLOWLABEL_INHERIT,
  MTU_RANGE,
  PORT_RANGE,
  SOURCE_VALIDATION_VALUES,
  TOS_RANGE,
  TTL_RANGE,
  VLAN_ID_RANGE,
  VNI_RANGE,
  vxlanForm,
  vxlanProblem,
  vxlanSupports,
  type NumericRange,
  type VxlanForm,
  type VxlanIpForm,
  type VxlanIpv6Form,
  type VxlanParametersForm,
  type VxlanProblem,
  type VxlanVlanRow,
} from "@/lib/api/vxlan-save-ops";
import type { ApiError } from "@/lib/types/api";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";

/** A leaf that takes a keyword or a typed value: none, the keyword, or custom. */
const keywordMode = (value: string, keyword: string) => (!value ? "none" : value === keyword ? "keyword" : "custom");

interface VxlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: VxlanCapabilities | null;
  /** The other configured VXLAN interfaces (all of them on create). */
  others: VxlanInterface[];
  /** True when the edited interface is a bridge member (false on create). */
  bridgeMember: boolean;
  existing?: VxlanInterface | null;
}

/** The page passes a `key` that changes per open, so the form is seeded from props here. */
export function VxlanModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  others,
  bridgeMember,
  existing,
}: VxlanModalProps) {
  const t = useTranslations("vxlan");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const original = existing ?? null;

  const [form, setForm] = useState<VxlanForm>(() => vxlanForm(original, others.map((i) => i.name)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // "Custom" with a still-empty value would read back as "none" without these.
  const [ipMssCustom, setIpMssCustom] = useState(() => keywordMode(form.ip.adjust_mss, CLAMP_MSS_TO_PMTU) === "custom");
  const [ipv6MssCustom, setIpv6MssCustom] = useState(() => keywordMode(form.ipv6.adjust_mss, CLAMP_MSS_TO_PMTU) === "custom");
  const [flowlabelCustom, setFlowlabelCustom] = useState(
    () => keywordMode(form.parameters.ipv6_flowlabel, FLOWLABEL_INHERIT) === "custom",
  );

  const name = form.name;
  const lockedName = lockedIdentity(existing, (i) => i.name, name);
  // An interface cannot mirror to itself.
  const ownName = lockedName.value.trim();
  const notSelf = (iface: { name: string }) => iface.name !== ownName;

  const update = (patch: Partial<VxlanForm>) => setForm((f) => ({ ...f, ...patch }));
  const updateParams = (patch: Partial<VxlanParametersForm>) =>
    setForm((f) => ({ ...f, parameters: { ...f.parameters, ...patch } }));
  const updateIp = (patch: Partial<VxlanIpForm>) => setForm((f) => ({ ...f, ip: { ...f.ip, ...patch } }));
  const updateIpv6 = (patch: Partial<VxlanIpv6Form>) => setForm((f) => ({ ...f, ipv6: { ...f.ipv6, ...patch } }));

  // VLAN-to-VNI rows (row key is the index)
  const addVlanMapping = () =>
    setForm((f) => ({ ...f, vlan_to_vni: [...f.vlan_to_vni, { vlan_id: "", vni: "", description: "" }] }));
  const removeVlanMapping = (index: number) =>
    setForm((f) => ({ ...f, vlan_to_vni: f.vlan_to_vni.filter((_, i) => i !== index) }));
  const updateVlanMapping = (index: number, patch: Partial<VxlanVlanRow>) =>
    setForm((f) => ({ ...f, vlan_to_vni: f.vlan_to_vni.map((r, i) => (i === index ? { ...r, ...patch } : r)) }));

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  // An empty name reuses the shared common message.
  const problemText = (p: VxlanProblem) =>
    p.key === "nameRequired" ? tc("interfaceNameRequired") : t(`modal.errors.${p.key}`, p.values);

  const handleSubmit = async () => {
    const issue = vxlanProblem(original, form, capabilities, { others, bridgeMember });
    if (issue) {
      setError(problemText(issue));
      return;
    }
    const write = modalWriteKind(existing);
    setLoading(true);
    setError(null);
    try {
      if (write.kind === "update" && original) await vxlanService.updateInterface(original, form, capabilities);
      else await vxlanService.createInterface(form, capabilities);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t(isEdit ? "modal.errors.updateFailed" : "modal.errors.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  const hasInterfaceIdentifier = vxlanSupports(capabilities, "ipv6_address_interface_identifier");
  const hasVlanDescription = vxlanSupports(capabilities, "vlan_to_vni_description");
  const hasGpe = vxlanSupports(capabilities, "gpe");
  const none = { label: tc("none"), value: "" };
  const rangeText = (range: NumericRange) =>
    range.max === undefined ? t("modal.minPlaceholder", { min: range.min }) : t("modal.rangePlaceholder", { min: range.min, max: range.max });

  const numberField = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    range: NumericRange,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={rangeText(range)}
        className="h-8 text-sm"
        type="number"
        min={range.min}
        max={range.max}
      />
    </div>
  );

  const checkField = (id: string, label: string, checked: boolean, onChange: (checked: boolean) => void) => (
    <div className="flex items-center space-x-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(c) => onChange(c === true)} />
      <Label htmlFor={id} className="text-xs font-normal">{label}</Label>
    </div>
  );

  /** adjust-mss: none, clamp-mss-to-pmtu, or a number in ADJUST_MSS_RANGE. */
  const adjustMssField = (
    id: string,
    value: string,
    custom: boolean,
    setCustom: (custom: boolean) => void,
    onChange: (value: string) => void,
  ) => {
    const mode = custom ? "custom" : keywordMode(value.trim(), CLAMP_MSS_TO_PMTU);
    return (
      <div className="space-y-2">
        <Label htmlFor={id} className="text-xs">{t("modal.ip.adjustMss")}</Label>
        <Select
          value={mode}
          onValueChange={(v) => {
            setCustom(v === "custom");
            onChange(v === "keyword" ? CLAMP_MSS_TO_PMTU : "");
          }}
        >
          <SelectTrigger id={id} className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("modal.ip.mssNone")}</SelectItem>
            <SelectItem value="keyword">{t("modal.ip.mssClamp")}</SelectItem>
            <SelectItem value="custom">{t("modal.ip.mssCustom")}</SelectItem>
          </SelectContent>
        </Select>
        {mode === "custom" && (
          <Input
            id={`${id}Value`}
            aria-label={t("modal.ip.mssCustom")}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={rangeText(ADJUST_MSS_RANGE)}
            className="h-8 text-sm"
            type="number"
            min={ADJUST_MSS_RANGE.min}
            max={ADJUST_MSS_RANGE.max}
          />
        )}
      </div>
    );
  };

  const flowlabel = form.parameters.ipv6_flowlabel;
  const flowlabelMode = flowlabelCustom ? "custom" : keywordMode(flowlabel.trim(), FLOWLABEL_INHERIT);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            {isEdit ? t("modal.editTitle", { name: existing.name }) : t("modal.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("modal.editDescription") : t("modal.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">{t("modal.tabs.basic")}</TabsTrigger>
            <TabsTrigger value="advanced">{t("modal.tabs.advanced")}</TabsTrigger>
            <TabsTrigger value="ip">{t("modal.tabs.ip")}</TabsTrigger>
            <TabsTrigger value="vlan-vni">{t("modal.tabs.vlanVni")}</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vxlan-name">{t("modal.basic.interfaceName")}</Label>
                <Input
                  id="vxlan-name"
                  value={lockedName.value}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="vxlan0"
                  disabled={lockedName.disabled}
                  className={lockedName.disabled ? "bg-muted" : undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vxlan-vni">VNI</Label>
                <Input
                  id="vxlan-vni"
                  value={form.vni}
                  onChange={(e) => update({ vni: e.target.value })}
                  placeholder={rangeText(VNI_RANGE)}
                  type="number"
                  min={VNI_RANGE.min}
                  max={VNI_RANGE.max}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vxlan-description">{tc("description")}</Label>
              <Input
                id="vxlan-description"
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder={t("modal.basic.descriptionPlaceholder")}
                maxLength={DESCRIPTION_MAX}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vxlan-sourceAddress">{t("modal.basic.sourceAddress")}</Label>
                <Input
                  id="vxlan-sourceAddress"
                  value={form.source_address}
                  onChange={(e) => update({ source_address: e.target.value })}
                  placeholder="192.0.2.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vxlan-sourceInterface">{t("modal.basic.sourceInterface")}</Label>
                <InterfaceSelect
                  id="vxlan-sourceInterface"
                  value={form.source_interface}
                  onValueChange={(source_interface) => update({ source_interface })}
                  noneOption={none}
                  placeholder={tc("selectInterface")}
                />
              </div>
            </div>

            <MultiValueInput
              label={t("modal.basic.remoteAddresses")}
              values={form.remotes}
              onChange={(remotes) => update({ remotes })}
              placeholder="192.0.2.2"
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vxlan-group">{t("modal.basic.multicastGroup")}</Label>
                <Input
                  id="vxlan-group"
                  value={form.group}
                  onChange={(e) => update({ group: e.target.value })}
                  placeholder="239.1.1.1"
                />
              </div>
              {numberField("vxlan-port", t("modal.basic.udpPort"), form.port, (port) => update({ port }), PORT_RANGE)}
            </div>

            <MultiValueInput
              label={t("modal.basic.ipAddresses")}
              values={form.addresses}
              onChange={(addresses) => update({ addresses })}
              placeholder="10.10.10.1/24"
            />

            <div className="grid grid-cols-3 gap-4">
              {numberField("vxlan-mtu", "MTU", form.mtu, (mtu) => update({ mtu }), MTU_RANGE)}
              <div className="space-y-2">
                <Label htmlFor="vxlan-mac" className="text-xs">{t("modal.basic.macAddress")}</Label>
                <Input
                  id="vxlan-mac"
                  value={form.mac}
                  onChange={(e) => update({ mac: e.target.value })}
                  placeholder="00:11:22:33:44:55"
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vxlan-vrf" className="text-xs">VRF</Label>
                <VrfSelect id="vxlan-vrf" value={form.vrf} onValueChange={(vrf) => update({ vrf })} />
              </div>
            </div>

            <div className="flex gap-6">
              {checkField("vxlan-disabled", tc("disabled"), form.disabled, (disabled) => update({ disabled }))}
              {hasGpe && checkField("vxlan-gpe", "GPE", form.gpe, (gpe) => update({ gpe }))}
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            <h4 className="text-sm font-medium">{t("modal.advanced.tunnelParameters")}</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {checkField("vxlan-external", t("modal.advanced.external"), form.parameters.external, (external) => updateParams({ external }))}
              {checkField("vxlan-nolearning", t("modal.advanced.noLearning"), form.parameters.nolearning, (nolearning) => updateParams({ nolearning }))}
              {checkField("vxlan-neighborSuppress", t("modal.advanced.neighborSuppress"), form.parameters.neighbor_suppress, (neighbor_suppress) => updateParams({ neighbor_suppress }))}
              {checkField("vxlan-vniFilter", t("modal.advanced.vniFilter"), form.parameters.vni_filter, (vni_filter) => updateParams({ vni_filter }))}
            </div>

            <Separator />

            <h4 className="text-sm font-medium">{t("modal.advanced.ipParameters")}</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vxlan-ipDf" className="text-xs">{t("modal.advanced.dontFragment")}</Label>
                <NamedListSelect
                  id="vxlan-ipDf"
                  value={form.parameters.ip_df}
                  names={DF_VALUES}
                  noneLabel={tc("default")}
                  onValueChange={(ip_df) => updateParams({ ip_df })}
                />
              </div>
              {numberField("vxlan-ipTos", t("modal.advanced.typeOfService"), form.parameters.ip_tos, (ip_tos) => updateParams({ ip_tos }), TOS_RANGE)}
              {numberField("vxlan-ipTtl", "TTL", form.parameters.ip_ttl, (ip_ttl) => updateParams({ ip_ttl }), TTL_RANGE)}
            </div>

            <h4 className="text-sm font-medium">{t("modal.advanced.ipv6Parameters")}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vxlan-ipv6Flowlabel" className="text-xs">{t("modal.advanced.flowLabel")}</Label>
                <Select
                  value={flowlabelMode}
                  onValueChange={(v) => {
                    setFlowlabelCustom(v === "custom");
                    updateParams({ ipv6_flowlabel: v === "keyword" ? FLOWLABEL_INHERIT : "" });
                  }}
                >
                  <SelectTrigger id="vxlan-ipv6Flowlabel" className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tc("default")}</SelectItem>
                    <SelectItem value="keyword">{t("modal.advanced.flowLabelInherit")}</SelectItem>
                    <SelectItem value="custom">{t("modal.advanced.flowLabelCustom")}</SelectItem>
                  </SelectContent>
                </Select>
                {flowlabelMode === "custom" && (
                  <Input
                    id="vxlan-ipv6FlowlabelValue"
                    aria-label={t("modal.advanced.flowLabelCustom")}
                    value={flowlabel}
                    onChange={(e) => updateParams({ ipv6_flowlabel: e.target.value })}
                    placeholder={t("modal.advanced.flowLabelPlaceholder")}
                    className="h-8 text-sm font-mono"
                  />
                )}
              </div>
            </div>

            <Separator />

            <h4 className="text-sm font-medium">{t("modal.advanced.mirror")}</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vxlan-mirrorIngress" className="text-xs">{t("modal.advanced.ingressInterface")}</Label>
                <InterfaceSelect id="vxlan-mirrorIngress" value={form.mirror_ingress} onValueChange={(mirror_ingress) => update({ mirror_ingress })} filter={notSelf} noneOption={none} className="h-8 text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vxlan-mirrorEgress" className="text-xs">{t("modal.advanced.egressInterface")}</Label>
                <InterfaceSelect id="vxlan-mirrorEgress" value={form.mirror_egress} onValueChange={(mirror_egress) => update({ mirror_egress })} filter={notSelf} noneOption={none} className="h-8 text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vxlan-redirect" className="text-xs">{t("modal.advanced.redirectInterface")}</Label>
                <InterfaceSelect id="vxlan-redirect" value={form.redirect} onValueChange={(redirect) => update({ redirect })} noneOption={none} className="h-8 text-sm" />
              </div>
            </div>
          </TabsContent>

          {/* IP Settings Tab */}
          <TabsContent value="ip" className="space-y-4 mt-4">
            <h4 className="text-sm font-medium">{t("modal.ip.ipv4Settings")}</h4>
            <div className="grid grid-cols-2 gap-4">
              {adjustMssField("vxlan-ipAdjustMss", form.ip.adjust_mss, ipMssCustom, setIpMssCustom, (adjust_mss) => updateIp({ adjust_mss }))}
              {numberField(
                "vxlan-ipArpCacheTimeout",
                t("modal.ip.arpCacheTimeout"),
                form.ip.arp_cache_timeout,
                (arp_cache_timeout) => updateIp({ arp_cache_timeout }),
                ARP_CACHE_TIMEOUT_RANGE,
              )}
              <div className="space-y-2">
                <Label htmlFor="vxlan-ipSourceValidation" className="text-xs">{t("modal.ip.sourceValidation")}</Label>
                <NamedListSelect
                  id="vxlan-ipSourceValidation"
                  value={form.ip.source_validation}
                  names={SOURCE_VALIDATION_VALUES}
                  onValueChange={(source_validation) => updateIp({ source_validation })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {checkField("vxlan-ipDisableArpFilter", t("modal.ip.disableArpFilter"), form.ip.disable_arp_filter, (disable_arp_filter) => updateIp({ disable_arp_filter }))}
              {checkField("vxlan-ipDisableForwarding", t("modal.ip.disableForwarding"), form.ip.disable_forwarding, (disable_forwarding) => updateIp({ disable_forwarding }))}
              {checkField("vxlan-ipEnableArpAccept", t("modal.ip.enableArpAccept"), form.ip.enable_arp_accept, (enable_arp_accept) => updateIp({ enable_arp_accept }))}
              {checkField("vxlan-ipEnableArpAnnounce", t("modal.ip.enableArpAnnounce"), form.ip.enable_arp_announce, (enable_arp_announce) => updateIp({ enable_arp_announce }))}
              {checkField("vxlan-ipEnableArpIgnore", t("modal.ip.enableArpIgnore"), form.ip.enable_arp_ignore, (enable_arp_ignore) => updateIp({ enable_arp_ignore }))}
              {checkField("vxlan-ipEnableDirectedBroadcast", t("modal.ip.enableDirectedBroadcast"), form.ip.enable_directed_broadcast, (enable_directed_broadcast) => updateIp({ enable_directed_broadcast }))}
              {checkField("vxlan-ipEnableProxyArp", t("modal.ip.enableProxyArp"), form.ip.enable_proxy_arp, (enable_proxy_arp) => updateIp({ enable_proxy_arp }))}
              {checkField("vxlan-ipProxyArpPvlan", t("modal.ip.proxyArpPvlan"), form.ip.proxy_arp_pvlan, (proxy_arp_pvlan) => updateIp({ proxy_arp_pvlan }))}
            </div>

            <Separator />

            <h4 className="text-sm font-medium">{t("modal.ip.ipv6Settings")}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vxlan-ipv6AcceptDad" className="text-xs">{t("modal.ip.acceptDad")}</Label>
                <NamedListSelect
                  id="vxlan-ipv6AcceptDad"
                  value={form.ipv6.accept_dad}
                  names={ACCEPT_DAD_VALUES}
                  noneLabel={tc("default")}
                  onValueChange={(accept_dad) => updateIpv6({ accept_dad })}
                />
              </div>
              {numberField(
                "vxlan-ipv6DupAddrDetect",
                t("modal.ip.dadTransmits"),
                form.ipv6.dup_addr_detect_transmits,
                (dup_addr_detect_transmits) => updateIpv6({ dup_addr_detect_transmits }),
                DAD_TRANSMITS_RANGE,
              )}
              {hasInterfaceIdentifier && (
                <div className="space-y-2">
                  <Label htmlFor="vxlan-ipv6InterfaceIdentifier" className="text-xs">{t("modal.ip.interfaceIdentifier")}</Label>
                  <Input
                    id="vxlan-ipv6InterfaceIdentifier"
                    value={form.ipv6.address_interface_identifier}
                    onChange={(e) => updateIpv6({ address_interface_identifier: e.target.value })}
                    placeholder="::1"
                    className="h-8 text-sm font-mono"
                  />
                </div>
              )}
              {adjustMssField("vxlan-ipv6AdjustMss", form.ipv6.adjust_mss, ipv6MssCustom, setIpv6MssCustom, (adjust_mss) => updateIpv6({ adjust_mss }))}
              {numberField(
                "vxlan-ipv6BaseReachableTime",
                t("modal.ip.baseReachableTime"),
                form.ipv6.base_reachable_time,
                (base_reachable_time) => updateIpv6({ base_reachable_time }),
                BASE_REACHABLE_TIME_RANGE,
              )}
              <div className="space-y-2">
                <Label htmlFor="vxlan-ipv6SourceValidation" className="text-xs">{t("modal.ip.sourceValidation")}</Label>
                <NamedListSelect
                  id="vxlan-ipv6SourceValidation"
                  value={form.ipv6.source_validation}
                  names={SOURCE_VALIDATION_VALUES}
                  onValueChange={(source_validation) => updateIpv6({ source_validation })}
                />
              </div>
            </div>
            <MultiValueInput
              label={t("modal.ip.eui64Prefix")}
              values={form.ipv6.address_eui64}
              onChange={(address_eui64) => updateIpv6({ address_eui64 })}
              placeholder="2001:db8::/64"
            />
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {checkField("vxlan-ipv6AddressAutoconf", t("modal.ip.addressAutoconf"), form.ipv6.address_autoconf, (address_autoconf) => updateIpv6({ address_autoconf }))}
              {checkField("vxlan-ipv6NoDefaultLinkLocal", t("modal.ip.noDefaultLinkLocal"), form.ipv6.address_no_default_link_local, (address_no_default_link_local) => updateIpv6({ address_no_default_link_local }))}
              {checkField("vxlan-ipv6DisableForwarding", t("modal.ip.disableForwarding"), form.ipv6.disable_forwarding, (disable_forwarding) => updateIpv6({ disable_forwarding }))}
            </div>
          </TabsContent>

          {/* VLAN-to-VNI Tab */}
          <TabsContent value="vlan-vni" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{t("modal.vlanVni.title")}</h4>
              <Button type="button" variant="outline" size="sm" onClick={addVlanMapping} className="gap-1">
                <Plus className="h-3 w-3" /> {t("modal.vlanVni.addMapping")}
              </Button>
            </div>

            {form.vlan_to_vni.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">{t("modal.vlanVni.empty")}</p>
            ) : (
              <div className="space-y-2">
                {form.vlan_to_vni.map((mapping, index) => (
                  <div key={index} className="flex items-end gap-2 rounded-lg border p-3">
                    <div className={`flex-1 grid gap-2 ${hasVlanDescription ? "grid-cols-3" : "grid-cols-2"}`}>
                      <div className="space-y-1">
                        <Label htmlFor={`vxlan-vlanId${index}`} className="text-xs">{t("modal.vlanVni.vlanId")}</Label>
                        <Input
                          id={`vxlan-vlanId${index}`}
                          value={mapping.vlan_id}
                          onChange={(e) => updateVlanMapping(index, { vlan_id: e.target.value })}
                          placeholder={rangeText(VLAN_ID_RANGE)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`vxlan-vlanVni${index}`} className="text-xs">VNI</Label>
                        <Input
                          id={`vxlan-vlanVni${index}`}
                          value={mapping.vni}
                          onChange={(e) => updateVlanMapping(index, { vni: e.target.value })}
                          placeholder={rangeText(VNI_RANGE)}
                          className="h-8 text-sm"
                        />
                      </div>
                      {hasVlanDescription && (
                        <div className="space-y-1">
                          <Label htmlFor={`vxlan-vlanDescription${index}`} className="text-xs">{tc("description")}</Label>
                          <Input
                            id={`vxlan-vlanDescription${index}`}
                            value={mapping.description}
                            onChange={(e) => updateVlanMapping(index, { description: e.target.value })}
                            placeholder={tc("optional")}
                            className="h-8 text-sm"
                            maxLength={DESCRIPTION_MAX}
                          />
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeVlanMapping(index)}
                      className="h-8 w-8 shrink-0 text-destructive"
                      aria-label={tc("delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
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
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? tc("saving") : tc("creating")}
              </>
            ) : isEdit ? (
              tc("saveChanges")
            ) : (
              t("modal.createInterface")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
