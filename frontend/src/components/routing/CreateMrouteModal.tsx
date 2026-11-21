"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { staticRoutesService, type MulticastRoute } from "@/lib/api/static-routes";
import {
  DISTANCE_RANGE,
  emptyMrouteTarget,
  mrouteFields,
  mrouteProblem,
  type MrouteFeatures,
  type MrouteFields,
  type MrouteProblem,
  type MrouteTargetFields,
} from "@/lib/api/static-routes-save-ops";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { lockedIdentity, modalIsEdit } from "@/lib/modal-mode";
import type { ApiError } from "@/lib/types/api";

interface CreateMrouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existing?: MulticastRoute | null;
  features: MrouteFeatures;
  /** Prefixes the device already has. */
  configured: string[];
}

type TargetList = "nextHops" | "interfaces";

export function CreateMrouteModal({
  open,
  onOpenChange,
  onSuccess,
  existing,
  features,
  configured,
}: CreateMrouteModalProps) {
  const t = useTranslations("routingExtras");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const initial = useMemo(() => mrouteFields(existing), [existing]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [draft, setDraft] = useState<MrouteFields>(initial);

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
      .then((response) => {
        if (live) setAvailableInterfaces(response.interfaces);
      })
      .catch(() => {
        if (live) setAvailableInterfaces([]);
      });
    return () => {
      live = false;
    };
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  const lockedPrefix = lockedIdentity(existing, (route) => route.prefix, draft.prefix);

  const addTarget = (list: TargetList) =>
    setDraft((d) => ({ ...d, [list]: [...d[list], emptyMrouteTarget()] }));
  const removeTarget = (list: TargetList, index: number) =>
    setDraft((d) => ({ ...d, [list]: d[list].filter((_, i) => i !== index) }));
  const updateTarget = (list: TargetList, index: number, fields: Partial<MrouteTargetFields>) =>
    setDraft((d) => ({ ...d, [list]: d[list].map((row, i) => (i === index ? { ...row, ...fields } : row)) }));

  const problemMessage = (problem: MrouteProblem): string => {
    switch (problem.key) {
      case "range":
        return problem.name
          ? t("mrouteModal.distanceRangeNamed", { min: problem.min, max: problem.max, name: problem.name })
          : t("mrouteModal.distanceRange", { min: problem.min, max: problem.max });
      case "mrouteExists":
      case "nextHopAddressInvalid":
      case "nextHopDuplicate":
      case "interfaceDuplicate":
        return t(`mrouteModal.${problem.key}`, { name: problem.name });
      case "prefixRequired":
        return t("mrouteModal.prefixRequired");
      case "prefixInvalid":
        return t("mrouteModal.invalidPrefix");
      case "targetRequired":
        return t("mrouteModal.nextHopOrInterfaceRequired");
      default:
        return t(`mrouteModal.${problem.key}`);
    }
  };

  const handleSubmit = async () => {
    const problem = mrouteProblem(isEdit ? initial : null, draft, configured, features);
    if (problem) {
      setError(problemMessage(problem));
      return;
    }
    const failed = isEdit ? t("mrouteModal.updateFailed") : t("mrouteModal.createFailed");
    setError(null);
    setLoading(true);
    try {
      const result = await staticRoutesService.saveMroute(isEdit ? existing : null, draft, features);
      if (result && !result.success) {
        setError(result.error || failed);
        return;
      }
      if (result) onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || failed);
    } finally {
      setLoading(false);
    }
  };

  const disableToggle = (list: TargetList, index: number, row: MrouteTargetFields) =>
    features.mroute && (
      <div className="flex items-center gap-2">
        <Checkbox
          id={`${list}-disable-${index}`}
          checked={row.disable}
          onCheckedChange={(checked) => updateTarget(list, index, { disable: checked === true })}
        />
        <Label htmlFor={`${list}-disable-${index}`} className="text-sm">{t("shared.disable")}</Label>
      </div>
    );

  const distanceInput = (list: TargetList, index: number, row: MrouteTargetFields) => (
    <Input
      placeholder={t("shared.distance")}
      type="number"
      min={DISTANCE_RANGE.min}
      max={DISTANCE_RANGE.max}
      value={row.distance}
      onChange={(e) => updateTarget(list, index, { distance: e.target.value })}
      className="w-24"
    />
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("mrouteModal.editTitle") : t("mrouteModal.title")}</DialogTitle>
          <DialogDescription>
            {isEdit ? t("mrouteModal.editDescription", { prefix: existing.prefix }) : t("mrouteModal.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="prefix">{t("mrouteModal.prefixCidr")}</Label>
            <Input
              id="prefix"
              placeholder="224.0.0.0/4"
              value={lockedPrefix.value}
              disabled={lockedPrefix.disabled}
              className={lockedPrefix.disabled ? "bg-muted" : undefined}
              onChange={(e) => setDraft((d) => ({ ...d, prefix: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("shared.nextHops")}</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => addTarget("nextHops")}>
                <Plus className="h-4 w-4 mr-1" />
                {tc("add")}
              </Button>
            </div>
            {draft.nextHops.map((nh, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder={t("shared.nextHopAddress")}
                    value={nh.name}
                    onChange={(e) => updateTarget("nextHops", index, { name: e.target.value })}
                    className="flex-1"
                  />
                  {distanceInput("nextHops", index, nh)}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={tc("delete")}
                    onClick={() => removeTarget("nextHops", index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {disableToggle("nextHops", index, nh)}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("shared.interfaces")}</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => addTarget("interfaces")}>
                <Plus className="h-4 w-4 mr-1" />
                {tc("add")}
              </Button>
            </div>
            {draft.interfaces.map((iface, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <InterfaceSelect
                    value={iface.name}
                    onValueChange={(value) => updateTarget("interfaces", index, { name: value })}
                    interfaces={availableInterfaces}
                    className="flex-1"
                    placeholder={t("shared.selectInterface")}
                  />
                  {distanceInput("interfaces", index, iface)}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={tc("delete")}
                    onClick={() => removeTarget("interfaces", index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {disableToggle("interfaces", index, iface)}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? tc("saveChanges") : t("shared.createRoute")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
