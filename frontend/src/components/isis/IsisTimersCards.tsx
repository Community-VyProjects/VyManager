"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import type { IsisCapabilities, IsisGlobalConfig, IsisSpfDelayIetf } from "@/lib/api/isis";
import { isisService } from "@/lib/api/isis";
import {
  ISIS_LDP_SYNC_HOLDDOWN,
  ISIS_LSP_GEN_INTERVAL,
  ISIS_LSP_MTU,
  ISIS_MAX_LSP_LIFETIME,
  ISIS_SPF_DELAY,
  ISIS_SPF_DELAY_FIELDS,
  ISIS_SPF_INTERVAL,
  isisSpfDelayForm,
  isisSpfDelayProblem,
  isisTimersForm,
  isisTimersProblem,
  type IsisRange,
  type IsisSpfDelayForm,
  type IsisTimersForm,
} from "@/lib/api/isis-save-ops";
import { isisLspRefreshRange } from "@/lib/isis-feature-flags";
import { IsisSectionCard } from "./IsisSectionCard";
import { useIsisSection } from "./useIsisSection";

interface CardProps {
  canEdit: boolean;
  onSaved: () => Promise<void>;
}

export function IsisTimersCard({
  global,
  capabilities,
  canEdit,
  onSaved,
}: CardProps & { global: IsisGlobalConfig; capabilities: IsisCapabilities | null }) {
  const t = useTranslations("isis");
  const tc = useTranslations("common");
  const section = useIsisSection<IsisTimersForm>(t("page.saveTimersFailed"));
  const shown = section.form ?? isisTimersForm(global);
  const lspRefresh = isisLspRefreshRange(capabilities);
  const defaults = capabilities?.lsp_timer_defaults ?? null;
  const defaultText = (value: number | undefined) =>
    value === undefined ? tc("default") : t("fields.defaultValue", { value: String(value) });

  type TimerKey = "lsp_mtu" | "lsp_gen_interval" | "lsp_refresh_interval" | "max_lsp_lifetime" | "spf_interval";
  const fields: { key: TimerKey; label: string; range: IsisRange; placeholder: string }[] = [
    { key: "lsp_mtu", label: t("advanced.lspMtu"), range: ISIS_LSP_MTU, placeholder: defaultText(1497) },
    { key: "lsp_gen_interval", label: t("advanced.lspGenInterval"), range: ISIS_LSP_GEN_INTERVAL,
      placeholder: defaultText(defaults?.lsp_gen_interval) },
    { key: "lsp_refresh_interval", label: t("advanced.lspRefreshInterval"), range: lspRefresh,
      placeholder: defaultText(defaults?.lsp_refresh_interval) },
    { key: "max_lsp_lifetime", label: t("advanced.maxLspLifetime"), range: ISIS_MAX_LSP_LIFETIME,
      placeholder: defaultText(defaults?.max_lsp_lifetime) },
    { key: "spf_interval", label: t("advanced.spfInterval"), range: ISIS_SPF_INTERVAL, placeholder: tc("default") },
  ];

  return (
    <IsisSectionCard
      title={t("advanced.lspTimers")}
      canEdit={canEdit}
      editing={section.editing}
      saving={section.saving}
      error={section.error}
      onEdit={() => section.start(isisTimersForm(global))}
      onCancel={section.cancel}
      onSave={() => {
        if (!section.form) return;
        const form = section.form;
        void section.save(isisTimersProblem(form, lspRefresh, defaults), async () => {
          await isisService.updateTimers(global, form);
          await onSaved();
        });
      }}
    >
      <div className="space-y-4">
        {fields.map(({ key, label, range, placeholder }) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={`isis-timer-${key}`} className="text-sm">{label}</Label>
            <Input
              id={`isis-timer-${key}`}
              type="number"
              value={shown[key]}
              disabled={!section.editing}
              onChange={(e) => section.update({ [key]: e.target.value })}
              placeholder={placeholder}
              min={range.min}
              max={range.max}
            />
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Checkbox
            id="isis-ldp-sync"
            checked={shown.ldp_sync}
            disabled={!section.editing}
            onCheckedChange={(c) => section.update({ ldp_sync: c === true })}
          />
          <Label htmlFor="isis-ldp-sync" className="text-sm">{t("advanced.ldpSync")}</Label>
        </div>
        <div className="space-y-1">
          <Label htmlFor="isis-timer-ldp_sync_holddown" className="text-sm">{t("fields.ldpSyncHolddown")}</Label>
          <Input
            id="isis-timer-ldp_sync_holddown"
            type="number"
            value={shown.ldp_sync_holddown}
            disabled={!section.editing || !shown.ldp_sync}
            onChange={(e) => section.update({ ldp_sync_holddown: e.target.value })}
            placeholder={tc("notSet")}
            min={ISIS_LDP_SYNC_HOLDDOWN.min}
            max={ISIS_LDP_SYNC_HOLDDOWN.max}
          />
        </div>
      </div>
    </IsisSectionCard>
  );
}

export function IsisSpfDelayCard({ spfDelay, canEdit, onSaved }: CardProps & { spfDelay: IsisSpfDelayIetf }) {
  const t = useTranslations("isis");
  const tc = useTranslations("common");
  const section = useIsisSection<IsisSpfDelayForm>(t("page.saveSpfDelayFailed"));
  const shown = section.form ?? isisSpfDelayForm(spfDelay);

  return (
    <IsisSectionCard
      title={t("advanced.spfDelayIetf")}
      canEdit={canEdit}
      editing={section.editing}
      saving={section.saving}
      error={section.error}
      onEdit={() => section.start(isisSpfDelayForm(spfDelay))}
      onCancel={section.cancel}
      onSave={() => {
        if (!section.form) return;
        const form = section.form;
        void section.save(isisSpfDelayProblem(form), async () => {
          await isisService.updateSpfDelay(spfDelay, form);
          await onSaved();
        });
      }}
    >
      <div className="space-y-3">
        {ISIS_SPF_DELAY_FIELDS.map(([key, label]) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={`isis-spf-${key}`} className="text-xs text-muted-foreground">{t(`advanced.${label}`)}</Label>
            <Input
              id={`isis-spf-${key}`}
              type="number"
              value={shown[key]}
              disabled={!section.editing}
              onChange={(e) => section.update({ [key]: e.target.value })}
              placeholder={tc("notSet")}
              min={ISIS_SPF_DELAY.min}
              max={ISIS_SPF_DELAY.max}
              className="h-8 text-sm"
            />
          </div>
        ))}
      </div>
    </IsisSectionCard>
  );
}
