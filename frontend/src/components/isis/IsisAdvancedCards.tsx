"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { isisService, type IsisCapabilities, type IsisConfig, type IsisTrafficEngineering } from "@/lib/api/isis";
import type { InterfaceName } from "@/lib/api/show";
import {
  ISIS_SR_LABEL,
  ISIS_SR_MAX_LABEL_DEPTH,
  ISIS_SR_PREFIX_ABSOLUTE,
  ISIS_SR_PREFIX_INDEX,
  ISIS_SRV6_NODE_MSD,
  emptyIsisSrPrefix,
  isisSegmentRoutingForm,
  isisSegmentRoutingProblem,
  isisTeForm,
  isisTeProblem,
  type IsisProblem,
  type IsisSegmentRoutingForm,
  type IsisSidKind,
  type IsisSrPrefixForm,
  type IsisTeForm,
} from "@/lib/api/isis-save-ops";
import { isisSrv6Supported, isisTeExportSupported } from "@/lib/isis-feature-flags";
import { IsisSectionCard } from "./IsisSectionCard";
import { useIsisSection } from "./useIsisSection";

const SID_KINDS: IsisSidKind[] = ["index", "absolute"];
const EXPLICIT_NULL = "explicit-null";
const NO_PHP_FLAG = "no-php-flag";

interface CardProps {
  canEdit: boolean;
  /** Blocks the save (IS-IS not configured yet); the page also passes canEdit false then. */
  setupProblem: IsisProblem | null;
  onSaved: () => Promise<void>;
}

export function IsisSegmentRoutingCard({
  config,
  capabilities,
  interfaces,
  canEdit,
  setupProblem,
  onSaved,
}: CardProps & { config: IsisConfig; capabilities: IsisCapabilities | null; interfaces: InterfaceName[] }) {
  const t = useTranslations("isis");
  const tc = useTranslations("common");
  const sr = config.segment_routing;
  const srv6 = isisSrv6Supported(capabilities?.features);
  const opts = { srv6, msdTypes: srv6 ? capabilities?.srv6_node_msd_types ?? [] : [] };
  const section = useIsisSection<IsisSegmentRoutingForm>(t("segmentRouting.saveFailed"));
  const shown = section.form ?? isisSegmentRoutingForm(sr);
  const off = !section.editing;

  const setRow = (idx: number, patch: Partial<IsisSrPrefixForm>) =>
    section.update({ prefixes: shown.prefixes.map((row, i) => (i === idx ? { ...row, ...patch } : row)) });

  const blockField = (key: keyof IsisSegmentRoutingForm, label: string) => (
    <div className="space-y-1">
      <Label htmlFor={`isis-sr-${key}`} className="text-xs text-muted-foreground">{label}</Label>
      <Input
        id={`isis-sr-${key}`}
        type="number"
        value={shown[key] as string}
        disabled={off}
        onChange={(e) => section.update({ [key]: e.target.value } as Partial<IsisSegmentRoutingForm>)}
        placeholder={tc("notSet")}
        min={ISIS_SR_LABEL.min}
        max={ISIS_SR_LABEL.max}
        className="h-8 text-sm"
      />
    </div>
  );

  return (
    <IsisSectionCard
      title={t("advanced.segmentRouting")}
      className="col-span-2"
      canEdit={canEdit}
      editing={section.editing}
      saving={section.saving}
      error={section.error}
      onEdit={() => section.start(isisSegmentRoutingForm(sr))}
      onCancel={section.cancel}
      onSave={() => {
        if (!section.form) return;
        const form = section.form;
        void section.save(setupProblem ?? isisSegmentRoutingProblem(form, opts), async () => {
          await isisService.updateSegmentRouting(sr, form, opts);
          await onSaved();
        });
      }}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-5 gap-3">
          {blockField("global_block_low", t("advanced.srgbLow"))}
          {blockField("global_block_high", t("advanced.srgbHigh"))}
          {blockField("local_block_low", t("advanced.srlbLow"))}
          {blockField("local_block_high", t("advanced.srlbHigh"))}
          <div className="space-y-1">
            <Label htmlFor="isis-sr-depth" className="text-xs text-muted-foreground">{t("segmentRouting.maximumLabelDepth")}</Label>
            <Input
              id="isis-sr-depth"
              type="number"
              value={shown.maximum_label_depth}
              disabled={off}
              onChange={(e) => section.update({ maximum_label_depth: e.target.value })}
              placeholder={tc("notSet")}
              min={ISIS_SR_MAX_LABEL_DEPTH.min}
              max={ISIS_SR_MAX_LABEL_DEPTH.max}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t("advanced.prefixSids")}</p>
            {section.editing && (
              <Button size="sm" variant="outline" onClick={() => section.update({ prefixes: [...shown.prefixes, emptyIsisSrPrefix()] })}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t("segmentRouting.addPrefix")}
              </Button>
            )}
          </div>
          {shown.prefixes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("overview.noneConfigured")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("segmentRouting.prefix")}</TableHead>
                  <TableHead>{t("segmentRouting.sidType")}</TableHead>
                  <TableHead>{t("segmentRouting.value")}</TableHead>
                  <TableHead>{EXPLICIT_NULL}</TableHead>
                  <TableHead>{NO_PHP_FLAG}</TableHead>
                  {section.editing && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.prefixes.map((row, idx) => {
                  const range = row.kind === "index" ? ISIS_SR_PREFIX_INDEX : ISIS_SR_PREFIX_ABSOLUTE;
                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          aria-label={t("segmentRouting.prefix")}
                          value={row.prefix}
                          disabled={off}
                          onChange={(e) => setRow(idx, { prefix: e.target.value })}
                          className="h-8 font-mono text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={row.kind} disabled={off} onValueChange={(v) => setRow(idx, { kind: v as IsisSidKind })}>
                          <SelectTrigger className="h-8 w-32" aria-label={t("segmentRouting.sidType")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SID_KINDS.map((kind) => (
                              <SelectItem key={kind} value={kind}>{kind}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          aria-label={t("segmentRouting.value")}
                          type="number"
                          value={row.value}
                          disabled={off}
                          onChange={(e) => setRow(idx, { value: e.target.value })}
                          min={range.min}
                          max={range.max}
                          className="h-8 w-32 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          aria-label={EXPLICIT_NULL}
                          checked={row.explicit_null}
                          disabled={off}
                          onCheckedChange={(c) => setRow(idx, { explicit_null: c === true })}
                        />
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          aria-label={NO_PHP_FLAG}
                          checked={row.no_php}
                          disabled={off}
                          onCheckedChange={(c) => setRow(idx, { no_php: c === true })}
                        />
                      </TableCell>
                      {section.editing && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            aria-label={tc("delete")}
                            onClick={() => section.update({ prefixes: shown.prefixes.filter((_, i) => i !== idx) })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {srv6 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">{t("segmentRouting.srv6")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="isis-srv6-locator" className="text-xs text-muted-foreground">{t("advanced.srv6Locator")}</Label>
                <NamedListSelect
                  id="isis-srv6-locator"
                  value={shown.srv6_locator}
                  names={config.srv6_locator_names}
                  disabled={off}
                  onValueChange={(v) => section.update({ srv6_locator: v })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="isis-srv6-interface" className="text-xs text-muted-foreground">{t("fields.interface")}</Label>
                <InterfaceSelect
                  id="isis-srv6-interface"
                  value={shown.srv6_interface}
                  disabled={off}
                  interfaces={interfaces}
                  onValueChange={(v) => section.update({ srv6_interface: v })}
                  noneOption={{ label: tc("none"), value: "" }}
                />
              </div>
            </div>
            {opts.msdTypes.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("segmentRouting.nodeMsd")}</p>
                <div className="grid grid-cols-4 gap-3">
                  {opts.msdTypes.map((type) => (
                    <div key={type} className="space-y-1">
                      <Label htmlFor={`isis-msd-${type}`} className="text-xs font-mono">{type}</Label>
                      <Input
                        id={`isis-msd-${type}`}
                        type="number"
                        value={shown.srv6_node_msd[type] ?? ""}
                        disabled={off}
                        onChange={(e) => section.update({ srv6_node_msd: { ...shown.srv6_node_msd, [type]: e.target.value } })}
                        placeholder={tc("notSet")}
                        min={ISIS_SRV6_NODE_MSD.min}
                        max={ISIS_SRV6_NODE_MSD.max}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </IsisSectionCard>
  );
}

export function IsisTrafficEngineeringCard({
  te,
  capabilities,
  canEdit,
  setupProblem,
  onSaved,
}: CardProps & { te: IsisTrafficEngineering; capabilities: IsisCapabilities | null }) {
  const t = useTranslations("isis");
  const tc = useTranslations("common");
  const teExport = isisTeExportSupported(capabilities?.features);
  const section = useIsisSection<IsisTeForm>(t("trafficEngineering.saveFailed"));
  const shown = section.form ?? isisTeForm(te);
  const off = !section.editing;

  return (
    <IsisSectionCard
      title={t("advanced.trafficEngineering")}
      canEdit={canEdit}
      editing={section.editing}
      saving={section.saving}
      error={section.error}
      onEdit={() => section.start(isisTeForm(te))}
      onCancel={section.cancel}
      onSave={() => {
        if (!section.form) return;
        const form = section.form;
        void section.save(setupProblem ?? isisTeProblem(form), async () => {
          await isisService.updateTrafficEngineering(te, form, { teExport });
          await onSaved();
        });
      }}
    >
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <Checkbox
            id="isis-te-enable"
            checked={shown.enabled}
            disabled={off}
            onCheckedChange={(c) => section.update({ enabled: c === true })}
          />
          <Label htmlFor="isis-te-enable">{tc("enabled")}</Label>
        </div>
        <div className="space-y-1">
          <Label htmlFor="isis-te-address" className="text-xs text-muted-foreground">{t("advanced.teRouterAddress")}</Label>
          <Input
            id="isis-te-address"
            value={shown.address}
            disabled={off}
            onChange={(e) => section.update({ address: e.target.value })}
            placeholder={tc("notSet")}
            className="font-mono"
          />
        </div>
        {teExport && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="isis-te-export"
              checked={shown.export}
              disabled={off}
              onCheckedChange={(c) => section.update({ export: c === true })}
            />
            <Label htmlFor="isis-te-export">{t("advanced.tedExport")}</Label>
          </div>
        )}
      </div>
    </IsisSectionCard>
  );
}
