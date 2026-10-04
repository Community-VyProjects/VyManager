"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { VrfSelect } from "@/components/ui/vrf-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { staticRoutesService, type StaticRoute, type StaticRoutesCapabilities } from "@/lib/api/static-routes";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  emptyInterfaceDraft,
  emptyNextHopDraft,
  emptyStaticRouteDraft,
  staticRouteDraftFrom,
  submitStaticRouteCreate,
  submitStaticRouteUpdate,
  validateStaticRouteCreate,
  validateStaticRouteEdit,
  type StaticRouteDraft,
} from "./static-routes-form";

interface StaticRouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  routeType: "ipv4" | "ipv6";
  existing?: StaticRoute | null;
}

export function StaticRouteModal({
  open,
  onOpenChange,
  onSuccess,
  routeType,
  existing,
}: StaticRouteModalProps) {
  const t = useTranslations("staticRoutes");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<StaticRoutesCapabilities | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [draft, setDraft] = useState<StaticRouteDraft>(emptyStaticRouteDraft(routeType));

  useEffect(() => {
    if (!open) return;
    staticRoutesService.getCapabilities().then(setCapabilities).catch((err) => {
      console.error("Failed to load capabilities:", err);
    });
    showService.getAllInterfaces().then((res) => setAvailableInterfaces(res.interfaces)).catch((err) => {
      console.error("Failed to load interfaces:", err);
    });
    if (existing) {
      setDraft(staticRouteDraftFrom(existing));
    } else {
      setDraft(emptyStaticRouteDraft(routeType));
    }
    setError(null);
  }, [open, existing, routeType]);

  const patch = (fields: Partial<StaticRouteDraft>) => setDraft((d) => ({ ...d, ...fields }));
  const effectiveType = isEdit ? existing.route_type : routeType;
  const lockedDestination = lockedIdentity(existing, (r) => r.destination, draft.destination);

  const handleSubmit = async () => {
    const validationError = isEdit
      ? validateStaticRouteEdit(draft)
      : validateStaticRouteCreate(draft);
    if (validationError) {
      setError(t(`validation.${validationError}`));
      return;
    }

    const write = modalWriteKind(existing ? { name: existing.destination } : null);
    setLoading(true);
    setError(null);
    const dhcpSupported = capabilities?.features.dhcp_interface.supported ?? false;

    try {
      const result =
        write.kind === "update" && existing
          ? await submitStaticRouteUpdate(existing, draft, dhcpSupported)
          : await submitStaticRouteCreate({ ...draft, routeType: effectiveType }, dhcpSupported);

      if (result && result.success === false) {
        setError(result.error || tc("operationFailed"));
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEdit ? t("modal.updateFailed") : t("modal.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  const addNextHop = () => patch({ nextHops: [...draft.nextHops, emptyNextHopDraft()] });
  const removeNextHop = (index: number) => patch({ nextHops: draft.nextHops.filter((_, i) => i !== index) });
  const updateNextHop = <K extends keyof StaticRouteDraft["nextHops"][number]>(
    index: number,
    field: K,
    value: StaticRouteDraft["nextHops"][number][K],
  ) => {
    const nextHops = [...draft.nextHops];
    nextHops[index] = { ...nextHops[index], [field]: value };
    patch({ nextHops });
  };

  const addInterface = () => patch({ interfaces: [...draft.interfaces, emptyInterfaceDraft()] });
  const removeInterface = (index: number) => patch({ interfaces: draft.interfaces.filter((_, i) => i !== index) });
  const updateInterface = <K extends keyof StaticRouteDraft["interfaces"][number]>(
    index: number,
    field: K,
    value: StaticRouteDraft["interfaces"][number][K],
  ) => {
    const interfaces = [...draft.interfaces];
    interfaces[index] = { ...interfaces[index], [field]: value };
    patch({ interfaces });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("modal.editTitle") : t("modal.createTitle", { type: effectiveType.toUpperCase() })}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("modal.editDescription", { destination: existing.destination })
              : t("modal.createDescription", { family: effectiveType === "ipv4" ? "IPv4" : "IPv6" })}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">{t("modal.tabs.basic")}</TabsTrigger>
            <TabsTrigger value="routing">{t("modal.tabs.routing")}</TabsTrigger>
            <TabsTrigger value="advanced">{t("modal.tabs.advanced")}</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="destination">
                {t("modal.destinationNetwork")} {isEdit ? null : <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="destination"
                placeholder={t("modal.example", { value: effectiveType === "ipv4" ? "10.0.0.0/24" : "2001:db8::/32" })}
                value={lockedDestination.value}
                disabled={lockedDestination.disabled}
                className={lockedDestination.disabled ? "bg-muted" : undefined}
                onChange={(e) => patch({ destination: e.target.value })}
              />
              {isEdit ? (
                <p className="text-xs text-muted-foreground">
                  {t("modal.destinationLocked")}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">{t("modal.cidrHint")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{tc("description")}</Label>
              <Textarea
                id="description"
                placeholder={t("modal.descriptionPlaceholder")}
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
                rows={2}
              />
            </div>
          </TabsContent>

          <TabsContent value="routing" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t("modal.nextHops")}</Label>
                <Button type="button" variant="outline" size="sm" onClick={addNextHop}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("modal.addNextHop")}
                </Button>
              </div>

              {draft.nextHops.length > 0 ? (
                draft.nextHops.map((nh, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t("modal.nextHopN", { n: index + 1 })}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeNextHop(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>
                          {t("modal.address")} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          placeholder={t("modal.example", { value: effectiveType === "ipv4" ? "192.168.1.1" : "2001:db8::1" })}
                          value={nh.address}
                          onChange={(e) => updateNextHop(index, "address", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("modal.distanceMetric")}</Label>
                        <Input
                          type="number"
                          placeholder={t("modal.defaultOne")}
                          value={nh.distance}
                          onChange={(e) => updateNextHop(index, "distance", e.target.value)}
                        />
                      </div>
                    </div>

                    {capabilities?.features.next_hop_vrf.supported && (
                      <div className="space-y-2">
                        <Label>VRF</Label>
                        <VrfSelect
                          value={nh.vrf}
                          onValueChange={(v) => updateNextHop(index, "vrf", v)}
                          extraOptions={[{ label: tc("default"), value: "default" }]}
                        />
                      </div>
                    )}

                    {capabilities?.features.next_hop_bfd.supported && (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`bfd-enable-${index}`}
                            checked={nh.bfd_enable}
                            onCheckedChange={(checked) => updateNextHop(index, "bfd_enable", checked === true)}
                          />
                          <Label htmlFor={`bfd-enable-${index}`}>{t("modal.enableBfd")}</Label>
                        </div>
                        {nh.bfd_enable && (
                          <div className="space-y-2 ml-6">
                            <Label>{t("modal.bfdProfile")}</Label>
                            <Input
                              placeholder={t("modal.bfdProfilePlaceholder")}
                              value={nh.bfd_profile}
                              onChange={(e) => updateNextHop(index, "bfd_profile", e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`nh-disable-${index}`}
                        checked={nh.disable}
                        onCheckedChange={(checked) => updateNextHop(index, "disable", checked === true)}
                      />
                      <Label htmlFor={`nh-disable-${index}`}>{t("modal.disableNextHop")}</Label>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("modal.noNextHops")}
                </p>
              )}
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t("modal.interfaceRoutes")}</Label>
                <Button type="button" variant="outline" size="sm" onClick={addInterface}>
                  <Plus className="h-4 w-4 mr-2" />
                  {tc("addInterface")}
                </Button>
              </div>

              {draft.interfaces.length > 0 ? (
                draft.interfaces.map((iface, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t("modal.interfaceN", { n: index + 1 })}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeInterface(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>
                          {t("modal.interface")} <span className="text-destructive">*</span>
                        </Label>
                        <InterfaceSelect
                          value={iface.interface}
                          onValueChange={(value) => updateInterface(index, "interface", value)}
                          interfaces={availableInterfaces}
                          placeholder={tc("selectInterface")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("modal.distanceMetric")}</Label>
                        <Input
                          type="number"
                          placeholder={t("modal.defaultOne")}
                          value={iface.distance}
                          onChange={(e) => updateInterface(index, "distance", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`iface-disable-${index}`}
                        checked={iface.disable}
                        onCheckedChange={(checked) => updateInterface(index, "disable", checked === true)}
                      />
                      <Label htmlFor={`iface-disable-${index}`}>{t("modal.disableInterface")}</Label>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("modal.noInterfaces")}
                </p>
              )}
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="blackhole"
                  checked={draft.isBlackhole}
                  onCheckedChange={(checked) =>
                    patch({ isBlackhole: checked === true, isReject: checked === true ? false : draft.isReject })
                  }
                />
                <Label htmlFor="blackhole" className="text-base font-semibold cursor-pointer">
                  {t("modal.blackholeRoute")}
                </Label>
              </div>
              {draft.isBlackhole && (
                <div className="ml-6 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t("modal.blackholeHelp")}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{t("modal.distanceMetric")}</Label>
                      <Input
                        type="number"
                        placeholder={t("modal.defaultOne")}
                        value={draft.blackholeDistance}
                        onChange={(e) => patch({ blackholeDistance: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("modal.tag")}</Label>
                      <Input
                        type="number"
                        placeholder={tc("optional")}
                        value={draft.blackholeTag}
                        onChange={(e) => patch({ blackholeTag: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reject"
                  checked={draft.isReject}
                  onCheckedChange={(checked) =>
                    patch({ isReject: checked === true, isBlackhole: checked === true ? false : draft.isBlackhole })
                  }
                />
                <Label htmlFor="reject" className="text-base font-semibold cursor-pointer">
                  {t("modal.rejectRoute")}
                </Label>
              </div>
              {draft.isReject && (
                <div className="ml-6 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t("modal.rejectHelp")}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{t("modal.distanceMetric")}</Label>
                      <Input
                        type="number"
                        placeholder={t("modal.defaultOne")}
                        value={draft.rejectDistance}
                        onChange={(e) => patch({ rejectDistance: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("modal.tag")}</Label>
                      <Input
                        type="number"
                        placeholder={tc("optional")}
                        value={draft.rejectTag}
                        onChange={(e) => patch({ rejectTag: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            {capabilities?.features.dhcp_interface.supported && (
              <div className="space-y-2">
                <Label htmlFor="dhcp-interface">{t("modal.dhcpInterface")}</Label>
                <InterfaceSelect
                  id="dhcp-interface"
                  value={draft.dhcpInterface || "__none__"}
                  onValueChange={(v) => patch({ dhcpInterface: v === "__none__" ? "" : v })}
                  interfaces={availableInterfaces}
                  noneOption={{ label: tc("none"), value: "__none__" }}
                  placeholder={tc("selectInterface")}
                />
                <p className="text-xs text-muted-foreground">
                  {t("modal.dhcpHelp")}
                </p>
              </div>
            )}

            {!capabilities?.features.dhcp_interface.supported && (
              <div className="bg-muted/50 border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  {t("modal.noAdvanced")}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (isEdit ? t("modal.updating") : tc("creating")) : isEdit ? t("modal.updateRoute") : t("modal.createRoute")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
