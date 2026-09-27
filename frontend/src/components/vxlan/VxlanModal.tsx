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
import { VrfSelect } from "@/components/ui/vrf-select";
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
import { AlertCircle, Boxes, Loader2, Plus, Trash2 } from "lucide-react";
import { vxlanService, type VxlanInterface, type VxlanCapabilities } from "@/lib/api/vxlan";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";

interface VxlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: VxlanCapabilities | null;
  existingInterfaces: string[];
  existing?: VxlanInterface | null;
}

interface VlanToVniRow {
  vlan_id: string;
  vni: string;
  description: string;
}

export function VxlanModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingInterfaces,
  existing,
}: VxlanModalProps) {
  const t = useTranslations("vxlan");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);

  // Basic form state
  const [name, setName] = useState("vxlan0");
  const [vni, setVni] = useState("");
  const [description, setDescription] = useState("");
  const [sourceAddress, setSourceAddress] = useState("");
  const [sourceInterface, setSourceInterface] = useState("");
  const [group, setGroup] = useState("");
  const [remotes, setRemotes] = useState("");
  const [port, setPort] = useState("");
  const [mtu, setMtu] = useState("");
  const [addresses, setAddresses] = useState("");
  const [mac, setMac] = useState("");
  const [vrf, setVrf] = useState("");
  const [redirect, setRedirect] = useState("");

  // Advanced state
  const [disabled, setDisabled] = useState(false);
  const [gpe, setGpe] = useState(false);
  const [external, setExternal] = useState(false);
  const [nolearning, setNolearning] = useState(false);
  const [neighborSuppress, setNeighborSuppress] = useState(false);
  const [vniFilter, setVniFilter] = useState(false);
  const [ipDf, setIpDf] = useState("");
  const [ipTos, setIpTos] = useState("");
  const [ipTtl, setIpTtl] = useState("");
  const [ipv6Flowlabel, setIpv6Flowlabel] = useState("");
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");

  // VLAN-to-VNI state
  const [vlanToVni, setVlanToVni] = useState<VlanToVniRow[]>([]);

  // Available interfaces for dropdowns
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getNextInterfaceName = (): string => {
    let i = 0;
    while (existingInterfaces.includes(`vxlan${i}`)) {
      i++;
    }
    return `vxlan${i}`;
  };

  const resetForm = () => {
    setName(getNextInterfaceName());
    setVni("");
    setDescription("");
    setSourceAddress("");
    setSourceInterface("");
    setGroup("");
    setRemotes("");
    setPort("");
    setMtu("");
    setAddresses("");
    setMac("");
    setVrf("");
    setRedirect("");
    setDisabled(false);
    setGpe(false);
    setExternal(false);
    setNolearning(false);
    setNeighborSuppress(false);
    setVniFilter(false);
    setIpDf("");
    setIpTos("");
    setIpTtl("");
    setIpv6Flowlabel("");
    setMirrorIngress("");
    setMirrorEgress("");
    setVlanToVni([]);
    setError(null);
  };

  const populateForm = (interfaceData: VxlanInterface) => {
    setName(interfaceData.name);
    setVni(interfaceData.vni || "");
    setDescription(interfaceData.description || "");
    setSourceAddress(interfaceData.source_address || "");
    setSourceInterface(interfaceData.source_interface || "");
    setGroup(interfaceData.group || "");
    setRemotes(interfaceData.remotes.join(", "));
    setPort(interfaceData.port || "");
    setMtu(interfaceData.mtu || "");
    setAddresses(interfaceData.addresses.join(", "));
    setMac(interfaceData.mac || "");
    setVrf(interfaceData.vrf || "");
    setRedirect(interfaceData.redirect || "");
    setDisabled(interfaceData.disabled);
    setGpe(interfaceData.gpe);
    setExternal(interfaceData.parameters.external);
    setNolearning(interfaceData.parameters.nolearning);
    setNeighborSuppress(interfaceData.parameters.neighbor_suppress);
    setVniFilter(interfaceData.parameters.vni_filter);
    setIpDf(interfaceData.parameters.ip.df || "");
    setIpTos(interfaceData.parameters.ip.tos || "");
    setIpTtl(interfaceData.parameters.ip.ttl || "");
    setIpv6Flowlabel(interfaceData.parameters.ipv6.flowlabel || "");
    setMirrorIngress(interfaceData.mirror.ingress || "");
    setMirrorEgress(interfaceData.mirror.egress || "");
    setVlanToVni(
      interfaceData.vlan_to_vni.map((m) => ({
        vlan_id: m.vlan_id,
        vni: m.vni || "",
        description: m.description || "",
      }))
    );
    setError(null);
  };

  useEffect(() => {
    if (!open) return;
    showService.getAllInterfaces().then((res) => setAvailableInterfaces(res.interfaces)).catch(() => {});
    if (existing) {
      populateForm(existing);
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing]);

  const lockedName = lockedIdentity(existing, (i) => i.name, name);

  const validateCreate = (): string | null => {
    if (!name.trim()) return t("modal.errors.nameRequired");
    if (!/^vxlan\d+$/.test(name.trim())) return t("modal.errors.nameFormat");
    if (existingInterfaces.includes(name.trim())) return t("modal.errors.nameExists", { name });
    return null;
  };

  const submitCreate = async () => {
    const config: Parameters<typeof vxlanService.createInterface>[0] = {
      name: name.trim(),
    };

    if (vni.trim()) config.vni = vni.trim();
    if (description.trim()) config.description = description.trim();
    if (sourceAddress.trim()) config.source_address = sourceAddress.trim();
    if (sourceInterface.trim()) config.source_interface = sourceInterface.trim();
    if (group.trim()) config.group = group.trim();
    if (port.trim()) config.port = port.trim();
    if (mtu.trim()) config.mtu = mtu.trim();
    if (mac.trim()) config.mac = mac.trim();
    if (vrf.trim()) config.vrf = vrf.trim();
    if (redirect.trim()) config.redirect = redirect.trim();
    if (disabled) config.disabled = true;
    if (gpe) config.gpe = true;

    if (addresses.trim()) {
      config.addresses = addresses.split(",").map((a) => a.trim()).filter(Boolean);
    }
    if (remotes.trim()) {
      config.remotes = remotes.split(",").map((r) => r.trim()).filter(Boolean);
    }

    const effectiveIpDf = ipDf === "__none__" ? "" : ipDf;
    const params: NonNullable<typeof config.parameters> = {};
    if (external) params.external = true;
    if (nolearning) params.nolearning = true;
    if (neighborSuppress) params.neighbor_suppress = true;
    if (vniFilter) params.vni_filter = true;
    if (effectiveIpDf.trim()) params.ip_df = effectiveIpDf.trim();
    if (ipTos.trim()) params.ip_tos = ipTos.trim();
    if (ipTtl.trim()) params.ip_ttl = ipTtl.trim();
    if (ipv6Flowlabel.trim()) params.ipv6_flowlabel = ipv6Flowlabel.trim();
    if (Object.keys(params).length > 0) config.parameters = params;

    const mirror: NonNullable<typeof config.mirror> = {};
    if (mirrorIngress.trim()) mirror.ingress = mirrorIngress.trim();
    if (mirrorEgress.trim()) mirror.egress = mirrorEgress.trim();
    if (Object.keys(mirror).length > 0) config.mirror = mirror;

    const validMappings = vlanToVni.filter((m) => m.vlan_id.trim());
    if (validMappings.length > 0) {
      config.vlan_to_vni = validMappings.map((m) => ({
        vlan_id: m.vlan_id.trim(),
        vni: m.vni.trim() || "",
        description: m.description.trim() || undefined,
      }));
    }

    return vxlanService.createInterface(config);
  };

  const submitUpdate = async (current: VxlanInterface, targetName: string) => {
    const parseList = (val: string) => val.split(",").map((s) => s.trim()).filter(Boolean);

    const updated: Parameters<typeof vxlanService.updateInterface>[2] = {};

    if (vni.trim() !== (current.vni || "")) updated.vni = vni.trim() || null;
    if (description.trim() !== (current.description || "")) updated.description = description.trim() || null;
    if (sourceAddress.trim() !== (current.source_address || "")) updated.source_address = sourceAddress.trim() || null;
    if (sourceInterface.trim() !== (current.source_interface || "")) updated.source_interface = sourceInterface.trim() || null;
    if (group.trim() !== (current.group || "")) updated.group = group.trim() || null;
    if (port.trim() !== (current.port || "")) updated.port = port.trim() || null;
    if (mtu.trim() !== (current.mtu || "")) updated.mtu = mtu.trim() || null;
    if (mac.trim() !== (current.mac || "")) updated.mac = mac.trim() || null;
    if (vrf.trim() !== (current.vrf || "")) updated.vrf = vrf.trim() || null;
    if (redirect.trim() !== (current.redirect || "")) updated.redirect = redirect.trim() || null;

    if (disabled !== current.disabled) updated.disabled = disabled;
    if (gpe !== current.gpe) updated.gpe = gpe;

    const newAddresses = parseList(addresses);
    if (JSON.stringify(newAddresses) !== JSON.stringify(current.addresses)) {
      updated.addresses = newAddresses;
    }
    const newRemotes = parseList(remotes);
    if (JSON.stringify(newRemotes) !== JSON.stringify(current.remotes)) {
      updated.remotes = newRemotes;
    }

    const cp = current.parameters;
    const paramChanges: NonNullable<typeof updated.parameters> = {};
    if (external !== cp.external) paramChanges.external = external;
    if (nolearning !== cp.nolearning) paramChanges.nolearning = nolearning;
    if (neighborSuppress !== cp.neighbor_suppress) paramChanges.neighbor_suppress = neighborSuppress;
    if (vniFilter !== cp.vni_filter) paramChanges.vni_filter = vniFilter;
    const effectiveIpDf = ipDf === "__none__" ? "" : ipDf;
    if (effectiveIpDf.trim() !== (cp.ip.df || "")) paramChanges.ip_df = effectiveIpDf.trim() || null;
    if (ipTos.trim() !== (cp.ip.tos || "")) paramChanges.ip_tos = ipTos.trim() || null;
    if (ipTtl.trim() !== (cp.ip.ttl || "")) paramChanges.ip_ttl = ipTtl.trim() || null;
    if (ipv6Flowlabel.trim() !== (cp.ipv6.flowlabel || "")) paramChanges.ipv6_flowlabel = ipv6Flowlabel.trim() || null;
    if (Object.keys(paramChanges).length > 0) updated.parameters = paramChanges;

    const mirrorChanges: NonNullable<typeof updated.mirror> = {};
    if (mirrorIngress.trim() !== (current.mirror.ingress || "")) mirrorChanges.ingress = mirrorIngress.trim() || null;
    if (mirrorEgress.trim() !== (current.mirror.egress || "")) mirrorChanges.egress = mirrorEgress.trim() || null;
    if (Object.keys(mirrorChanges).length > 0) updated.mirror = mirrorChanges;

    const validMappings = vlanToVni.filter((m) => m.vlan_id.trim());
    const currentMappings = current.vlan_to_vni.map((m) => ({
      vlan_id: m.vlan_id,
      vni: m.vni || "",
      description: m.description || "",
    }));
    if (JSON.stringify(validMappings) !== JSON.stringify(currentMappings)) {
      updated.vlan_to_vni = validMappings.map((m) => ({
        vlan_id: m.vlan_id.trim(),
        vni: m.vni.trim() || null,
        description: m.description.trim() || null,
      }));
    }

    return vxlanService.updateInterface(targetName, current, updated);
  };

  const handleSubmit = async () => {
    const write = modalWriteKind(existing);

    if (write.kind === "create") {
      const validationError = validateCreate();
      if (validationError) {
        setError(validationError);
        return;
      }
    } else if (!existing) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result =
        write.kind === "update" && existing
          ? await submitUpdate(existing, write.name)
          : await submitCreate();

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || (isEdit ? t("modal.errors.updateFailed") : t("modal.errors.createFailed")));
      }
    } catch (err) {
      setError(
        (err as ApiError).message ||
          (isEdit ? t("modal.errors.updateFailed") : t("modal.errors.createFailed")),
      );
    } finally {
      setLoading(false);
    }
  };

  const addVlanMapping = () => {
    setVlanToVni([...vlanToVni, { vlan_id: "", vni: "", description: "" }]);
  };

  const removeVlanMapping = (index: number) => {
    setVlanToVni(vlanToVni.filter((_, i) => i !== index));
  };

  const updateVlanMapping = (index: number, field: keyof VlanToVniRow, value: string) => {
    const updated = [...vlanToVni];
    updated[index] = { ...updated[index], [field]: value };
    setVlanToVni(updated);
  };

  const supportsVlanDescription = capabilities?.features.vlan_to_vni_description?.supported ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            {isEdit ? t("modal.editTitle", { name: existing.name }) : t("modal.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("modal.editDescription")
              : t("modal.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">{t("modal.tabs.basic")}</TabsTrigger>
            <TabsTrigger value="advanced">{t("modal.tabs.advanced")}</TabsTrigger>
            <TabsTrigger value="vlan-vni">VLAN-to-VNI</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vxlan-name">{t("modal.basic.interfaceName")}</Label>
                <Input
                  id="vxlan-name"
                  value={lockedName.value}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="vxlan0"
                  disabled={lockedName.disabled}
                  className={lockedName.disabled ? "bg-muted" : undefined}
                />
                <p className="text-xs text-muted-foreground">
                  {lockedName.disabled ? t("modal.basic.nameLocked") : t("modal.basic.nameFormatHint")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vxlan-vni">VNI</Label>
                <Input id="vxlan-vni" value={vni} onChange={(e) => setVni(e.target.value)} placeholder="0-16777214" />
                <p className="text-xs text-muted-foreground">{t("modal.basic.vniHint")}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vxlan-description">{tc("description")}</Label>
              <Input id="vxlan-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("modal.basic.descriptionPlaceholder")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vxlan-sourceAddress">{t("modal.basic.sourceAddress")}</Label>
                <Input id="vxlan-sourceAddress" value={sourceAddress} onChange={(e) => setSourceAddress(e.target.value)} placeholder="192.168.1.1" />
                <p className="text-xs text-muted-foreground">{t("modal.basic.sourceAddressHint")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vxlan-sourceInterface">{t("modal.basic.sourceInterface")}</Label>
                <InterfaceSelect
                  value={sourceInterface || "__none__"}
                  onValueChange={(v) => setSourceInterface(v === "__none__" ? "" : v)}
                  interfaces={availableInterfaces}
                  noneOption={{ label: tc("none"), value: "__none__" }}
                  placeholder={t("modal.selectInterface")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vxlan-remotes">{t("modal.basic.remoteAddresses")}</Label>
              <Input id="vxlan-remotes" value={remotes} onChange={(e) => setRemotes(e.target.value)} placeholder="10.0.0.2, 10.0.0.3" />
              <p className="text-xs text-muted-foreground">{t("modal.basic.remoteAddressesHint")}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vxlan-group">{t("modal.basic.multicastGroup")}</Label>
                <Input id="vxlan-group" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="239.1.1.1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vxlan-port">{t("modal.basic.udpPort")}</Label>
                <Input id="vxlan-port" value={port} onChange={(e) => setPort(e.target.value)} placeholder="4789" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vxlan-addresses">{t("modal.basic.ipAddresses")}</Label>
              <Input id="vxlan-addresses" value={addresses} onChange={(e) => setAddresses(e.target.value)} placeholder="10.10.10.1/24, fd00::1/64" />
              <p className="text-xs text-muted-foreground">{t("modal.basic.ipAddressesHint")}</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vxlan-mtu">MTU</Label>
                <Input id="vxlan-mtu" value={mtu} onChange={(e) => setMtu(e.target.value)} placeholder="1500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vxlan-mac">{t("modal.basic.macAddress")}</Label>
                <Input id="vxlan-mac" value={mac} onChange={(e) => setMac(e.target.value)} placeholder="00:11:22:33:44:55" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vxlan-vrf">VRF</Label>
                <VrfSelect id="vxlan-vrf" value={vrf} onValueChange={setVrf} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("modal.advanced.tunnelParameters")}</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="vxlan-external" checked={external} onCheckedChange={(c) => setExternal(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="vxlan-external" className="cursor-pointer text-sm">{t("modal.advanced.external")}</Label>
                    <p className="text-xs text-muted-foreground">{t("modal.advanced.externalHint")}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="vxlan-nolearning" checked={nolearning} onCheckedChange={(c) => setNolearning(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="vxlan-nolearning" className="cursor-pointer text-sm">{t("modal.advanced.noLearning")}</Label>
                    <p className="text-xs text-muted-foreground">{t("modal.advanced.noLearningHint")}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="vxlan-neighborSuppress" checked={neighborSuppress} onCheckedChange={(c) => setNeighborSuppress(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="vxlan-neighborSuppress" className="cursor-pointer text-sm">{t("modal.advanced.neighborSuppress")}</Label>
                    <p className="text-xs text-muted-foreground">{t("modal.advanced.neighborSuppressHint")}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="vxlan-vniFilter" checked={vniFilter} onCheckedChange={(c) => setVniFilter(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="vxlan-vniFilter" className="cursor-pointer text-sm">{t("modal.advanced.vniFilter")}</Label>
                    <p className="text-xs text-muted-foreground">{t("modal.advanced.vniFilterHint")}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="vxlan-gpe" checked={gpe} onCheckedChange={(c) => setGpe(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="vxlan-gpe" className="cursor-pointer text-sm">GPE</Label>
                    <p className="text-xs text-muted-foreground">{t("modal.advanced.gpeHint")}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 rounded-lg border p-3">
                  <Checkbox id="vxlan-disabled" checked={disabled} onCheckedChange={(c) => setDisabled(c === true)} />
                  <div className="flex-1">
                    <Label htmlFor="vxlan-disabled" className="cursor-pointer text-sm">{tc("disabled")}</Label>
                    <p className="text-xs text-muted-foreground">{t("modal.advanced.disabledHint")}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("modal.advanced.ipParameters")}</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vxlan-ipDf" className="text-xs">{t("modal.advanced.dontFragment")}</Label>
                  <Select value={ipDf || "__none__"} onValueChange={setIpDf}>
                    <SelectTrigger><SelectValue placeholder={tc("default")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{tc("default")}</SelectItem>
                      <SelectItem value="set">{t("modal.advanced.dfSet")}</SelectItem>
                      <SelectItem value="unset">{t("modal.advanced.dfUnset")}</SelectItem>
                      <SelectItem value="inherit">{t("modal.advanced.dfInherit")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vxlan-ipTos" className="text-xs">{t("modal.advanced.typeOfService")}</Label>
                  <Input id="vxlan-ipTos" value={ipTos} onChange={(e) => setIpTos(e.target.value)} placeholder={t("modal.advanced.tosPlaceholder")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vxlan-ipTtl" className="text-xs">TTL</Label>
                  <Input id="vxlan-ipTtl" value={ipTtl} onChange={(e) => setIpTtl(e.target.value)} placeholder="0-255" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("modal.advanced.ipv6Parameters")}</Label>
              <div className="space-y-2">
                <Label htmlFor="vxlan-ipv6Flowlabel" className="text-xs">{t("modal.advanced.flowLabel")}</Label>
                <Input id="vxlan-ipv6Flowlabel" value={ipv6Flowlabel} onChange={(e) => setIpv6Flowlabel(e.target.value)} placeholder="0x0-0xfffff" />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("modal.advanced.mirror")}</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vxlan-mirrorIngress" className="text-xs">{t("modal.advanced.ingressInterface")}</Label>
                  <InterfaceSelect
                    value={mirrorIngress || "__none__"}
                    onValueChange={(v) => setMirrorIngress(v === "__none__" ? "" : v)}
                    interfaces={availableInterfaces}
                    noneOption={{ label: tc("none"), value: "__none__" }}
                    placeholder={t("modal.selectInterface")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vxlan-mirrorEgress" className="text-xs">{t("modal.advanced.egressInterface")}</Label>
                  <InterfaceSelect
                    value={mirrorEgress || "__none__"}
                    onValueChange={(v) => setMirrorEgress(v === "__none__" ? "" : v)}
                    interfaces={availableInterfaces}
                    noneOption={{ label: tc("none"), value: "__none__" }}
                    placeholder={t("modal.selectInterface")}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vxlan-redirect">{t("modal.advanced.redirectInterface")}</Label>
              <InterfaceSelect
                value={redirect || "__none__"}
                onValueChange={(v) => setRedirect(v === "__none__" ? "" : v)}
                interfaces={availableInterfaces}
                noneOption={{ label: tc("none"), value: "__none__" }}
                placeholder={t("modal.selectInterface")}
              />
              <p className="text-xs text-muted-foreground">{t("modal.advanced.redirectHint")}</p>
            </div>
          </TabsContent>

          <TabsContent value="vlan-vni" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">{t("modal.vlanVni.title")}</Label>
                  <p className="text-xs text-muted-foreground mt-1">{t("modal.vlanVni.description")}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addVlanMapping} className="gap-1">
                  <Plus className="h-3 w-3" /> {t("modal.vlanVni.addMapping")}
                </Button>
              </div>

              {vlanToVni.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-sm text-muted-foreground">{t("modal.vlanVni.empty")}</p>
                  <Button type="button" variant="outline" size="sm" onClick={addVlanMapping} className="mt-3 gap-1">
                    <Plus className="h-3 w-3" /> {t("modal.vlanVni.addFirstMapping")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {vlanToVni.map((mapping, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-lg border p-3">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">VLAN ID</Label>
                          <Input
                            value={mapping.vlan_id}
                            onChange={(e) => updateVlanMapping(index, "vlan_id", e.target.value)}
                            placeholder="1-4094"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">VNI</Label>
                          <Input
                            value={mapping.vni}
                            onChange={(e) => updateVlanMapping(index, "vni", e.target.value)}
                            placeholder="0-16777214"
                          />
                        </div>
                      </div>
                      {supportsVlanDescription && (
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">{tc("description")}</Label>
                          <Input
                            value={mapping.description}
                            onChange={(e) => updateVlanMapping(index, "description", e.target.value)}
                            placeholder={tc("optional")}
                          />
                        </div>
                      )}
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeVlanMapping(index)} className="shrink-0 mt-5">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? tc("saving") : t("modal.creating")}
              </>
            ) : (
              isEdit ? t("modal.saveChanges") : t("modal.createInterface")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
