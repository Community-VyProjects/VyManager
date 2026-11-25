"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, AlertTriangle, Loader2 } from "lucide-react";
import type { ContainerCapabilities, ContainerRegistry, ContainerRegistryMirror } from "@/lib/api/container";
import { MIRROR_PORT_RANGE, REGISTRY_USERNAME_MAX, registryProblem } from "@/lib/api/container-save-ops";
import type { ApiError } from "@/lib/types/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The registry being edited; null adds one. */
  registry: ContainerRegistry | null;
  capabilities: ContainerCapabilities;
  /** Every configured registry name (an Add may not reuse one). */
  existingNames: string[];
  onSubmit: (draft: ContainerRegistry) => Promise<void>;
}

const EMPTY_MIRROR: ContainerRegistryMirror = { address: null, host_name: null, path: null, port: null };

export function RegistryModal({ open, onOpenChange, registry, capabilities, existingNames, onSubmit }: Props) {
  const t = useTranslations("containerResources");
  const tm = useTranslations("containers");
  const tc = useTranslations("common");
  const isEditMode = !!registry;
  const { features, values } = capabilities;

  const [name, setName] = useState(registry?.name ?? "");
  const [disabled, setDisabled] = useState(registry?.disabled ?? false);
  const [insecure, setInsecure] = useState(registry?.insecure ?? false);
  const [username, setUsername] = useState(registry?.authentication?.username ?? "");
  // A stored password loads as the mask; leaving it unchanged keeps it.
  const [password, setPassword] = useState(registry?.authentication?.password ?? "");
  const [mirrorOn, setMirrorOn] = useState(registry?.mirror != null);
  const [mirror, setMirror] = useState<ContainerRegistryMirror>(registry?.mirror ?? EMPTY_MIRROR);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setMirrorField = (patch: Partial<ContainerRegistryMirror>) => setMirror((m) => ({ ...m, ...patch }));

  const handleOpenChange = (next: boolean) => {
    if (!next && saving) return;
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    const draft: ContainerRegistry = {
      name,
      disabled,
      insecure,
      authentication: { username, password },
      mirror: features.registry_mirror && mirrorOn ? mirror : null,
    };
    const issue = registryProblem(registry, draft, { features, values, existingNames });
    if (issue) {
      setError(t(`registryProblems.${issue.key}`, issue.values));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(draft);
      onOpenChange(false);
    } catch (err: unknown) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("registryModal.editTitle", { name: registry?.name ?? "" }) : t("registries.addRegistry")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? t("registryModal.editDescription") : t("registryModal.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 pb-2">
            <div className="space-y-2">
              <Label htmlFor="reg-name">{t("registries.registry")}</Label>
              <Input
                id="reg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isEditMode}
                className={isEditMode ? "bg-muted font-mono" : "font-mono"}
                placeholder={t("registryModal.namePlaceholder")}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="reg-disabled" checked={disabled} onCheckedChange={(v) => setDisabled(v === true)} />
              <Label htmlFor="reg-disabled" className="cursor-pointer">{t("registryModal.disableRegistry")}</Label>
            </div>

            {features.registry_insecure && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="reg-insecure" checked={insecure} onCheckedChange={(v) => setInsecure(v === true)} />
                  <Label htmlFor="reg-insecure" className="cursor-pointer">{t("registryModal.allowInsecure")}</Label>
                </div>
                {insecure && (
                  <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">{t("registryModal.insecureWarning")}</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3 pt-1">
              <p className="text-sm font-semibold">{t("registryModal.authentication")}</p>
              <div className="space-y-2">
                <Label htmlFor="reg-user">{t("registryModal.username")}</Label>
                <Input
                  id="reg-user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={REGISTRY_USERNAME_MAX}
                  className="font-mono"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-pass">{t("registryModal.password")}</Label>
                <Input
                  id="reg-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={values.registry_password_max_length}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {features.registry_mirror && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2">
                  <Checkbox id="reg-mirror" checked={mirrorOn} onCheckedChange={(v) => setMirrorOn(v === true)} />
                  <Label htmlFor="reg-mirror" className="cursor-pointer">{t("registries.mirror")}</Label>
                </div>
                {mirrorOn && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="mir-addr">{t("registryModal.address")}</Label>
                      <Input id="mir-addr" value={mirror.address ?? ""} onChange={(e) => setMirrorField({ address: e.target.value })} placeholder={t("registryModal.addressPlaceholder")} className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mir-host">{tm("modal.hostname")}</Label>
                      <Input id="mir-host" value={mirror.host_name ?? ""} onChange={(e) => setMirrorField({ host_name: e.target.value })} placeholder="mirror.example.com" className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mir-path">{t("registryModal.path")}</Label>
                      <Input id="mir-path" value={mirror.path ?? ""} onChange={(e) => setMirrorField({ path: e.target.value })} placeholder="/v2" className="font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mir-port">{t("registryModal.port")}</Label>
                      <Input id="mir-port" type="number" min={MIRROR_PORT_RANGE.min} max={MIRROR_PORT_RANGE.max} value={mirror.port ?? ""} onChange={(e) => setMirrorField({ port: e.target.value })} placeholder={t("registryModal.portPlaceholder")} className="font-mono" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEditMode ? tc("saving") : tm("modal.adding")}</>
            ) : isEditMode ? tc("saveChanges") : t("registries.addRegistry")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
