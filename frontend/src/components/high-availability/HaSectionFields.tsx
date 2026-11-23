"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HA_RANGES,
  type HAGarpDraft,
  type HAHealthCheckDraft,
  type HATransitionScriptDraft,
} from "@/lib/api/high-availability-save-ops";

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type="number" min={min} max={max} step={step} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function HealthCheckFields({
  value,
  onChange,
  timeoutSupported,
}: {
  value: HAHealthCheckDraft;
  onChange: (value: HAHealthCheckDraft) => void;
  timeoutSupported: boolean;
}) {
  const t = useTranslations("highAvailability");
  const set = (key: keyof HAHealthCheckDraft) => (next: string) => onChange({ ...value, [key]: next });
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t("pingTarget")}</Label>
        <Input
          value={value.ping}
          onChange={(e) => set("ping")(e.target.value)}
          placeholder={t("pingPlaceholder")}
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t("scriptPath")}</Label>
        <Input value={value.script} onChange={(e) => set("script")(e.target.value)} className="font-mono" />
      </div>
      <NumberField
        label={t("intervalSeconds")}
        value={value.interval}
        onChange={set("interval")}
        {...HA_RANGES.health_check_interval}
      />
      <NumberField
        label={t("failureCount")}
        value={value.failure_count}
        onChange={set("failure_count")}
        {...HA_RANGES.health_check_failure_count}
      />
      {timeoutSupported && (
        <NumberField
          label={t("scriptTimeout")}
          value={value.timeout}
          onChange={set("timeout")}
          {...HA_RANGES.health_check_timeout}
        />
      )}
    </div>
  );
}

export function GarpFields({ value, onChange }: { value: HAGarpDraft; onChange: (value: HAGarpDraft) => void }) {
  const t = useTranslations("highAvailability");
  const set = (key: keyof HAGarpDraft) => (next: string) => onChange({ ...value, [key]: next });
  return (
    <div className="grid grid-cols-2 gap-3">
      <NumberField
        label={t("intervalSeconds")}
        value={value.interval}
        onChange={set("interval")}
        step="0.001"
        {...HA_RANGES.garp_interval}
      />
      <NumberField
        label={t("garpMasterDelay")}
        value={value.master_delay}
        onChange={set("master_delay")}
        {...HA_RANGES.garp_master_delay}
      />
      <NumberField
        label={t("garpMasterRefresh")}
        value={value.master_refresh}
        onChange={set("master_refresh")}
        {...HA_RANGES.garp_master_refresh}
      />
      <NumberField
        label={t("garpMasterRefreshRepeat")}
        value={value.master_refresh_repeat}
        onChange={set("master_refresh_repeat")}
        {...HA_RANGES.garp_master_refresh_repeat}
      />
      <NumberField
        label={t("garpMasterRepeat")}
        value={value.master_repeat}
        onChange={set("master_repeat")}
        {...HA_RANGES.garp_master_repeat}
      />
    </div>
  );
}

export function TransitionScriptFields({
  value,
  onChange,
}: {
  value: HATransitionScriptDraft;
  onChange: (value: HATransitionScriptDraft) => void;
}) {
  const t = useTranslations("highAvailability");
  const labels = {
    master: t("scriptMaster"),
    backup: t("scriptBackup"),
    fault: t("scriptFault"),
    stop: t("scriptStop"),
  } as const;
  return (
    <div className="grid grid-cols-2 gap-3">
      {(Object.keys(labels) as Array<keyof typeof labels>).map((key) => (
        <div key={key} className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{labels[key]}</Label>
          <Input
            value={value[key]}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            className="font-mono"
          />
        </div>
      ))}
    </div>
  );
}
