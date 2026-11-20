"use client";

import { NONE_SENTINEL } from "@/lib/named-list-select-options";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NamedListSelect } from "@/components/ui/named-list-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type {
  OspfAccessList,
  OspfNeighbor,
  OspfSegmentRouting,
  OspfSegmentRoutingPrefix,
  OspfSummaryAddress,
} from "@/lib/api/ospf";
import { ospfPrefixFlag, type OspfPrefixFlag } from "@/lib/api/ospf-save-ops";

const toInt = (value: string) => (value.trim() ? parseInt(value.trim(), 10) : null);
const toText = (value: number | null | undefined) => (value == null ? "" : String(value));

interface OspfAdvancedListsProps {
  editing: boolean;
  accessLists: OspfAccessList[];
  onAccessListsChange: (lists: OspfAccessList[]) => void;
  neighbors: OspfNeighbor[];
  onNeighborsChange: (neighbors: OspfNeighbor[]) => void;
  summaryAddresses: OspfSummaryAddress[];
  onSummaryAddressesChange: (addresses: OspfSummaryAddress[]) => void;
  segmentRouting: OspfSegmentRouting;
  onSegmentRoutingChange: (sr: OspfSegmentRouting) => void;
  accessListNames: string[];
  exportValues: string[];
  prefixFlags: string[];
}

function replaceAt<T>(items: T[], idx: number, patch: Partial<T>): T[] {
  return items.map((item, i) => (i === idx ? { ...item, ...patch } : item));
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={label} onClick={onClick}>
      <Trash2 className="h-3 w-3" />
    </Button>
  );
}

/** Keyed list editors on the OSPF advanced tab. Changes wait for the tab's Save. */
export function OspfAdvancedLists({
  editing,
  accessLists,
  onAccessListsChange,
  neighbors,
  onNeighborsChange,
  summaryAddresses,
  onSummaryAddressesChange,
  segmentRouting,
  onSegmentRoutingChange,
  accessListNames,
  exportValues,
  prefixFlags,
}: OspfAdvancedListsProps) {
  const t = useTranslations("ospf");
  const tc = useTranslations("common");
  const sr = segmentRouting;
  const prefixes = sr.prefixes || [];

  const addButton = (onClick: () => void) =>
    editing ? (
      <Button type="button" variant="outline" size="sm" onClick={onClick}>
        <Plus className="h-3 w-3 mr-1" />
        {tc("add")}
      </Button>
    ) : null;

  const setPrefix = (idx: number, patch: Partial<OspfSegmentRoutingPrefix>) =>
    onSegmentRoutingChange({ ...sr, prefixes: replaceAt(prefixes, idx, patch) });

  const srNumber = (field: Exclude<keyof OspfSegmentRouting, "prefixes">, label: string) => (
    <div className="space-y-1">
      <Label htmlFor={`ospf-sr-${field}`} className="text-sm">{label}</Label>
      <Input
        id={`ospf-sr-${field}`}
        type="number"
        value={toText(sr[field])}
        disabled={!editing}
        onChange={(e) => onSegmentRoutingChange({ ...sr, [field]: toInt(e.target.value) })}
      />
    </div>
  );

  return (
    <>
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{t("advanced.accessLists")}</h3>
            {addButton(() => onAccessListsChange([...accessLists, { acl: "", export: [] }]))}
          </div>
          {accessLists.length === 0 && <p className="text-sm text-muted-foreground">{t("values.none")}</p>}
          {accessLists.map((entry, idx) => (
            <div key={idx} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <NamedListSelect
                    id={`ospf-acl-${idx}`}
                    value={entry.acl}
                    names={accessListNames}
                    disabled={!editing}
                    onValueChange={(acl) => onAccessListsChange(replaceAt(accessLists, idx, { acl }))}
                  />
                </div>
                {editing && (
                  <RemoveButton label={tc("delete")} onClick={() => onAccessListsChange(accessLists.filter((_, i) => i !== idx))} />
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {exportValues.map((value) => (
                  <div key={value} className="flex items-center gap-2">
                    <Checkbox
                      id={`ospf-acl-${idx}-export-${value}`}
                      checked={entry.export.includes(value)}
                      disabled={!editing}
                      onCheckedChange={(checked) =>
                        onAccessListsChange(replaceAt(accessLists, idx, {
                          export: checked === true
                            ? [...entry.export, value]
                            : entry.export.filter((v) => v !== value),
                        }))
                      }
                    />
                    <Label htmlFor={`ospf-acl-${idx}-export-${value}`} className="text-sm font-mono">{value}</Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{t("advanced.neighbors")}</h3>
            {addButton(() => onNeighborsChange([...neighbors, { address: "", poll_interval: null, priority: null }]))}
          </div>
          {neighbors.length === 0 && <p className="text-sm text-muted-foreground">{t("values.none")}</p>}
          {neighbors.map((n, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_7rem_7rem_auto] items-center gap-2">
              <Input
                aria-label={t("fields.address")}
                value={n.address}
                disabled={!editing}
                placeholder={t("fields.address")}
                className="font-mono"
                onChange={(e) => onNeighborsChange(replaceAt(neighbors, idx, { address: e.target.value }))}
              />
              <Input
                aria-label={t("advanced.pollInterval")}
                type="number"
                value={toText(n.poll_interval)}
                disabled={!editing}
                placeholder={t("advanced.pollInterval")}
                onChange={(e) => onNeighborsChange(replaceAt(neighbors, idx, { poll_interval: toInt(e.target.value) }))}
              />
              <Input
                aria-label={t("fields.priority")}
                type="number"
                value={toText(n.priority)}
                disabled={!editing}
                placeholder={t("fields.priority")}
                onChange={(e) => onNeighborsChange(replaceAt(neighbors, idx, { priority: toInt(e.target.value) }))}
              />
              {editing ? (
                <RemoveButton label={tc("delete")} onClick={() => onNeighborsChange(neighbors.filter((_, i) => i !== idx))} />
              ) : <span />}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{t("advanced.summaryAddresses")}</h3>
            {addButton(() =>
              onSummaryAddressesChange([...summaryAddresses, { prefix: "", tag: null, no_advertise: false }]),
            )}
          </div>
          {summaryAddresses.length === 0 && <p className="text-sm text-muted-foreground">{t("values.none")}</p>}
          {summaryAddresses.map((s, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_7rem_auto_auto] items-center gap-2">
              <Input
                aria-label={t("fields.prefix")}
                value={s.prefix}
                disabled={!editing}
                placeholder={t("fields.prefix")}
                className="font-mono"
                onChange={(e) => onSummaryAddressesChange(replaceAt(summaryAddresses, idx, { prefix: e.target.value }))}
              />
              <Input
                aria-label={t("advanced.tag")}
                type="number"
                value={toText(s.tag)}
                disabled={!editing}
                placeholder={t("advanced.tag")}
                onChange={(e) => onSummaryAddressesChange(replaceAt(summaryAddresses, idx, { tag: toInt(e.target.value) }))}
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`ospf-summary-${idx}-no-advertise`}
                  checked={s.no_advertise}
                  disabled={!editing}
                  onCheckedChange={(checked) =>
                    onSummaryAddressesChange(replaceAt(summaryAddresses, idx, { no_advertise: checked === true }))
                  }
                />
                <Label htmlFor={`ospf-summary-${idx}-no-advertise`} className="text-sm">{t("areaModal.notAdvertise")}</Label>
              </div>
              {editing ? (
                <RemoveButton
                  label={tc("delete")}
                  onClick={() => onSummaryAddressesChange(summaryAddresses.filter((_, i) => i !== idx))}
                />
              ) : <span />}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold">{t("advanced.segmentRouting")}</h3>
          <div className="grid grid-cols-2 gap-4">
            {srNumber("global_block_low", t("advanced.globalBlockLow"))}
            {srNumber("global_block_high", t("advanced.globalBlockHigh"))}
            {srNumber("local_block_low", t("advanced.localBlockLow"))}
            {srNumber("local_block_high", t("advanced.localBlockHigh"))}
            {srNumber("maximum_label_depth", t("advanced.maximumLabelDepth"))}
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("advanced.prefixSids")}</Label>
            {addButton(() =>
              onSegmentRoutingChange({
                ...sr,
                prefixes: [...prefixes, { prefix: "", index_value: null, explicit_null: false, no_php_flag: false }],
              }),
            )}
          </div>
          {prefixes.map((p, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_7rem_10rem_auto] items-center gap-2">
              <Input
                aria-label={t("fields.prefix")}
                value={p.prefix}
                disabled={!editing}
                placeholder={t("fields.prefix")}
                className="font-mono"
                onChange={(e) => setPrefix(idx, { prefix: e.target.value })}
              />
              <Input
                aria-label={t("advanced.sidIndex")}
                type="number"
                value={toText(p.index_value)}
                disabled={!editing}
                placeholder={t("advanced.sidIndex")}
                onChange={(e) => setPrefix(idx, { index_value: toInt(e.target.value) })}
              />
              <Select
                value={ospfPrefixFlag(p) || NONE_SENTINEL}
                disabled={!editing}
                onValueChange={(v) => {
                  const next = (v === NONE_SENTINEL ? "" : v) as OspfPrefixFlag;
                  setPrefix(idx, { explicit_null: next === "explicit-null", no_php_flag: next === "no-php-flag" });
                }}
              >
                <SelectTrigger aria-label={t("advanced.sidFlag")}>
                  <SelectValue placeholder={tc("none")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SENTINEL}>{tc("none")}</SelectItem>
                  {prefixFlags.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editing ? (
                <RemoveButton
                  label={tc("delete")}
                  onClick={() => onSegmentRoutingChange({ ...sr, prefixes: prefixes.filter((_, i) => i !== idx) })}
                />
              ) : <span />}
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
