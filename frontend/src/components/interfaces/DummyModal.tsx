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
import { Box, Loader2 } from "lucide-react";
import { dummyService, type DummyInterface, type DummyCapabilities } from "@/lib/api/dummy";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { ApiError } from "@/lib/types/api";

interface DummyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: DummyCapabilities | null;
  existingInterfaces: string[];
  existing?: DummyInterface | null;
}

export function DummyModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
  existingInterfaces,
  existing,
}: DummyModalProps) {
  const t = useTranslations("dummy");
  const tc = useTranslations("common");
  const isEdit = !!existing;
  // Basic
  const [name, setName] = useState("dum0");
  const [description, setDescription] = useState("");
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");
  const [disabled, setDisabled] = useState(false);

  // Addresses
  const [addresses, setAddresses] = useState("");
  const [ipv6AddressEui64, setIpv6AddressEui64] = useState("");
  const [ipv6AddressNoDefaultLinkLocal, setIpv6AddressNoDefaultLinkLocal] = useState(false);

  // Advanced
  const [ipDisableForwarding, setIpDisableForwarding] = useState(false);
  const [ipSourceValidation, setIpSourceValidation] = useState("");
  const [ipv6DisableForwarding, setIpv6DisableForwarding] = useState(false);
  const [mirrorIngress, setMirrorIngress] = useState("");
  const [mirrorEgress, setMirrorEgress] = useState("");
  const [redirect, setRedirect] = useState("");
  const [mac, setMac] = useState("");
  const [netns, setNetns] = useState("");

  // Available interfaces for dropdowns
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getNextInterfaceName = (): string => {
    let i = 0;
    while (existingInterfaces.includes(`dum${i}`)) {
      i++;
    }
    return `dum${i}`;
  };

  const resetForm = () => {
    setName(getNextInterfaceName());
    setDescription("");
    setMtu("");
    setVrf("");
    setDisabled(false);
    setAddresses("");
    setIpv6AddressEui64("");
    setIpv6AddressNoDefaultLinkLocal(false);
    setIpDisableForwarding(false);
    setIpSourceValidation("");
    setIpv6DisableForwarding(false);
    setMirrorIngress("");
    setMirrorEgress("");
    setRedirect("");
    setMac("");
    setNetns("");
    setError(null);
  };

  const populateForm = (interfaceData: DummyInterface) => {
    setName(interfaceData.name);
    setDescription(interfaceData.description ?? "");
    setMtu(interfaceData.mtu ?? "");
    setVrf(interfaceData.vrf ?? "");
    setDisabled(interfaceData.disable ?? false);
    setAddresses(interfaceData.addresses.join("\n"));
    setIpv6AddressEui64(interfaceData.ipv6_address_eui64.join("\n"));
    setIpv6AddressNoDefaultLinkLocal(interfaceData.ipv6_address_no_default_link_local ?? false);
    setIpDisableForwarding(interfaceData.ip_disable_forwarding ?? false);
    setIpSourceValidation(interfaceData.ip_source_validation ?? "");
    setIpv6DisableForwarding(interfaceData.ipv6_disable_forwarding ?? false);
    setMirrorIngress(interfaceData.mirror_ingress ?? "");
    setMirrorEgress(interfaceData.mirror_egress ?? "");
    setRedirect(interfaceData.redirect ?? "");
    setMac(interfaceData.mac ?? "");
    setNetns(interfaceData.netns ?? "");
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

  const validateMtu = (): string | null => {
    if (mtu.trim()) {
      const mtuNum = parseInt(mtu.trim(), 10);
      if (isNaN(mtuNum) || mtuNum < 68 || mtuNum > 16000) {
        return t("modal.errors.mtuRange");
      }
    }
    return null;
  };

  const validateForm = (): string | null => {
    if (!name.trim()) return tc("interfaceNameRequired");
    if (!/^dum\d+$/.test(name)) return t("modal.errors.namePattern");
    if (existingInterfaces.includes(name)) return t("modal.errors.nameExists", { name });
    return validateMtu();
  };

  const submitUpdate = async () => {
    if (!existing) return;

    const validationError = validateMtu();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const addrList = addresses.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);
      const eui64List = ipv6AddressEui64.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);

      const result = await dummyService.updateInterface(existing.name, existing, {
        description: description.trim() || null,
        addresses: addrList,
        mtu: mtu.trim() || null,
        vrf: vrf.trim() || null,
        disabled,
        ip_disable_forwarding: ipDisableForwarding,
        ip_source_validation: ipSourceValidation || null,
        ipv6_disable_forwarding: ipv6DisableForwarding,
        ipv6_address_eui64: eui64List,
        ipv6_address_no_default_link_local: ipv6AddressNoDefaultLinkLocal,
        mirror_ingress: mirrorIngress.trim() || null,
        mirror_egress: mirrorEgress.trim() || null,
        redirect: redirect.trim() || null,
        mac: mac.trim() || null,
        netns: netns.trim() || null,
      });

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("modal.errors.updateFailed"));
      }
    } catch (err) {
      const msg = (err as ApiError).message;
      setError(typeof msg === "string" ? msg : JSON.stringify(msg, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (isEdit) {
      await submitUpdate();
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const addrList = addresses.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);
      const eui64List = ipv6AddressEui64.split(/[\n,]/).map((a) => a.trim()).filter(Boolean);

      const config: Parameters<typeof dummyService.createInterface>[0] = {
        name,
      };

      if (description.trim()) config.description = description.trim();
      if (addrList.length > 0) config.addresses = addrList;
      if (mtu.trim()) config.mtu = mtu.trim();
      if (vrf.trim()) config.vrf = vrf.trim();
      if (disabled) config.disabled = true;
      if (ipDisableForwarding) config.ip_disable_forwarding = true;
      if (ipSourceValidation) config.ip_source_validation = ipSourceValidation;
      if (ipv6DisableForwarding) config.ipv6_disable_forwarding = true;
      if (eui64List.length > 0) config.ipv6_address_eui64 = eui64List;
      if (ipv6AddressNoDefaultLinkLocal) config.ipv6_address_no_default_link_local = true;
      if (mirrorIngress.trim()) config.mirror_ingress = mirrorIngress.trim();
      if (mirrorEgress.trim()) config.mirror_egress = mirrorEgress.trim();
      if (redirect.trim()) config.redirect = redirect.trim();
      if (mac.trim()) config.mac = mac.trim();
      if (netns.trim()) config.netns = netns.trim();

      const result = await dummyService.createInterface(config);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("modal.errors.createFailed"));
      }
    } catch (err) {
      const msg = (err as ApiError).message;
      setError(typeof msg === "string" ? msg : JSON.stringify(msg, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const showHardwareSection =
    capabilities?.features.mac?.supported || capabilities?.features.netns?.supported;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" />
            {isEdit ? t("modal.editTitle") : t("modal.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? (
              <>
                {t.rich("modal.editingInterface", {
                  name: existing.name,
                  code: (chunks) => (
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
                      {chunks}
                    </code>
                  ),
                })}
              </>
            ) : (
              t("modal.createDescription")
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">{t("modal.tabs.basic")}</TabsTrigger>
            <TabsTrigger value="addresses">{t("modal.tabs.addresses")}</TabsTrigger>
            <TabsTrigger value="advanced">{t("modal.tabs.advanced")}</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("modal.interfaceName")} {isEdit ? null : <span className="text-destructive">*</span>}</Label>
              <Input
                id="name"
                value={isEdit ? existing.name : name}
                onChange={(e) => setName(e.target.value)}
                placeholder="dum0"
                disabled={isEdit}
              />
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? t("modal.nameImmutable")
                  : t("modal.namePatternHint")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{tc("description")}</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={tc("optionalDescription")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mtu">MTU</Label>
              <Input
                id="mtu"
                value={mtu}
                onChange={(e) => setMtu(e.target.value)}
                placeholder="1500"
              />
              <p className="text-xs text-muted-foreground">{t("modal.mtuHint")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vrf">VRF</Label>
              <VrfSelect
                id="vrf"
                value={vrf}
                onValueChange={setVrf}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={disabled} onCheckedChange={(c) => setDisabled(c === true)} id="disabled" />
              <Label htmlFor="disabled" className="font-normal">{t("modal.disableInterface")}</Label>
            </div>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="addresses">{t("modal.ipAddresses")}</Label>
              <Textarea
                id="addresses"
                value={addresses}
                onChange={(e) => setAddresses(e.target.value)}
                placeholder={"10.0.0.1/32\n192.168.1.1/24"}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">{t("modal.addressesHint")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eui64">{t("modal.eui64Prefixes")}</Label>
              <Textarea
                id="eui64"
                value={ipv6AddressEui64}
                onChange={(e) => setIpv6AddressEui64(e.target.value)}
                placeholder={"2001:db8::/64"}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">{t("modal.eui64Hint")}</p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="noDefaultLinkLocal"
                checked={ipv6AddressNoDefaultLinkLocal}
                onCheckedChange={(c) => setIpv6AddressNoDefaultLinkLocal(c === true)}
              />
              <Label htmlFor="noDefaultLinkLocal" className="font-normal">{t("modal.noDefaultLinkLocal")}</Label>
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            {/* IP Settings */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">{t("modal.ipSettings")}</h4>
              <div className="flex items-center gap-2">
                <Checkbox id="ipDisableForwarding" checked={ipDisableForwarding} onCheckedChange={(c) => setIpDisableForwarding(c === true)} />
                <Label htmlFor="ipDisableForwarding" className="font-normal">{t("modal.disableIpv4Forwarding")}</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sourceValidation">{t("modal.sourceValidation")}</Label>
                <Select value={ipSourceValidation || "none"} onValueChange={(v) => setIpSourceValidation(v === "none" ? "" : v)}>
                  <SelectTrigger id="sourceValidation">
                    <SelectValue placeholder={tc("none")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tc("none")}</SelectItem>
                    <SelectItem value="strict">{t("modal.sourceValidationStrict")}</SelectItem>
                    <SelectItem value="loose">{t("modal.sourceValidationLoose")}</SelectItem>
                    <SelectItem value="disable">{t("modal.sourceValidationDisable")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* IPv6 Settings */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">{t("modal.ipv6Settings")}</h4>
              <div className="flex items-center gap-2">
                <Checkbox id="ipv6DisableForwarding" checked={ipv6DisableForwarding} onCheckedChange={(c) => setIpv6DisableForwarding(c === true)} />
                <Label htmlFor="ipv6DisableForwarding" className="font-normal">{t("modal.disableIpv6Forwarding")}</Label>
              </div>
            </div>

            {/* Traffic Mirroring */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">{t("modal.trafficMirroring")}</h4>
              <div className="space-y-2">
                <Label>{t("modal.mirrorIngress")}</Label>
                <InterfaceSelect
                  value={mirrorIngress || "none"}
                  onValueChange={(v) => setMirrorIngress(v === "none" ? "" : v)}
                  interfaces={availableInterfaces}
                  noneOption={{ label: tc("none"), value: "none" }}
                  placeholder={tc("none")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("modal.mirrorEgress")}</Label>
                <InterfaceSelect
                  value={mirrorEgress || "none"}
                  onValueChange={(v) => setMirrorEgress(v === "none" ? "" : v)}
                  interfaces={availableInterfaces}
                  noneOption={{ label: tc("none"), value: "none" }}
                  placeholder={tc("none")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("modal.redirectTo")}</Label>
                <InterfaceSelect
                  value={redirect || "none"}
                  onValueChange={(v) => setRedirect(v === "none" ? "" : v)}
                  interfaces={availableInterfaces}
                  noneOption={{ label: tc("none"), value: "none" }}
                  placeholder={tc("none")}
                />
              </div>
            </div>

            {/* Hardware (capability-gated) */}
            {showHardwareSection && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">{t("modal.hardware")}</h4>
                {capabilities?.features.mac?.supported && (
                  <div className="space-y-2">
                    <Label htmlFor="mac">{t("modal.macAddress")}</Label>
                    <Input
                      id="mac"
                      value={mac}
                      onChange={(e) => setMac(e.target.value)}
                      placeholder="xx:xx:xx:xx:xx:xx"
                    />
                  </div>
                )}
                {capabilities?.features.netns?.supported && (
                  <div className="space-y-2">
                    <Label htmlFor="netns">{t("modal.networkNamespace")}</Label>
                    <Input
                      id="netns"
                      value={netns}
                      onChange={(e) => setNetns(e.target.value)}
                      placeholder={t("modal.namespacePlaceholder")}
                    />
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 mt-4">
            <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
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
