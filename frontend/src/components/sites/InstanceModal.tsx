"use client";

import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2, Server } from "lucide-react";
import type { Instance, Site } from "@/lib/api/session";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SSHKeySetup } from "@/components/monitoring/SSHKeySetup";
import { ApiError } from "@/lib/types/api";
import { modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  emptyInstanceDraft,
  instanceDraftFrom,
  submitInstanceCreate,
  submitInstanceUpdate,
  validateInstanceCreate,
  validateInstanceShared,
  type InstanceDraft,
} from "./sites-form";

interface InstanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existing?: Instance | null;
  site?: Site | null;
  sites?: Site[];
}

export function InstanceModal({
  open,
  onOpenChange,
  onSuccess,
  existing,
  site,
  sites = [],
}: InstanceModalProps) {
  const t = useTranslations("sites");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const [draft, setDraft] = useState<InstanceDraft>(emptyInstanceDraft());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setDraft(instanceDraftFrom(existing));
    } else {
      setDraft(emptyInstanceDraft());
    }
    setError(null);
  }, [open, existing]);

  const patch = (fields: Partial<InstanceDraft>) => setDraft((d) => ({ ...d, ...fields }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const write = modalWriteKind(existing ? { name: existing.id } : null);
    const validationError =
      write.kind === "create"
        ? validateInstanceCreate(draft, site?.id)
        : validateInstanceShared(draft);
    if (validationError) {
      setError(t(`validation.${validationError}`));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (write.kind === "update" && existing) {
        await submitInstanceUpdate(existing, draft);
      } else if (site) {
        await submitInstanceCreate(draft, site.id);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const fallback = isEdit ? t("instanceModal.updateFailed") : t("instanceModal.createFailed");
      const message =
        err instanceof Error
          ? err.message
          : (err as ApiError).message || fallback;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const canMoveSite = isEdit && sites.length > 1;
  const isAdmin =
    isEdit && sites.find((s) => s.id === existing.site_id)?.role === "ADMIN";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{isEdit ? t("instanceModal.editTitle") : t("instanceModal.createTitle")}</DialogTitle>
              <DialogDescription>
                {isEdit
                  ? t("instanceModal.editDescription")
                  : site
                    ? t("instanceModal.createDescriptionToSite", { site: site.name })
                    : t("instanceModal.createDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">{t("instanceModal.tabBasic")}</TabsTrigger>
              <TabsTrigger value="connection">{t("instanceModal.tabConnection")}</TabsTrigger>
              <TabsTrigger value="ssh">{t("instanceModal.tabSsh")}</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="required">
                  {t("instanceModal.nameLabel")}
                </Label>
                <Input
                  id="name"
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder={t("instanceModal.namePlaceholder")}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("descriptionOptional")}</Label>
                <Textarea
                  id="description"
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder={t("instanceModal.descriptionPlaceholder")}
                  rows={2}
                  disabled={loading}
                />
              </div>

              {canMoveSite && existing && (
                <div className="space-y-2">
                  <Label htmlFor="siteId">{t("instanceModal.site")}</Label>
                  <Select
                    value={draft.siteId}
                    onValueChange={(value) => patch({ siteId: value })}
                    disabled={loading}
                  >
                    <SelectTrigger id="siteId">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sites
                        .filter((s) => s.role === "ADMIN")
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                            {s.id === existing.site_id ? t("instanceModal.current") : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {draft.siteId !== existing.site_id && (
                    <p className="text-xs text-warning">
                      {t("instanceModal.movingWarning")}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="vyosVersion">{t("instanceModal.vyosVersion")}</Label>
                <Select
                  value={draft.vyosVersion}
                  onValueChange={(value) => patch({ vyosVersion: value })}
                  disabled={loading}
                >
                  <SelectTrigger id="vyosVersion">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1.4">VyOS 1.4</SelectItem>
                    <SelectItem value="1.5">VyOS 1.5</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={draft.isActive}
                  onCheckedChange={(checked) => patch({ isActive: checked as boolean })}
                  disabled={loading}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  {t("instanceModal.isActive")}
                </Label>
              </div>

              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="commitConfirmEnabled"
                    checked={draft.commitConfirmEnabled}
                    onCheckedChange={(checked) =>
                      patch({ commitConfirmEnabled: checked as boolean })
                    }
                    disabled={loading || draft.vyosVersion === "1.4"}
                  />
                  <div>
                    <Label htmlFor="commitConfirmEnabled" className="cursor-pointer">
                      {t("instanceModal.commitConfirmEnable")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {draft.vyosVersion === "1.4"
                        ? t("instanceModal.commitConfirmUnsupported")
                        : t("instanceModal.commitConfirmHint")}
                    </p>
                  </div>
                </div>
                {draft.commitConfirmEnabled && (
                  <div className="flex items-center gap-3 pl-6">
                    <Label htmlFor="commitConfirmMinutes" className="whitespace-nowrap text-sm">
                      {t("instanceModal.confirmWindow")}
                    </Label>
                    <Input
                      id="commitConfirmMinutes"
                      type="number"
                      min={1}
                      max={60}
                      value={draft.commitConfirmMinutes}
                      onChange={(e) => patch({ commitConfirmMinutes: e.target.value })}
                      disabled={loading}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">{t("instanceModal.minutes")}</span>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="connection" className="space-y-4 mt-4">
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="host" className="required">
                  {t("host")}
                </Label>
                <Input
                  id="host"
                  value={draft.host}
                  onChange={(e) => patch({ host: e.target.value })}
                  placeholder={t("instanceModal.hostPlaceholder")}
                  disabled={loading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {t("instanceModal.hostHint")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="port">{isEdit ? t("instanceModal.apiPort") : t("port")}</Label>
                <Input
                  id="port"
                  type="number"
                  value={draft.port}
                  onChange={(e) => patch({ port: e.target.value })}
                  placeholder="443"
                  min="1"
                  max="65535"
                  disabled={loading}
                />
              </div>

              {isEdit ? (
                <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
                  <p className="text-sm font-medium">{t("instanceModal.updateCredentials")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("instanceModal.keepCredentialsHint")}
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="protocol">{t("instanceModal.protocol")}</Label>
                    <Select
                      value={draft.protocol}
                      onValueChange={(value) => patch({ protocol: value })}
                      disabled={loading}
                    >
                      <SelectTrigger id="protocol">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="https">HTTPS</SelectItem>
                        <SelectItem value="http">HTTP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey">{t("instanceModal.newApiKey")}</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={draft.apiKey}
                      onChange={(e) => patch({ apiKey: e.target.value })}
                      placeholder={t("instanceModal.apiKeyKeepPlaceholder")}
                      disabled={loading}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="verifySsl"
                      checked={draft.verifySsl}
                      onCheckedChange={(checked) => patch({ verifySsl: checked as boolean })}
                      disabled={loading}
                    />
                    <Label htmlFor="verifySsl" className="cursor-pointer">
                      {t("instanceModal.verifySsl")}
                    </Label>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="protocol">{t("instanceModal.protocol")}</Label>
                    <Select
                      value={draft.protocol}
                      onValueChange={(value) => patch({ protocol: value })}
                      disabled={loading}
                    >
                      <SelectTrigger id="protocol">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="https">HTTPS</SelectItem>
                        <SelectItem value="http">HTTP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey" className="required">
                      {t("instanceModal.apiKey")}
                    </Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={draft.apiKey}
                      onChange={(e) => patch({ apiKey: e.target.value })}
                      placeholder={t("instanceModal.apiKeyPlaceholder")}
                      disabled={loading}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("instanceModal.apiKeyHint")}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="verifySsl"
                      checked={draft.verifySsl}
                      onCheckedChange={(checked) => patch({ verifySsl: checked as boolean })}
                      disabled={loading}
                    />
                    <Label htmlFor="verifySsl" className="cursor-pointer">
                      {t("instanceModal.verifySsl")}
                    </Label>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="timeout">{t("instanceModal.timeout")}</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={draft.timeout}
                  onChange={(e) => patch({ timeout: e.target.value })}
                  placeholder="10"
                  min="1"
                  max="300"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  {t("instanceModal.timeoutHint")}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="ssh" className="space-y-4 mt-4">
              <div className={isEdit ? "grid grid-cols-2 gap-4" : "space-y-4"}>
                <div className="space-y-2">
                  <Label htmlFor="sshUsername">{t("instanceModal.sshUsername")}</Label>
                  <Input
                    id="sshUsername"
                    value={draft.sshUsername}
                    onChange={(e) => patch({ sshUsername: e.target.value })}
                    placeholder="vyos"
                    disabled={loading}
                  />
                  {!isEdit && (
                    <p className="text-xs text-muted-foreground">
                      {t("instanceModal.sshUsernameHint")}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sshPort">{t("instanceModal.sshPort")}</Label>
                  <Input
                    id="sshPort"
                    type="number"
                    value={draft.sshPort}
                    onChange={(e) => patch({ sshPort: e.target.value })}
                    placeholder="22"
                    min="1"
                    max="65535"
                    disabled={loading}
                  />
                </div>
              </div>

              {!isEdit && (
                <p className="text-xs text-muted-foreground">
                  {t("instanceModal.sshHint")}
                </p>
              )}

              {isEdit && existing && (
                isAdmin ? (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-1">{t("instanceModal.sshKey")}</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {t("instanceModal.sshKeyHint")}
                    </p>
                    <SSHKeySetup
                      instanceId={existing.id}
                      sshUsername={draft.sshUsername || existing.ssh_username}
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/50 p-3 border-t mt-2">
                    <p className="text-sm text-muted-foreground">
                      {t("instanceModal.sshKeyAdminOnly")}
                    </p>
                  </div>
                )
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEdit ? tc("saving") : t("creating")}
                </>
              ) : isEdit ? (
                t("saveChanges")
              ) : (
                t("instanceModal.createButton")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
