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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  snmpService,
  SNMPv3User,
  SNMPCapabilities,
  SNMPv3CredentialUpdate,
} from "@/lib/api/snmp";
import { SNMPv3CredentialFields } from "./SNMPv3CredentialFields";

interface SNMPv3UserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: SNMPv3User | null;
  existingNames: string[];
  groupNames: string[];
  capabilities: SNMPCapabilities;
  onSuccess: () => void;
}

const DEFAULT = "__default__";

export function SNMPv3UserModal({
  open,
  onOpenChange,
  existing,
  existingNames,
  groupNames,
  capabilities,
  onSuccess,
}: SNMPv3UserModalProps) {
  const t = useTranslations("snmp");
  const tc = useTranslations("common");
  const isEdit = existing !== null;
  const v3 = capabilities.features.v3;

  const [name, setName] = useState(existing?.name ?? "");
  const [group, setGroup] = useState(existing?.group ?? "");
  const [mode, setMode] = useState(existing?.mode ?? DEFAULT);

  const [authEnabled, setAuthEnabled] = useState(!!existing?.auth?.type ||
    !!existing?.auth?.encrypted_password || !!existing?.auth?.plaintext_password);
  const [auth, setAuth] = useState<SNMPv3CredentialUpdate>({
    type: existing?.auth?.type ?? "",
    passwordMode: existing?.auth?.encrypted_password ? "encrypted" : "plaintext",
    password: "",
  });

  const [privacyEnabled, setPrivacyEnabled] = useState(!!existing?.privacy?.type ||
    !!existing?.privacy?.encrypted_password || !!existing?.privacy?.plaintext_password);
  const [privacy, setPrivacy] = useState<SNMPv3CredentialUpdate>({
    type: existing?.privacy?.type ?? "",
    passwordMode: existing?.privacy?.encrypted_password ? "encrypted" : "plaintext",
    password: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const n = name.trim();
    if (!n) {
      setError(t("user.nameRequired"));
      return;
    }
    if (!isEdit && existingNames.includes(n)) {
      setError(t("user.exists", { name: n }));
      return;
    }
    if (privacyEnabled && !authEnabled) {
      setError(t("validation.privacyRequiresAuth"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await snmpService.saveV3User(existing, {
        name: n,
        group: group.trim(),
        mode: mode === DEFAULT ? "" : mode,
        authEnabled,
        auth,
        privacyEnabled,
        privacy,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("user.editTitle") : t("user.addTitle")}</DialogTitle>
          <DialogDescription>
            {t("user.description")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="user-name">{t("content.username")}</Label>
              <Input
                id="user-name"
                placeholder={t("user.namePlaceholder")}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                disabled={isEdit}
                className={isEdit ? "font-mono bg-muted" : "font-mono"}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t("content.group")}</Label>
                {groupNames.length > 0 ? (
                  <Select
                    value={group === "" ? DEFAULT : group}
                    onValueChange={(v) => setGroup(v === DEFAULT ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("user.selectGroup")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DEFAULT}>{tc("none")}</SelectItem>
                      {groupNames.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder={t("user.groupNamePlaceholder")}
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="font-mono"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t("group.accessMode")}</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DEFAULT}>{t("group.defaultReadOnly")}</SelectItem>
                    {v3.mode_values.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m === "ro" ? t("community.readOnlyRo") : t("community.readWriteRw")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <SNMPv3CredentialFields
              title={t("credential.authTitle")}
              description={t("credential.authDescription")}
              typeOptions={v3.auth_types}
              enabled={authEnabled}
              onEnabledChange={setAuthEnabled}
              value={auth}
              onChange={setAuth}
              original={existing?.auth ?? null}
              idPrefix="user-auth"
            />

            <SNMPv3CredentialFields
              title={t("credential.privacyTitle")}
              description={t("credential.privacyDescription")}
              typeOptions={v3.privacy_types}
              enabled={privacyEnabled}
              onEnabledChange={setPrivacyEnabled}
              value={privacy}
              onChange={setPrivacy}
              original={existing?.privacy ?? null}
              idPrefix="user-privacy"
            />
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? tc("save") : tc("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
