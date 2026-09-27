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
import type { OspfArea } from "@/lib/api/ospf";
import { useTranslations } from "next-intl";

interface OspfAreaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (area: OspfArea) => Promise<void>;
  existingArea?: OspfArea | null;
  accessListNames?: string[];
}

export function OspfAreaModal({
  open,
  onOpenChange,
  onSubmit,
  existingArea,
  accessListNames = [],
}: OspfAreaModalProps) {
  const t = useTranslations("ospf");
  const tc = useTranslations("common");
  const isEditMode = !!existingArea;

  const [areaId, setAreaId] = useState("");
  const [areaType, setAreaType] = useState("");
  const [noSummary, setNoSummary] = useState(false);
  const [defaultCost, setDefaultCost] = useState("");
  const [networks, setNetworks] = useState<string[]>([]);
  const [newNetwork, setNewNetwork] = useState("");
  const [authentication, setAuthentication] = useState("");
  const [shortcut, setShortcut] = useState("");
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
        setNetworks([...existingArea.networks]);
        setAuthentication(existingArea.authentication || "");
        setShortcut(existingArea.shortcut || "");
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
    setNetworks([]);
    setNewNetwork("");
    setAuthentication("");
    setShortcut("");
    setExportList("");
    setImportList("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const addNetwork = () => {
    const net = newNetwork.trim();
    if (!net) return;
    if (networks.includes(net)) {
      setError(t("areaModal.networkExists"));
      return;
    }
    setNetworks([...networks, net]);
    setNewNetwork("");
    setError(null);
  };

  const removeNetwork = (idx: number) => {
    setNetworks(networks.filter((_, i) => i !== idx));
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
      const area: OspfArea = {
        area_id: areaId.trim(),
        area_type: areaType || null,
        area_type_no_summary: noSummary,
        area_type_default_cost: defaultCost.trim() ? parseInt(defaultCost.trim(), 10) : null,
        networks,
        ranges: existingArea?.ranges || [],
        authentication: authentication || null,
        shortcut: shortcut || null,
        export_list: exportList.trim() || null,
        import_list: importList.trim() || null,
        virtual_links: existingArea?.virtual_links || [],
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
              <Label htmlFor="ospf-area-id">{t("fields.areaId")}</Label>
              <Input
                id="ospf-area-id"
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
              <Label htmlFor="ospf-area-type">{t("areaModal.areaType")}</Label>
              <Select value={areaType} onValueChange={setAreaType}>
                <SelectTrigger id="ospf-area-type">
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
                    id="ospf-area-no-summary"
                    checked={noSummary}
                    onCheckedChange={(checked) => setNoSummary(checked === true)}
                  />
                  <Label htmlFor="ospf-area-no-summary" className="cursor-pointer">
                    {areaType === "stub" ? t("areaModal.noSummaryStub") : t("areaModal.noSummaryNssa")}
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ospf-area-default-cost">{t("areaModal.defaultCost")}</Label>
                  <Input
                    id="ospf-area-default-cost"
                    type="number"
                    value={defaultCost}
                    onChange={(e) => setDefaultCost(e.target.value)}
                    placeholder={t("areaModal.defaultCostPlaceholder")}
                    min={0}
                  />
                </div>
              </div>
            )}

            {/* Networks */}
            <div className="space-y-2">
              <Label>{t("fields.networks")}</Label>
              <div className="flex gap-2">
                <Input
                  value={newNetwork}
                  onChange={(e) => setNewNetwork(e.target.value)}
                  placeholder={t("areaModal.networkPlaceholder")}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNetwork())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addNetwork}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {networks.length > 0 && (
                <div className="space-y-1 mt-2">
                  {networks.map((net, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-md border px-3 py-1.5">
                      <span className="text-sm font-mono">{net}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeNetwork(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {t("areaModal.networksHelp")}
              </p>
            </div>

            {/* Authentication */}
            <div className="space-y-2">
              <Label htmlFor="ospf-area-auth">{t("fields.authentication")}</Label>
              <Select value={authentication} onValueChange={setAuthentication}>
                <SelectTrigger id="ospf-area-auth">
                  <SelectValue placeholder={tc("none")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tc("none")}</SelectItem>
                  <SelectItem value="plaintext-password">{t("fields.plaintextPassword")}</SelectItem>
                  <SelectItem value="md5">MD5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Shortcut */}
            <div className="space-y-2">
              <Label htmlFor="ospf-area-shortcut">{t("areaModal.shortcut")}</Label>
              <Select value={shortcut} onValueChange={setShortcut}>
                <SelectTrigger id="ospf-area-shortcut">
                  <SelectValue placeholder={tc("default")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{tc("default")}</SelectItem>
                  <SelectItem value="enable">{t("areaModal.enable")}</SelectItem>
                  <SelectItem value="disable">{t("areaModal.disable")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export/Import Lists */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ospf-area-export">{t("areaModal.exportList")}</Label>
                <Select
                  value={exportList}
                  onValueChange={(v) => setExportList(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger id="ospf-area-export">
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
                <Label htmlFor="ospf-area-import">{t("areaModal.importList")}</Label>
                <Select
                  value={importList}
                  onValueChange={(v) => setImportList(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger id="ospf-area-import">
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
            <p className="text-sm text-destructive">{error}</p>
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
