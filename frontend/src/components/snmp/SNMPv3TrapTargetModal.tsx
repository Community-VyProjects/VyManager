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
  SNMPv3TrapTarget,
  SNMPCapabilities,
  SNMPv3CredentialUpdate,
} from "@/lib/api/snmp";
import { SNMPv3CredentialFields } from "./SNMPv3CredentialFields";
import { isValidIP } from "./SNMPMultiValueField";

interface SNMPv3TrapTargetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: SNMPv3TrapTarget | null;
  existingAddresses: string[];
  userNames: string[];
  capabilities: SNMPCapabilities;
  onSuccess: () => void;
}

const DEFAULT = "__default__";

export function SNMPv3TrapTargetModal({
  open,
  onOpenChange,
  existing,
  existingAddresses,
  userNames,
  capabilities,
  onSuccess,
}: SNMPv3TrapTargetModalProps) {
  const t = useTranslations("snmp");
  const tc = useTranslations("common");
  const isEdit = existing !== null;
  const v3 = capabilities.features.v3;

  const [address, setAddress] = useState(existing?.address ?? "");
  const [user, setUser] = useState(existing?.user ?? "");
  const [type, setType] = useState(existing?.type ?? DEFAULT);
  const [protocol, setProtocol] = useState(existing?.protocol ?? DEFAULT);
  const [port, setPort] = useState(existing?.port ?? "");

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
    const addr = address.trim();
    if (!addr) {
      setError(t("trap.addressRequired"));
      return;
    }
    if (!isValidIP(addr)) {
      setError(t("validation.invalidIp"));
      return;
    }
    if (!isEdit && existingAddresses.includes(addr)) {
      setError(t("trap.exists", { address: addr }));
      return;
    }
    if (privacyEnabled && !authEnabled) {
      setError(t("validation.privacyRequiresAuth"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await snmpService.saveV3TrapTarget(existing, {
        address: addr,
        user: user.trim(),
        type: type === DEFAULT ? "" : type,
        protocol: protocol === DEFAULT ? "" : protocol,
        port,
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
          <DialogTitle>
            {isEdit ? t("v3Trap.editTitle") : t("v3Trap.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("v3Trap.description")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="v3trap-address">{t("trap.targetAddress")}</Label>
              <Input
                id="v3trap-address"
                placeholder={t("trap.addressPlaceholder")}
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setError(null);
                }}
                disabled={isEdit}
                className={isEdit ? "font-mono bg-muted" : "font-mono"}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("content.user")}</Label>
              {userNames.length > 0 ? (
                <Select
                  value={user === "" ? DEFAULT : user}
                  onValueChange={(v) => setUser(v === DEFAULT ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("v3Trap.selectUser")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DEFAULT}>{tc("none")}</SelectItem>
                    {userNames.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder={t("v3Trap.usernamePlaceholder")}
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  className="font-mono"
                />
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t("content.type")}</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DEFAULT}>{t("v3Trap.defaultInform")}</SelectItem>
                    {v3.trap_type_values.map((tv) => (
                      <SelectItem key={tv} value={tv}>
                        {tv === "inform" ? t("v3Trap.inform") : t("v3Trap.trap")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t("content.protocol")}</Label>
                <Select value={protocol} onValueChange={setProtocol}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DEFAULT}>{t("general.defaultValue", { value: "UDP" })}</SelectItem>
                    {v3.trap_protocol_values.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v3trap-port" className="text-sm font-medium">
                  {t("content.port")}
                </Label>
                <Input
                  id="v3trap-port"
                  type="number"
                  min={1}
                  max={65535}
                  placeholder={v3.default_trap_port}
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                />
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
              idPrefix="v3trap-auth"
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
              idPrefix="v3trap-privacy"
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
