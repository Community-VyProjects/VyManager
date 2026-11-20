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
import { NamedListSelect } from "@/components/ui/named-list-select";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import type { OspfArea, OspfCapabilities } from "@/lib/api/ospf";
import {
  ospfAreaProblem,
  ospfAuthDraft,
  ospfAuthFromDraft,
  ospfAuthProblem,
  type OspfAuthDraft,
} from "@/lib/api/ospf-save-ops";
import type { ApiError } from "@/lib/types/api";
import { OspfAuthFields } from "./OspfAuthFields";
import { useTranslations } from "next-intl";

const NONE = "__none__";

interface OspfAreaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (area: OspfArea) => Promise<void>;
  existingArea?: OspfArea | null;
  accessListNames?: string[];
  capabilities?: OspfCapabilities | null;
}

interface RangeRow {
  prefix: string;
  cost: string;
  notAdvertise: boolean;
  substitute: string;
}

interface LinkRow {
  address: string;
  deadInterval: string;
  helloInterval: string;
  retransmitInterval: string;
  retransmitWindow: string;
  transmitDelay: string;
  auth: OspfAuthDraft;
}

const toText = (value: number | string | null | undefined) => (value == null ? "" : String(value));
const toInt = (value: string) => (value.trim() ? parseInt(value.trim(), 10) : null);

function emptyLink(): LinkRow {
  return {
    address: "", deadInterval: "", helloInterval: "", retransmitInterval: "",
    retransmitWindow: "", transmitDelay: "", auth: ospfAuthDraft(null),
  };
}

export function OspfAreaModal({
  open,
  onOpenChange,
  onSubmit,
  existingArea,
  accessListNames = [],
  capabilities,
}: OspfAreaModalProps) {
  const t = useTranslations("ospf");
  const tc = useTranslations("common");
  const isEditMode = !!existingArea;
  const areaCaps = capabilities?.features?.areas;
  const linkCaps = capabilities?.features?.virtual_links;
  const showLinkRetransmitWindow = linkCaps?.retransmit_window === true;

  const [areaId, setAreaId] = useState("");
  const [areaType, setAreaType] = useState("");
  const [noSummary, setNoSummary] = useState(false);
  const [defaultCost, setDefaultCost] = useState("");
  const [translate, setTranslate] = useState("");
  const [networks, setNetworks] = useState<string[]>([]);
  const [newNetwork, setNewNetwork] = useState("");
  const [authentication, setAuthentication] = useState("");
  const [shortcut, setShortcut] = useState("");
  const [exportList, setExportList] = useState("");
  const [importList, setImportList] = useState("");
  const [ranges, setRanges] = useState<RangeRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const src = existingArea;
    setAreaId(src?.area_id ?? "");
    setAreaType(src?.area_type ?? "");
    setNoSummary(src?.area_type_no_summary ?? false);
    setDefaultCost(toText(src?.area_type_default_cost));
    setTranslate(src?.area_type_translate ?? "");
    setNetworks([...(src?.networks ?? [])]);
    setNewNetwork("");
    setAuthentication(src?.authentication ?? "");
    setShortcut(src?.shortcut ?? "");
    setExportList(src?.export_list ?? "");
    setImportList(src?.import_list ?? "");
    setRanges((src?.ranges ?? []).map((r) => ({
      prefix: r.prefix, cost: toText(r.cost), notAdvertise: r.not_advertise, substitute: r.substitute ?? "",
    })));
    setLinks((src?.virtual_links ?? []).map((v) => ({
      address: v.address,
      deadInterval: toText(v.dead_interval),
      helloInterval: toText(v.hello_interval),
      retransmitInterval: toText(v.retransmit_interval),
      retransmitWindow: toText(v.retransmit_window),
      transmitDelay: toText(v.transmit_delay),
      auth: ospfAuthDraft(v.authentication),
    })));
    setError(null);
  }, [open, existingArea]);

  const handleClose = () => onOpenChange(false);

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

  const setRange = (idx: number, patch: Partial<RangeRow>) =>
    setRanges(ranges.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const setLink = (idx: number, patch: Partial<LinkRow>) =>
    setLinks(links.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const rangeBlank = (r: RangeRow) => !r.prefix.trim() && !r.cost.trim() && !r.notAdvertise && !r.substitute.trim();
  const linkBlank = (l: LinkRow) =>
    !l.address.trim() && ![l.deadInterval, l.helloInterval, l.retransmitInterval, l.retransmitWindow, l.transmitDelay]
      .some((v) => v.trim()) && l.auth.mode === "";

  const buildArea = (): OspfArea => ({
    area_id: areaId.trim(),
    area_type: areaType || null,
    area_type_no_summary: noSummary,
    area_type_default_cost: toInt(defaultCost),
    area_type_translate: areaType === "nssa" ? translate || null : null,
    networks,
    ranges: ranges.filter((r) => !rangeBlank(r)).map((r) => ({
      prefix: r.prefix.trim(),
      cost: toInt(r.cost),
      not_advertise: r.notAdvertise,
      substitute: r.substitute.trim() || null,
    })),
    authentication: authentication || null,
    shortcut: shortcut || null,
    export_list: exportList || null,
    import_list: importList || null,
    virtual_links: links.filter((l) => !linkBlank(l)).map((l) => ({
      address: l.address.trim(),
      dead_interval: toInt(l.deadInterval),
      hello_interval: toInt(l.helloInterval),
      retransmit_interval: toInt(l.retransmitInterval),
      retransmit_window: showLinkRetransmitWindow ? toInt(l.retransmitWindow) : null,
      transmit_delay: toInt(l.transmitDelay),
      authentication: ospfAuthFromDraft(l.auth),
    })),
  });

  const handleSubmit = async () => {
    if (!areaId.trim()) {
      setError(t("areaModal.areaIdRequired"));
      return;
    }
    const area = buildArea();
    const areaProblem = ospfAreaProblem(area);
    if (areaProblem) {
      setError(t(`areaModal.${areaProblem}`));
      return;
    }
    for (const link of links.filter((l) => !linkBlank(l))) {
      const stored = existingArea?.virtual_links.find((v) => v.address === link.address.trim());
      const authProblem = ospfAuthProblem(stored?.authentication, link.auth);
      if (authProblem) {
        setError(t(`auth.${authProblem}`));
        return;
      }
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

  const showStubNssaOptions = areaType === "stub" || areaType === "nssa";

  const valueSelect = (
    id: string,
    value: string,
    setValue: (v: string) => void,
    values: string[],
    noneLabel: string,
  ) => (
    <Select value={value || NONE} onValueChange={(v) => setValue(v === NONE ? "" : v)}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={noneLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{noneLabel}</SelectItem>
        {values.map((v) => (
          <SelectItem key={v} value={v}>{v}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); }}>
      <DialogContent className="max-w-2xl">
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
              <Label htmlFor="ospf-area-id">{t("fields.areaId")}</Label>
              <Input
                id="ospf-area-id"
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                placeholder={t("areaModal.areaIdPlaceholder")}
                disabled={isEditMode}
                className={isEditMode ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ospf-area-type">{t("areaModal.areaType")}</Label>
              {valueSelect("ospf-area-type", areaType, setAreaType, areaCaps?.area_types || [], tc("default"))}
            </div>

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
                {areaType === "nssa" && (
                  <div className="space-y-2">
                    <Label htmlFor="ospf-area-translate">{t("areaModal.translate")}</Label>
                    {valueSelect("ospf-area-translate", translate, setTranslate, areaCaps?.nssa_translate_values || [], tc("default"))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ospf-area-network">{t("fields.networks")}</Label>
              <div className="flex gap-2">
                <Input
                  id="ospf-area-network"
                  value={newNetwork}
                  onChange={(e) => setNewNetwork(e.target.value)}
                  placeholder={t("areaModal.networkPlaceholder")}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNetwork())}
                />
                <Button type="button" variant="outline" size="icon" onClick={addNetwork} aria-label={tc("add")}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {networks.length > 0 && (
                <div className="space-y-1 mt-2">
                  {networks.map((net) => (
                    <div key={net} className="flex items-center justify-between rounded-md border px-3 py-1.5">
                      <span className="text-sm font-mono">{net}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        aria-label={tc("delete")}
                        onClick={() => setNetworks(networks.filter((item) => item !== net))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("areas.ranges")}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRanges([...ranges, { prefix: "", cost: "", notAdvertise: false, substitute: "" }])}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {tc("add")}
                </Button>
              </div>
              {ranges.map((range, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_6rem_1fr_auto_auto] items-center gap-2">
                  <Input
                    aria-label={t("fields.prefix")}
                    value={range.prefix}
                    onChange={(e) => setRange(idx, { prefix: e.target.value })}
                    placeholder={t("fields.prefix")}
                    className="font-mono"
                  />
                  <Input
                    aria-label={t("fields.cost")}
                    type="number"
                    value={range.cost}
                    onChange={(e) => setRange(idx, { cost: e.target.value })}
                    placeholder={t("fields.cost")}
                  />
                  <Input
                    aria-label={t("areaModal.substitute")}
                    value={range.substitute}
                    onChange={(e) => setRange(idx, { substitute: e.target.value })}
                    placeholder={t("areaModal.substitute")}
                    className="font-mono"
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`ospf-area-range-${idx}-not-advertise`}
                      checked={range.notAdvertise}
                      onCheckedChange={(checked) => setRange(idx, { notAdvertise: checked === true })}
                    />
                    <Label htmlFor={`ospf-area-range-${idx}-not-advertise`} className="text-sm">
                      {t("areaModal.notAdvertise")}
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={tc("delete")}
                    onClick={() => setRanges(ranges.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ospf-area-auth">{t("fields.authentication")}</Label>
              {valueSelect("ospf-area-auth", authentication, setAuthentication, areaCaps?.authentication_values || [], tc("none"))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ospf-area-shortcut">{t("areaModal.shortcut")}</Label>
              {valueSelect("ospf-area-shortcut", shortcut, setShortcut, areaCaps?.shortcut_values || [], tc("none"))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ospf-area-export">{t("areaModal.exportList")}</Label>
                <NamedListSelect id="ospf-area-export" value={exportList} names={accessListNames} onValueChange={setExportList} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ospf-area-import">{t("areaModal.importList")}</Label>
                <NamedListSelect id="ospf-area-import" value={importList} names={accessListNames} onValueChange={setImportList} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("areaModal.virtualLinks")}</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setLinks([...links, emptyLink()])}>
                  <Plus className="h-3 w-3 mr-1" />
                  {tc("add")}
                </Button>
              </div>
              {links.map((link, idx) => (
                <div key={idx} className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label={t("fields.address")}
                      value={link.address}
                      onChange={(e) => setLink(idx, { address: e.target.value })}
                      placeholder={t("fields.address")}
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={tc("delete")}
                      onClick={() => setLinks(links.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ["deadInterval", t("interfaceModal.deadInterval")],
                      ["helloInterval", t("interfaceModal.helloInterval")],
                      ["retransmitInterval", t("interfaceModal.retransmitInterval")],
                      ["transmitDelay", t("interfaceModal.transmitDelay")],
                      ...(showLinkRetransmitWindow ? [["retransmitWindow", t("interfaceModal.retransmitWindow")]] : []),
                    ] as [keyof LinkRow, string][]).map(([field, label]) => (
                      <div key={field} className="space-y-1">
                        <Label htmlFor={`ospf-area-vl-${idx}-${field}`} className="text-xs">{label}</Label>
                        <Input
                          id={`ospf-area-vl-${idx}-${field}`}
                          type="number"
                          value={link[field] as string}
                          onChange={(e) => setLink(idx, { [field]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                  <OspfAuthFields
                    idPrefix={`ospf-area-vl-${idx}`}
                    draft={link.auth}
                    onChange={(auth) => setLink(idx, { auth })}
                    modes={linkCaps?.authentication_modes || []}
                  />
                </div>
              ))}
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
