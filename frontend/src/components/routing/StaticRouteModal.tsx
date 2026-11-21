"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InterfaceMultiSelect } from "@/components/ui/interface-multi-select";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { Label } from "@/components/ui/label";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VrfSelect } from "@/components/ui/vrf-select";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { bfdService } from "@/lib/api/bfd";
import { showService, type InterfaceName } from "@/lib/api/show";
import { staticRoutesService, type StaticRoute, type VyOSResponse } from "@/lib/api/static-routes";
import {
  DISTANCE_RANGE,
  TAG_RANGE,
  emptyBfdSource,
  emptyInterface,
  emptyNextHop,
  staticRouteFields,
  staticRouteProblem,
  type BfdSourceFields,
  type InterfaceFields,
  type NextHopFields,
  type RouteFamily,
  type StaticRouteFeatures,
  type StaticRouteFields,
  type StaticRouteProblem,
  type StaticRouteScope,
} from "@/lib/api/static-routes-save-ops";
import { vrfService } from "@/lib/api/vrf";
import { lockedIdentity, modalIsEdit } from "@/lib/modal-mode";
import type { ApiError } from "@/lib/types/api";

interface StaticRouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  scope: StaticRouteScope;
  /** Family of a new route; an edit uses the loaded route's family. */
  family: RouteFamily;
  existing?: StaticRoute | null;
  features: StaticRouteFeatures;
  /** Destinations this scope and family already have. */
  configured: string[];
}

function saveRoute(
  scope: StaticRouteScope,
  family: RouteFamily,
  original: StaticRouteFields | null,
  updated: StaticRouteFields,
  features: StaticRouteFeatures,
): Promise<VyOSResponse | null> {
  if (scope.kind === "vrf") {
    return vrfService.saveStaticRoute(scope.vrf, family, original, updated, features);
  }
  const tableId = scope.kind === "table" ? scope.tableId : null;
  return staticRoutesService.saveRoute(tableId, family, original, updated, features);
}

export function StaticRouteModal({
  open,
  onOpenChange,
  onSuccess,
  scope,
  family,
  existing,
  features,
  configured,
}: StaticRouteModalProps) {
  const t = useTranslations("staticRoutes");
  const tr = useTranslations("routingExtras");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const effectiveFamily: RouteFamily = isEdit ? existing.route_type : family;
  const initial = useMemo(() => staticRouteFields(existing), [existing]);

  const [draft, setDraft] = useState<StaticRouteFields>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interfaces, setInterfaces] = useState<InterfaceName[]>([]);
  const [bfdProfiles, setBfdProfiles] = useState<string[]>([]);

  const seedKey = open ? JSON.stringify(initial) : "";
  const [seed, setSeed] = useState(seedKey);
  if (seedKey !== seed) {
    setSeed(seedKey);
    setDraft(initial);
    setError(null);
  }

  useEffect(() => {
    if (!open) return;
    let live = true;
    showService
      .getAllInterfaces()
      .then((res) => {
        if (live) setInterfaces(res.interfaces);
      })
      .catch(() => {
        if (live) setInterfaces([]);
      });
    bfdService
      .getConfig()
      .then((bfd) => {
        if (live) setBfdProfiles(bfd.profiles.map((profile) => profile.name));
      })
      .catch(() => {
        if (live) setBfdProfiles([]);
      });
    return () => {
      live = false;
    };
  }, [open]);

  // A save in flight keeps the modal open so its result is shown.
  const handleOpenChange = (next: boolean) => {
    if (!next && saving) return;
    onOpenChange(next);
  };

  const patch = (fields: Partial<StaticRouteFields>) => setDraft((d) => ({ ...d, ...fields }));
  const lockedDestination = lockedIdentity(existing, (r) => r.destination, draft.destination);
  const segments = effectiveFamily === "ipv6" || features.ipv4Segments;

  const updateNextHop = (index: number, fields: Partial<NextHopFields>) =>
    patch({ nextHops: draft.nextHops.map((nh, i) => (i === index ? { ...nh, ...fields } : nh)) });
  const updateSource = (index: number, srcIndex: number, fields: Partial<BfdSourceFields>) =>
    updateNextHop(index, {
      sources: draft.nextHops[index].sources.map((src, i) => (i === srcIndex ? { ...src, ...fields } : src)),
    });
  const updateInterface = (index: number, fields: Partial<InterfaceFields>) =>
    patch({ interfaces: draft.interfaces.map((row, i) => (i === index ? { ...row, ...fields } : row)) });

  const problemMessage = (problem: StaticRouteProblem): string => {
    switch (problem.key) {
      case "range":
        if (problem.field === "tag") return t("validation.rangeTag", { min: problem.min, max: problem.max });
        return problem.name
          ? tr("validation.distanceRangeNamed", { min: problem.min, max: problem.max, name: problem.name })
          : tr("validation.distanceRange", { min: problem.min, max: problem.max });
      case "descriptionTooLong":
        return tr("validation.descriptionTooLong", { max: problem.max });
      case "nextHopAddressRequired":
        return tr("validation.nextHopAddressRequired");
      case "nextHopDuplicate":
      case "interfaceDuplicate":
        return tr(`validation.${problem.key}`, { name: problem.name });
      case "destinationExists":
      case "nextHopAddressInvalid":
      case "sourceRequired":
      case "sourceInvalid":
      case "sourceDuplicate":
        return t(`validation.${problem.key}`, { name: problem.name });
      default:
        return t(`validation.${problem.key}`);
    }
  };

  const handleSubmit = async () => {
    const problem = staticRouteProblem(isEdit ? initial : null, draft, effectiveFamily, configured, features);
    if (problem) {
      setError(problemMessage(problem));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await saveRoute(scope, effectiveFamily, isEdit ? initial : null, draft, features);
      if (result && !result.success) {
        setError(result.error || (isEdit ? t("modal.updateFailed") : t("modal.createFailed")));
        return;
      }
      if (result) onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || (isEdit ? t("modal.updateFailed") : t("modal.createFailed")));
    } finally {
      setSaving(false);
    }
  };

  const type = effectiveFamily === "ipv4" ? t("family.ipv4") : t("family.ipv6");
  const title = (() => {
    if (scope.kind === "table") {
      return isEdit
        ? t("modal.editTitleTable", { id: String(scope.tableId) })
        : t("modal.createTitleTable", { type, id: String(scope.tableId) });
    }
    if (scope.kind === "vrf") {
      return isEdit ? t("modal.editTitleVrf", { vrf: scope.vrf }) : t("modal.createTitleVrf", { type, vrf: scope.vrf });
    }
    return isEdit ? t("modal.editTitle") : t("modal.createTitle", { type });
  })();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("modal.editDescription", { destination: existing.destination })
              : t("modal.createDescription", { family: type })}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">{t("modal.tabs.basic")}</TabsTrigger>
            <TabsTrigger value="routing">{t("modal.tabs.routing")}</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="destination">
                {t("modal.destinationNetwork")} {isEdit ? null : <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="destination"
                placeholder={t("modal.example", { value: effectiveFamily === "ipv4" ? "10.0.0.0/24" : "2001:db8::/32" })}
                value={lockedDestination.value}
                disabled={lockedDestination.disabled}
                className={lockedDestination.disabled ? "bg-muted" : undefined}
                onChange={(e) => patch({ destination: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{tc("description")}</Label>
              <Input
                id="description"
                placeholder={t("modal.descriptionPlaceholder")}
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </div>

            {effectiveFamily === "ipv4" && (
              <div className="space-y-2">
                <Label htmlFor="dhcp-interfaces">{t("modal.dhcpInterfaces")}</Label>
                {features.dhcpInterfaceMulti ? (
                  <InterfaceMultiSelect
                    id="dhcp-interfaces"
                    values={draft.dhcpInterfaces}
                    onChange={(values) => patch({ dhcpInterfaces: values })}
                    interfaces={interfaces}
                  />
                ) : (
                  <InterfaceSelect
                    id="dhcp-interfaces"
                    value={draft.dhcpInterfaces[0] ?? ""}
                    onValueChange={(value) => patch({ dhcpInterfaces: value ? [value] : [] })}
                    interfaces={interfaces}
                    noneOption={{ label: tc("none"), value: "" }}
                    placeholder={tc("none")}
                  />
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="routing" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t("modal.nextHops")}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => patch({ nextHops: [...draft.nextHops, emptyNextHop()] })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("modal.addNextHop")}
                </Button>
              </div>

              {draft.nextHops.length > 0 ? (
                draft.nextHops.map((nh, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t("modal.nextHopN", { n: index + 1 })}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={tc("delete")}
                        onClick={() => patch({ nextHops: draft.nextHops.filter((_, i) => i !== index) })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>
                          {t("modal.address")} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          placeholder={t("modal.example", { value: effectiveFamily === "ipv4" ? "192.168.1.1" : "2001:db8::1" })}
                          value={nh.address}
                          onChange={(e) => updateNextHop(index, { address: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("modal.distanceMetric")}</Label>
                        <Input
                          type="number"
                          min={DISTANCE_RANGE.min}
                          max={DISTANCE_RANGE.max}
                          placeholder={t("modal.defaultOne")}
                          value={nh.distance}
                          onChange={(e) => updateNextHop(index, { distance: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("modal.nextHopInterface")}</Label>
                        <InterfaceSelect
                          value={nh.interface}
                          onValueChange={(value) => updateNextHop(index, { interface: value })}
                          interfaces={interfaces}
                          noneOption={{ label: tc("none"), value: "" }}
                          placeholder={tc("none")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("modal.vrf")}</Label>
                        <VrfSelect
                          value={nh.vrf}
                          onValueChange={(value) => updateNextHop(index, { vrf: value })}
                          extraOptions={[{ label: tc("default"), value: "default" }]}
                        />
                      </div>
                      {segments && (
                        <div className="space-y-2 col-span-2">
                          <Label>{t("modal.segments")}</Label>
                          <Input
                            className="font-mono"
                            value={nh.segments}
                            onChange={(e) => updateNextHop(index, { segments: e.target.value })}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`nh-disable-${index}`}
                        checked={nh.disable}
                        onCheckedChange={(checked) => updateNextHop(index, { disable: checked === true })}
                      />
                      <Label htmlFor={`nh-disable-${index}`}>{t("modal.disableNextHop")}</Label>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`bfd-enable-${index}`}
                          checked={nh.bfd}
                          onCheckedChange={(checked) => updateNextHop(index, { bfd: checked === true })}
                        />
                        <Label htmlFor={`bfd-enable-${index}`}>{t("modal.enableBfd")}</Label>
                      </div>
                      <div className="ml-6 grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>{t("modal.bfdProfile")}</Label>
                          <NamedListSelect
                            value={nh.bfdProfile}
                            names={bfdProfiles}
                            onValueChange={(value) => updateNextHop(index, { bfdProfile: value })}
                            disabled={!nh.bfd}
                          />
                        </div>
                        <div className="flex items-end space-x-2 pb-2">
                          <Checkbox
                            id={`bfd-multi-hop-${index}`}
                            checked={nh.multiHop}
                            disabled={!nh.bfd}
                            onCheckedChange={(checked) => updateNextHop(index, { multiHop: checked === true })}
                          />
                          <Label htmlFor={`bfd-multi-hop-${index}`}>{t("modal.multiHop")}</Label>
                        </div>
                      </div>
                      {features.bfdSourceProfile ? (
                        <div className="ml-6 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>{t("modal.multiHopSources")}</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!nh.bfd || !nh.multiHop}
                              onClick={() => updateNextHop(index, { sources: [...nh.sources, emptyBfdSource()] })}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {t("modal.addSource")}
                            </Button>
                          </div>
                          {nh.sources.map((src, srcIndex) => (
                            <div key={srcIndex} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                              <div className="space-y-2">
                                <Label>{t("modal.multiHopSource")}</Label>
                                <Input
                                  className="font-mono"
                                  value={src.address}
                                  disabled={!nh.bfd || !nh.multiHop}
                                  onChange={(e) => updateSource(index, srcIndex, { address: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t("modal.multiHopSourceProfile")}</Label>
                                <NamedListSelect
                                  value={src.profile}
                                  names={bfdProfiles}
                                  onValueChange={(value) => updateSource(index, srcIndex, { profile: value })}
                                  disabled={!nh.bfd || !nh.multiHop}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                aria-label={tc("delete")}
                                disabled={!nh.bfd || !nh.multiHop}
                                onClick={() =>
                                  updateNextHop(index, { sources: nh.sources.filter((_, i) => i !== srcIndex) })
                                }
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="ml-6 space-y-2">
                          <Label>{t("modal.multiHopSource")}</Label>
                          <Input
                            className="font-mono"
                            value={nh.sources[0]?.address ?? ""}
                            disabled={!nh.bfd || !nh.multiHop}
                            onChange={(e) =>
                              updateNextHop(index, {
                                sources: e.target.value ? [{ address: e.target.value, profile: "" }] : [],
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">{t("modal.noNextHops")}</p>
              )}
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t("modal.interfaceRoutes")}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => patch({ interfaces: [...draft.interfaces, emptyInterface()] })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {tc("addInterface")}
                </Button>
              </div>

              {draft.interfaces.length > 0 ? (
                draft.interfaces.map((row, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t("modal.interfaceN", { n: index + 1 })}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={tc("delete")}
                        onClick={() => patch({ interfaces: draft.interfaces.filter((_, i) => i !== index) })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>
                          {t("modal.interface")} <span className="text-destructive">*</span>
                        </Label>
                        <InterfaceSelect
                          value={row.interface}
                          onValueChange={(value) => updateInterface(index, { interface: value })}
                          interfaces={interfaces}
                          placeholder={tc("selectInterface")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("modal.distanceMetric")}</Label>
                        <Input
                          type="number"
                          min={DISTANCE_RANGE.min}
                          max={DISTANCE_RANGE.max}
                          placeholder={t("modal.defaultOne")}
                          value={row.distance}
                          onChange={(e) => updateInterface(index, { distance: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("modal.vrf")}</Label>
                        <VrfSelect
                          value={row.vrf}
                          onValueChange={(value) => updateInterface(index, { vrf: value })}
                          extraOptions={[{ label: tc("default"), value: "default" }]}
                        />
                      </div>
                      {segments && (
                        <div className="space-y-2">
                          <Label>{t("modal.segments")}</Label>
                          <Input
                            className="font-mono"
                            value={row.segments}
                            onChange={(e) => updateInterface(index, { segments: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`iface-disable-${index}`}
                        checked={row.disable}
                        onCheckedChange={(checked) => updateInterface(index, { disable: checked === true })}
                      />
                      <Label htmlFor={`iface-disable-${index}`}>{t("modal.disableInterface")}</Label>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">{t("modal.noInterfaces")}</p>
              )}
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="blackhole"
                  checked={draft.blackhole}
                  onCheckedChange={(checked) =>
                    patch({ blackhole: checked === true, reject: checked === true ? false : draft.reject })
                  }
                />
                <Label htmlFor="blackhole" className="text-base font-semibold cursor-pointer">
                  {t("modal.blackholeRoute")}
                </Label>
              </div>
              <div className="ml-6 grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("modal.distanceMetric")}</Label>
                  <Input
                    type="number"
                    min={DISTANCE_RANGE.min}
                    max={DISTANCE_RANGE.max}
                    placeholder={t("modal.defaultOne")}
                    value={draft.blackholeDistance}
                    disabled={!draft.blackhole}
                    onChange={(e) => patch({ blackholeDistance: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("modal.tag")}</Label>
                  <Input
                    type="number"
                    min={TAG_RANGE.min}
                    max={TAG_RANGE.max}
                    placeholder={tc("optional")}
                    value={draft.blackholeTag}
                    disabled={!draft.blackhole}
                    onChange={(e) => patch({ blackholeTag: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reject"
                  checked={draft.reject}
                  onCheckedChange={(checked) =>
                    patch({ reject: checked === true, blackhole: checked === true ? false : draft.blackhole })
                  }
                />
                <Label htmlFor="reject" className="text-base font-semibold cursor-pointer">
                  {t("modal.rejectRoute")}
                </Label>
              </div>
              <div className="ml-6 grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("modal.distanceMetric")}</Label>
                  <Input
                    type="number"
                    min={DISTANCE_RANGE.min}
                    max={DISTANCE_RANGE.max}
                    placeholder={t("modal.defaultOne")}
                    value={draft.rejectDistance}
                    disabled={!draft.reject}
                    onChange={(e) => patch({ rejectDistance: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("modal.tag")}</Label>
                  <Input
                    type="number"
                    min={TAG_RANGE.min}
                    max={TAG_RANGE.max}
                    placeholder={tc("optional")}
                    value={draft.rejectTag}
                    disabled={!draft.reject}
                    onChange={(e) => patch({ rejectTag: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (isEdit ? t("modal.updating") : tc("creating")) : isEdit ? t("modal.updateRoute") : t("modal.createRoute")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
