"use client";

import { NONE_SENTINEL } from "@/lib/named-list-select-options";
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
import { NamedListSelect } from "@/components/ui/named-list-select";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import type { Ospfv3Area, Ospfv3AreaRange, Ospfv3Capabilities } from "@/lib/api/ospfv3";
import {
  ospfv3AreaProblem,
  ospfv3ProblemArgs,
  ospfv3RangeMode,
  type Ospfv3RangeMode,
} from "@/lib/api/ospfv3-save-ops";
import type { ApiError } from "@/lib/types/api";
import { useTranslations } from "next-intl";

interface Ospfv3AreaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (area: Ospfv3Area) => Promise<void>;
  existingArea?: Ospfv3Area | null;
  existingAreaIds: string[];
  accessListNames?: string[];
  capabilities?: Ospfv3Capabilities | null;
}

interface RangeRow {
  prefix: string;
  mode: Ospfv3RangeMode;
}

function toRange(row: RangeRow): Ospfv3AreaRange {
  return { prefix: row.prefix, advertise: row.mode === "advertise", not_advertise: row.mode === "not-advertise" };
}

export function Ospfv3AreaModal({
  open,
  onOpenChange,
  onSubmit,
  existingArea,
  existingAreaIds,
  accessListNames = [],
  capabilities,
}: Ospfv3AreaModalProps) {
  const t = useTranslations("ospfv3");
  const tc = useTranslations("common");
  const isEditMode = !!existingArea;

  const [areaId, setAreaId] = useState("");
  const [areaType, setAreaType] = useState("");
  const [noSummary, setNoSummary] = useState(false);
  const [nssaDefaultOriginate, setNssaDefaultOriginate] = useState(false);
  const [ranges, setRanges] = useState<RangeRow[]>([]);
  const [newRangePrefix, setNewRangePrefix] = useState("");
  const [newRangeMode, setNewRangeMode] = useState<Ospfv3RangeMode>("advertise");
  const [exportList, setExportList] = useState("");
  const [importList, setImportList] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const areaTypes = capabilities?.features?.areas?.area_types || [];

  useEffect(() => {
    if (!open) return;
    const src = existingArea;
    setAreaId(src?.area_id ?? "");
    setAreaType(src?.area_type ?? "");
    setNoSummary(src?.area_type_no_summary ?? false);
    setNssaDefaultOriginate(src?.nssa_default_information_originate ?? false);
    setRanges((src?.ranges || []).map((r) => ({ prefix: r.prefix, mode: ospfv3RangeMode(r) })));
    setExportList(src?.export_list ?? "");
    setImportList(src?.import_list ?? "");
    setNewRangePrefix("");
    setNewRangeMode("advertise");
    setError(null);
  }, [open, existingArea]);

  const handleClose = () => onOpenChange(false);

  const handleOpenChange = (next: boolean) => {
    if (!next && !loading) handleClose();
  };

  const addRange = () => {
    const prefix = newRangePrefix.trim();
    if (!prefix) return;
    setRanges([...ranges, { prefix, mode: newRangeMode }]);
    setNewRangePrefix("");
    setNewRangeMode("advertise");
    setError(null);
  };

  const subTyped = areaType === "stub" || areaType === "nssa";

  const buildArea = (): Ospfv3Area => ({
    area_id: areaId.trim(),
    area_type: areaType || null,
    area_type_no_summary: subTyped && noSummary,
    nssa_default_information_originate: areaType === "nssa" && nssaDefaultOriginate,
    ranges: ranges.map(toRange),
    export_list: exportList || null,
    import_list: importList || null,
  });

  const handleSubmit = async () => {
    const area = buildArea();
    const problem = ospfv3AreaProblem(area, capabilities, { existingIds: isEditMode ? [] : existingAreaIds });
    if (problem) {
      setError(t(`validation.${problem.key}`, ospfv3ProblemArgs(problem)));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(area);
      handleClose();
    } catch (err: unknown) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const modeSelect = (id: string, value: Ospfv3RangeMode, onChange: (mode: Ospfv3RangeMode) => void) => (
    <Select value={value || NONE_SENTINEL} onValueChange={(v) => onChange(v === NONE_SENTINEL ? "" : (v as Ospfv3RangeMode))}>
      <SelectTrigger id={id} className="w-36" aria-label={t("fields.ranges")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_SENTINEL}>{tc("default")}</SelectItem>
        <SelectItem value="advertise">{t("areaModal.advertise")}</SelectItem>
        <SelectItem value="not-advertise">{t("areaModal.notAdvertise")}</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="ospfv3-area-type">{t("areaModal.areaType")}</Label>
              <Select value={areaType || NONE_SENTINEL} onValueChange={(v) => setAreaType(v === NONE_SENTINEL ? "" : v)}>
                <SelectTrigger id="ospfv3-area-type">
                  <SelectValue placeholder={t("areaModal.areaTypePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SENTINEL}>{t("areaModal.normal")}</SelectItem>
                  {areaTypes.map((at) => (
                    <SelectItem key={at} value={at}>{at === "stub" ? t("areaModal.stub") : at.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {subTyped && (
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

            <div className="space-y-2">
              <Label htmlFor="ospfv3-area-range">{t("fields.ranges")}</Label>
              <div className="flex gap-2">
                <Input
                  id="ospfv3-area-range"
                  value={newRangePrefix}
                  onChange={(e) => setNewRangePrefix(e.target.value)}
                  placeholder={t("areaModal.rangePlaceholder")}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRange())}
                  className="flex-1"
                />
                {modeSelect("ospfv3-area-range-mode", newRangeMode, setNewRangeMode)}
                <Button type="button" variant="outline" size="icon" onClick={addRange}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {ranges.length > 0 && (
                <div className="space-y-1 mt-2">
                  {ranges.map((range, index) => (
                    <div key={`${range.prefix}-${index}`} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5">
                      <span className="text-sm font-mono flex-1">{range.prefix}</span>
                      {modeSelect(`ospfv3-area-range-mode-${index}`, range.mode, (mode) =>
                        setRanges(ranges.map((r, i) => (i === index ? { ...r, mode } : r))))}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setRanges(ranges.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ospfv3-area-export">{t("fields.exportList")}</Label>
                <NamedListSelect
                  id="ospfv3-area-export"
                  value={exportList}
                  names={accessListNames}
                  onValueChange={setExportList}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ospfv3-area-import">{t("fields.importList")}</Label>
                <NamedListSelect
                  id="ospfv3-area-import"
                  value={importList}
                  names={accessListNames}
                  onValueChange={setImportList}
                />
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
                {isEditMode ? tc("saving") : tc("creating")}
              </>
            ) : isEditMode ? (
              tc("saveChanges")
            ) : (
              t("fields.addArea")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
