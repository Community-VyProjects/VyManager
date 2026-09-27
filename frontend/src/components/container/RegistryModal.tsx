"use client";

import { useState, useEffect } from "react";
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
import type { ContainerRegistry, ContainerCapabilities } from "@/lib/api/container";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registry: ContainerRegistry | null;
  capabilities: ContainerCapabilities | null;
  onSubmit: (data: ContainerRegistry) => Promise<void>;
}

export function RegistryModal({ open, onOpenChange, registry, capabilities, onSubmit }: Props) {
  const t = useTranslations("containerResources");
  const tc = useTranslations("common");
  const isEditMode = !!registry;
  const caps = capabilities?.features;
  const showInsecure = caps?.registry_insecure?.supported ?? true;
  const showMirror = caps?.registry_mirror?.supported ?? true;

  const [name, setName] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [insecure, setInsecure] = useState(false);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [mirrorAddress, setMirrorAddress] = useState("");
  const [mirrorHostName, setMirrorHostName] = useState("");
  const [mirrorPath, setMirrorPath] = useState("");
  const [mirrorPort, setMirrorPort] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const r = registry;
    setName(r?.name ?? "");
    setDisabled(r?.disabled ?? false);
    setInsecure(r?.insecure ?? false);
    setAuthUsername(r?.authentication?.username ?? "");
    setAuthPassword(r?.authentication?.password ?? "");
    setMirrorAddress(r?.mirror?.address ?? "");
    setMirrorHostName(r?.mirror?.host_name ?? "");
    setMirrorPath(r?.mirror?.path ?? "");
    setMirrorPort(r?.mirror?.port ?? "");
    setError(null);
  }, [open, registry]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const validate = (): string | null => {
    if (!isEditMode && !name.trim()) return t("registryModal.nameRequired");
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    setError(null);

    const hasMirror = mirrorAddress || mirrorHostName || mirrorPath || mirrorPort;

    try {
      await onSubmit({
        name: name.trim(),
        disabled,
        insecure: showInsecure ? insecure : false,
        authentication: (authUsername || authPassword)
          ? { username: authUsername || null, password: authPassword || null }
          : null,
        mirror: (showMirror && hasMirror)
          ? { address: mirrorAddress || null, host_name: mirrorHostName || null, path: mirrorPath || null, port: mirrorPort || null }
          : null,
      });
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t("registryModal.editTitle", { name: registry?.name ?? "" }) : t("registries.addRegistry")}</DialogTitle>
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
                onChange={e => setName(e.target.value)}
                disabled={isEditMode}
                className={isEditMode ? "bg-muted font-mono" : "font-mono"}
                placeholder={t("registryModal.namePlaceholder")}
              />
              {isEditMode && <p className="text-xs text-muted-foreground">{t("registryModal.nameImmutable")}</p>}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="reg-disabled" checked={disabled} onCheckedChange={v => setDisabled(v === true)} />
              <Label htmlFor="reg-disabled" className="cursor-pointer">{t("registryModal.disableRegistry")}</Label>
            </div>

            {showInsecure && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="reg-insecure" checked={insecure} onCheckedChange={v => setInsecure(v === true)} />
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

            {/* Authentication */}
            <div className="space-y-3 pt-1">
              <Label className="text-sm font-semibold">{t("registryModal.authentication")}</Label>
              <div className="space-y-2">
                <Label htmlFor="reg-user">{t("registryModal.username")}</Label>
                <Input id="reg-user" value={authUsername} onChange={e => setAuthUsername(e.target.value)} placeholder={t("registryModal.usernamePlaceholder")} className="font-mono" autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-pass">{t("registryModal.password")}</Label>
                <Input id="reg-pass" type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder={t("registryModal.passwordPlaceholder")} autoComplete="new-password" />
              </div>
            </div>

            {/* Mirror */}
            {showMirror && (
              <div className="space-y-3 pt-1">
                <Label className="text-sm font-semibold">{t("registries.mirror")}</Label>
                <p className="text-xs text-muted-foreground">{t("registryModal.mirrorHelp")}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="mir-addr">{t("registryModal.address")}</Label>
                    <Input id="mir-addr" value={mirrorAddress} onChange={e => setMirrorAddress(e.target.value)} placeholder={t("registryModal.addressPlaceholder")} className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mir-host">{t("registryModal.hostname")}</Label>
                    <Input id="mir-host" value={mirrorHostName} onChange={e => setMirrorHostName(e.target.value)} placeholder="mirror.example.com" className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mir-path">{t("registryModal.path")}</Label>
                    <Input id="mir-path" value={mirrorPath} onChange={e => setMirrorPath(e.target.value)} placeholder="/v2" className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mir-port">{t("registryModal.port")}</Label>
                    <Input id="mir-port" type="number" value={mirrorPort} onChange={e => setMirrorPort(e.target.value)} placeholder={t("registryModal.portPlaceholder")} className="font-mono" />
                  </div>
                </div>
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
          <Button variant="outline" onClick={handleClose} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEditMode ? t("registryModal.saving") : t("registryModal.adding")}</>
            ) : isEditMode ? t("registryModal.saveChanges") : t("registries.addRegistry")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
