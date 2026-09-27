"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Terminal,
  RefreshCw,
  Pencil,
  AlertTriangle,
  Plug,
  KeyRound,
  Lock,
  ShieldAlert,
  Check,
  X,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { sshService, SSHConfig, SSHCapabilities } from "@/lib/api/ssh";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { SSHConnectionModal } from "./SSHConnectionModal";
import { SSHAuthenticationModal } from "./SSHAuthenticationModal";
import { SSHAlgorithmsModal } from "./SSHAlgorithmsModal";
import { SSHProtectionModal } from "./SSHProtectionModal";

type ModalKey = "connection" | "authentication" | "algorithms" | "protection" | null;

function Dash() {
  return <span className="text-muted-foreground">—</span>;
}

export function SSHContent() {
  const t = useTranslations("ssh");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWrite = canWrite(FeatureGroup.SSH);

  const [config, setConfig] = useState<SSHConfig | null>(null);
  const [capabilities, setCapabilities] = useState<SSHCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState<ModalKey>(null);

  const loadData = useCallback(async (refreshData = false) => {
    try {
      setLoading(true);
      setError(null);
      const [cfg, caps] = await Promise.all([
        sshService.getConfig(refreshData),
        capabilities ? Promise.resolve(capabilities) : sshService.getCapabilities(),
      ]);
      setConfig(cfg);
      setCapabilities(caps);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("content.loadFailed"));
    } finally {
      setLoading(false);
    }
    // capabilities fetched once; intentionally excluded from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && (!config || !capabilities)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => loadData()}>
          {tc("retry")}
        </Button>
      </div>
    );
  }

  if (!config || !capabilities) return null;

  const refresh = () => loadData(true);
  const ac = config.access_control;
  const dp = config.dynamic_protection;
  const fidoSupported = capabilities.features.fido.supported;
  const caSupported = capabilities.features.trusted_user_ca.supported;

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-primary/10">
                <Terminal className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">SSH</h1>
                  {!hasWrite && <Badge variant="secondary">{t("content.readOnly")}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("content.subtitle")}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {tc("refresh")}
            </Button>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="whitespace-pre-wrap">{error}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 p-6 pt-4 overflow-auto space-y-6">
          {/* Connection */}
          <SectionCard
            icon={<Plug className="h-4 w-4" />}
            title={t("content.connection")}
            hasWrite={hasWrite}
            onEdit={() => setOpenModal("connection")}
          >
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <BadgeField label={t("content.ports")} values={config.ports} empty={t("content.defaultValue", { value: String(capabilities.features.port.default) })} />
              <BadgeField label={t("content.listenAddresses")} values={config.listen_addresses} empty={t("content.allAddresses")} />
              <BadgeField label="VRFs" values={config.vrfs} empty={t("content.defaultVrf")} />
              <Field label={t("content.logLevel")} value={config.loglevel ?? t("content.defaultValue", { value: String(capabilities.features.loglevel.default) })} />
              <Field
                label={t("content.clientKeepalive")}
                value={config.client_keepalive_interval ? t("content.seconds", { value: String(config.client_keepalive_interval) }) : null}
              />
              <Field
                label={t("content.rekeyLimit")}
                value={formatRekey(config, (v) => t("content.minutes", { value: v }))}
              />
            </dl>
          </SectionCard>

          {/* Authentication & Access */}
          <SectionCard
            icon={<KeyRound className="h-4 w-4" />}
            title={t("content.authAccess")}
            hasWrite={hasWrite}
            onEdit={() => setOpenModal("authentication")}
          >
            <div className="space-y-4">
              <BoolRow
                label={t("content.passwordAuth")}
                enabled={!config.disable_password_authentication}
                onText={t("content.allowed")}
                offText={tc("disabled")}
              />
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <BadgeField label={t("content.allowUsers")} values={ac.allow_users} empty={t("content.any")} />
                <BadgeField label={t("content.allowGroups")} values={ac.allow_groups} empty={t("content.any")} />
                <BadgeField label={t("content.denyUsers")} values={ac.deny_users} empty={tc("none")} />
                <BadgeField label={t("content.denyGroups")} values={ac.deny_groups} empty={tc("none")} />
                {caSupported && (
                  <Field label={t("content.trustedUserCa")} value={config.trusted_user_ca} mono />
                )}
              </dl>
              {fidoSupported && (
                <div className="flex flex-wrap gap-6 pt-1">
                  <BoolInline label={t("content.fidoPinRequired")} enabled={config.fido.pin_required} />
                  <BoolInline label={t("content.fidoTouchRequired")} enabled={config.fido.touch_required} />
                </div>
              )}
            </div>
          </SectionCard>

          {/* Algorithms */}
          <SectionCard
            icon={<Lock className="h-4 w-4" />}
            title={t("content.cryptoAlgorithms")}
            hasWrite={hasWrite}
            onEdit={() => setOpenModal("algorithms")}
          >
            <div className="space-y-3">
              <BadgeRow label={t("content.ciphers")} values={config.ciphers} />
              <BadgeRow label="MACs" values={config.macs} />
              <BadgeRow label={t("content.keyExchange")} values={config.key_exchanges} />
              <BadgeRow label={t("content.hostKeyAlgorithms")} values={config.hostkey_algorithms} />
              <BadgeRow label={t("content.pubkeyAlgorithms")} values={config.pubkey_accepted_algorithms} />
            </div>
          </SectionCard>

          {/* Protection */}
          <SectionCard
            icon={<ShieldAlert className="h-4 w-4" />}
            title={t("content.protection")}
            hasWrite={hasWrite}
            onEdit={() => setOpenModal("protection")}
          >
            <div className="space-y-4">
              <BoolRow
                label={t("content.hostValidation")}
                enabled={!config.disable_host_validation}
                onText={tc("enabled")}
                offText={tc("disabled")}
              />
              <BoolRow
                label={t("content.dynamicProtection")}
                enabled={dp.enabled}
                onText={tc("enabled")}
                offText={tc("disabled")}
              />
              {dp.enabled && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm pl-1">
                  <Field label={t("content.threshold")} value={dp.threshold ?? t("content.defaultValue", { value: String(capabilities.features.dynamic_protection.defaults.threshold) })} />
                  <Field label={t("content.blockTime")} value={dp.block_time ? t("content.seconds", { value: String(dp.block_time) }) : t("content.defaultValue", { value: t("content.seconds", { value: String(capabilities.features.dynamic_protection.defaults.block_time) }) })} />
                  <Field label={t("content.detectTime")} value={dp.detect_time ? t("content.seconds", { value: String(dp.detect_time) }) : t("content.defaultValue", { value: t("content.seconds", { value: String(capabilities.features.dynamic_protection.defaults.detect_time) }) })} />
                  <BadgeField label={t("content.allowFrom")} values={dp.allow_from} empty={tc("none")} />
                </dl>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Modals */}
      {openModal === "connection" && (
        <SSHConnectionModal
          open
          onOpenChange={(o) => !o && setOpenModal(null)}
          config={config}
          capabilities={capabilities}
          onSuccess={refresh}
        />
      )}
      {openModal === "authentication" && (
        <SSHAuthenticationModal
          open
          onOpenChange={(o) => !o && setOpenModal(null)}
          config={config}
          capabilities={capabilities}
          onSuccess={refresh}
        />
      )}
      {openModal === "algorithms" && (
        <SSHAlgorithmsModal
          open
          onOpenChange={(o) => !o && setOpenModal(null)}
          config={config}
          capabilities={capabilities}
          onSuccess={refresh}
        />
      )}
      {openModal === "protection" && (
        <SSHProtectionModal
          open
          onOpenChange={(o) => !o && setOpenModal(null)}
          config={config}
          capabilities={capabilities}
          onSuccess={refresh}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------- helpers

function formatRekey(config: SSHConfig, minutes: (value: string) => string): string | null {
  const parts: string[] = [];
  if (config.rekey.data) parts.push(`${config.rekey.data} MB`);
  if (config.rekey.time) parts.push(minutes(String(config.rekey.time)));
  return parts.length > 0 ? parts.join(" / ") : null;
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-sm ${mono ? "font-mono" : ""}`}>{value ? value : <Dash />}</dd>
    </div>
  );
}

function BadgeField({ label, values, empty }: { label: string; values: string[]; empty: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>
        {values.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {values.map((v) => (
              <Badge key={v} variant="secondary" className="font-mono text-xs">{v}</Badge>
            ))}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">{empty}</span>
        )}
      </dd>
    </div>
  );
}

function BadgeRow({ label, values }: { label: string; values: string[] }) {
  const t = useTranslations("ssh");
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <Badge key={v} variant="secondary" className="font-mono text-xs">{v}</Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("content.vyosDefaults")}</p>
      )}
    </div>
  );
}

function BoolRow({ label, enabled, onText, offText }: { label: string; enabled: boolean; onText: string; offText: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Badge
        variant="secondary"
        className={
          enabled
            ? "bg-green-500/10 text-green-600 dark:text-green-400"
            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        }
      >
        {enabled ? onText : offText}
      </Badge>
    </div>
  );
}

function BoolInline({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {enabled ? (
        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={enabled ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  hasWrite: boolean;
  onEdit: () => void;
  children: React.ReactNode;
}

function SectionCard({ icon, title, hasWrite, onEdit, children }: SectionCardProps) {
  const tc = useTranslations("common");
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            {icon}
            {title}
          </CardTitle>
          {hasWrite && (
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-1" />
              {tc("edit")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">{children}</CardContent>
    </Card>
  );
}
