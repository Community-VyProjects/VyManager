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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import type { Ospfv3Area, Ospfv3AreaRange } from "@/lib/api/ospfv3";
import { useTranslations } from "next-intl";

interface Ospfv3AreaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (area: Ospfv3Area) => Promise<void>;
  existingArea?: Ospfv3Area | null;
  accessListNames?: string[];
}

export function Ospfv3AreaModal({
  open,
  onOpenChange,
  onSubmit,
  existingArea,
  accessListNames = [],
}: Ospfv3AreaModalProps) {
  const t = useTranslations("ospfv3");
  const tc = useTranslations("common");
  const isEditMode = !!existingArea;

  const [areaId, setAreaId] = useState("");
  const [areaType, setAreaType] = useState("");
  const [noSummary, setNoSummary] = useState(false);
  const [defaultCost, setDefaultCost] = useState("");
  const [nssaDefaultOriginate, setNssaDefaultOriginate] = useState(false);
  const [ranges, setRanges] = useState<Ospfv3AreaRange[]>([]);
  const [newRangePrefix, setNewRangePrefix] = useState("");
  const [newRangeAdvertise, setNewRangeAdvertise] = useState(true);
  const [exportList, setExportList] = useState("");
  const [importList, setImportList] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingArea) {
        setAreaId(existingArea.area_id);
        setAreaType(existingArea.area_type || "");
        setNoSummary(existingArea.area_type_no_summary);
        setDefaultCost(existingArea.area_type_default_cost != null ? String(existingArea.area_type_default_cost) : "");
        setNssaDefaultOriginate(existingArea.nssa_default_information_originate);
        setRanges([...existingArea.ranges]);
        setExportList(existingArea.export_list || "");
        setImportList(existingArea.import_list || "");
      } else {
        resetForm();
      }
    }
  }, [open, existingArea]);

  const resetForm = () => {
    setAreaId("");
    setAreaType("");
    setNoSummary(false);
    setDefaultCost("");
    setNssaDefaultOriginate(false);
    setRanges([]);
    setNewRangePrefix("");
    setNewRangeAdvertise(true);
    setExportList("");
    setImportList("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const addRange = () => {
    const prefix = newRangePrefix.trim();
    if (!prefix) return;
    if (ranges.some(r => r.prefix === prefix)) {
      setError(t("areaModal.rangeExists"));
      return;
    }
    setRanges([...ranges, {
      prefix,
      advertise: newRangeAdvertise,
      not_advertise: !newRangeAdvertise,
    }]);
    setNewRangePrefix("");
    setNewRangeAdvertise(true);
    setError(null);
  };

  const removeRange = (idx: number) => {
    setRanges(ranges.filter((_, i) => i !== idx));
  };

  const validateForm = (): string | null => {
    if (!areaId.trim()) return t("areaModal.areaIdRequired");
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const area: Ospfv3Area = {
        area_id: areaId.trim(),
        area_type: areaType || null,
        area_type_no_summary: noSummary,
        area_type_default_cost: defaultCost.trim() ? parseInt(defaultCost.trim(), 10) : null,
        nssa_default_information_originate: areaType === "nssa" ? nssaDefaultOriginate : false,
        ranges,
        export_list: exportList.trim() || null,
        import_list: importList.trim() || null,
      };

      await onSubmit(area);
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tc("operationFailed");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const showStubNssaOptions = areaType === "stub" || areaType === "nssa";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("areaModal.titleEdit") : t("areaModal.titleAdd")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("areaModal.descriptionEdit", { areaId: existingArea?.area_id ?? "" })
              : t("areaModal.descriptionAdd")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 pb-2">
            {/* Area ID */}
            <div className="space-y-2">
              <Label htmlFor="ospfv3-area-id">{t("fields.areaId")}</Label>
              <Input
                id="ospfv3-area-id"
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                placeholder={t("areaModal.areaIdPlaceholder")}
                disabled={isEditMode}
                className={isEditMode ? "bg-muted" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {t("areaModal.areaIdHelp")}
              </p>
            </div>

            {/* Area Type */}
            <div className="space-y-2">
              <Label htmlFor="ospfv3-area-type">{t("areaModal.areaType")}</Label>
              <Select value={areaType} onValueChange={setAreaType}>
                <SelectTrigger id="ospfv3-area-type">
                  <SelectValue placeholder={t("areaModal.areaTypePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">{t("areaModal.normal")}</SelectItem>
                  <SelectItem value="stub">{t("areaModal.stub")}</SelectItem>
                  <SelectItem value="nssa">NSSA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stub/NSSA options */}
            {showStubNssaOptions && (
              <div className="space-y-3 pl-4 border-l-2 border-muted">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="ospfv3-area-no-summary"
                    checked={noSummary}
                    onCheckedChange={(checked) => setNoSummary(checked === true)}
                  />
                  <Label htmlFor="ospfv3-area-no-summary" className="cursor-pointer">
                    {areaType === "stub" ? t("areaModal.noSummaryStub") : t("areaModal.noSummaryNssa")}
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ospfv3-area-default-cost">{t("areaModal.defaultCost")}</Label>
                  <Input
                    id="ospfv3-area-default-cost"
                    type="number"
                    value={defaultCost}
                    onChange={(e) => setDefaultCost(e.target.value)}
                    placeholder={t("areaModal.defaultCostPlaceholder")}
                    min={0}
                  />
                </div>
                {areaType === "nssa" && (
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="ospfv3-area-nssa-originate"
                      checked={nssaDefaultOriginate}
                      onCheckedChange={(checked) => setNssaDefaultOriginate(checked === true)}
                    />
                    <Label htmlFor="ospfv3-area-nssa-originate" className="cursor-pointer">
                      {t("fields.defaultInformation")}
                    </Label>
                  </div>
                )}
              </div>
            )}

            {/* Ranges */}
            <div className="space-y-2">
              <Label>{t("fields.ranges")}</Label>
              <div className="flex gap-2">
                <Input
                  value={newRangePrefix}
                  onChange={(e) => setNewRangePrefix(e.target.value)}
                  placeholder={t("areaModal.rangePlaceholder")}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRange())}
                  className="flex-1"
                />
                <Select
                  value={newRangeAdvertise ? "advertise" : "not-advertise"}
                  onValueChange={(v) => setNewRangeAdvertise(v === "advertise")}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advertise">{t("areaModal.advertise")}</SelectItem>
                    <SelectItem value="not-advertise">{t("areaModal.notAdvertise")}</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={addRange}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {ranges.length > 0 && (
                <div className="space-y-1 mt-2">
                  {ranges.map((range, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-md border px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{range.prefix}</span>
                        <span className="text-xs text-muted-foreground">
                          ({range.not_advertise ? t("areaModal.notAdvertised") : t("areaModal.advertised")})
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeRange(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {t("areaModal.rangesHelp")}
              </p>
            </div>

            {/* Export/Import Lists */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ospfv3-area-export">{t("fields.exportList")}</Label>
                <Select
                  value={exportList}
                  onValueChange={(v) => setExportList(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger id="ospfv3-area-export">
                    <SelectValue placeholder={tc("none")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{tc("none")}</SelectItem>
                    {accessListNames.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ospfv3-area-import">{t("fields.importList")}</Label>
                <Select
                  value={importList}
                  onValueChange={(v) => setImportList(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger id="ospfv3-area-import">
                    <SelectValue placeholder={tc("none")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{tc("none")}</SelectItem>
                    {accessListNames.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? tc("saving") : t("fields.creating")}
              </>
            ) : isEditMode ? (
              t("fields.saveChanges")
            ) : (
              t("fields.addArea")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
