"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslations } from "next-intl";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import type { RipInterface, RipMd5Key } from "@/lib/api/rip";
import type { ApiError } from "@/lib/types/api";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { NONE_SENTINEL } from "@/lib/named-list-select-options";
import {
  MD5_KEY_ID_RANGE,
  PASSWORD_MAX_LENGTH,
  ripInterfaceProblem,
  ripNextKeyId,
  type RipAuthMode,
} from "@/lib/api/rip-save-ops";

const VERSIONS = ["1", "2"];

interface RipInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: RipInterface) => Promise<void>;
  existingInterface?: RipInterface | null;
  /** Interfaces RIP already configures; the Add picker leaves them out. */
  configuredInterfaces: string[];
}

/** Seeded from props on mount; the page remounts it with a new key on every open. */
export function RipInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
  configuredInterfaces,
}: RipInterfaceModalProps) {
  const t = useTranslations("rip");
  const tc = useTranslations("common");
  const isEditMode = !!existingInterface;

  const [name, setName] = useState(existingInterface?.name ?? "");
  const [authType, setAuthType] = useState<RipAuthMode>(
    (existingInterface?.authentication_type as RipAuthMode | null | undefined) || "",
  );
  const [md5Keys, setMd5Keys] = useState<RipMd5Key[]>(
    (existingInterface?.md5_keys ?? []).map((key) => ({ ...key })),
  );
  const [plaintextPassword, setPlaintextPassword] = useState(existingInterface?.plaintext_password ?? "");
  const [sendVersion, setSendVersion] = useState(existingInterface?.send_version ?? "");
  const [receiveVersion, setReceiveVersion] = useState(existingInterface?.receive_version ?? "");
  const [splitHorizon, setSplitHorizon] = useState(existingInterface?.split_horizon ?? "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  const addMd5Key = () => {
    setMd5Keys([...md5Keys, { key_id: ripNextKeyId(md5Keys, existingInterface?.md5_keys), password: "" }]);
  };

  const removeMd5Key = (idx: number) => {
    setMd5Keys(md5Keys.filter((_, i) => i !== idx));
  };

  const updateMd5Key = (idx: number, field: "key_id" | "password", value: string) => {
    const updated = [...md5Keys];
    updated[idx] = { ...updated[idx], [field]: value };
    setMd5Keys(updated);
  };

  const handleSubmit = async () => {
    const config: RipInterface = {
      name,
      authentication_type: authType || null,
      md5_keys: authType === "md5" ? md5Keys : [],
      plaintext_password: authType === "plaintext" ? plaintextPassword : null,
      send_version: sendVersion || null,
      receive_version: receiveVersion || null,
      split_horizon: splitHorizon || null,
    };

    const problem = ripInterfaceProblem(existingInterface ?? null, config);
    if (problem) {
      const max = problem === "md5KeyIdRange" ? MD5_KEY_ID_RANGE.max : PASSWORD_MAX_LENGTH;
      setError(t(`validation.${problem}`, { min: MD5_KEY_ID_RANGE.min, max }));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit(config);
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("interfaceModal.editTitle") : t("interfaceModal.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("interfaceModal.editDescription", { name: existingInterface?.name ?? "" })
              : t("interfaceModal.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5 pb-2">
            {/* Interface */}
            <div className="space-y-2">
              <Label htmlFor="rip-iface-name">{t("interfaces.interface")}</Label>
              <InterfaceSelect
                value={name}
                onValueChange={setName}
                disabled={isEditMode}
                id="rip-iface-name"
                className={isEditMode ? "bg-muted" : ""}
                placeholder={tc("selectInterface")}
                filter={(item) => isEditMode || !configuredInterfaces.includes(item.name)}
              />
            </div>

            {/* Authentication */}
            <div className="space-y-3">
              <Label htmlFor="rip-iface-auth">{t("interfaceModal.authentication")}</Label>
              <Select
                value={authType || NONE_SENTINEL}
                onValueChange={(v) => setAuthType(v === NONE_SENTINEL ? "" : (v as RipAuthMode))}
              >
                <SelectTrigger id="rip-iface-auth">
                  <SelectValue placeholder={tc("none")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SENTINEL}>{tc("none")}</SelectItem>
                  <SelectItem value="md5">{t("interfaceModal.md5")}</SelectItem>
                  <SelectItem value="plaintext">{t("interfaceModal.plaintext")}</SelectItem>
                </SelectContent>
              </Select>

              {authType === "md5" && (
                <div className="space-y-2 pl-2 border-l-2 border-border">
                  {md5Keys.map((key, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        type="number"
                        aria-label={t("interfaceModal.keyId")}
                        placeholder={t("interfaceModal.keyId")}
                        min={MD5_KEY_ID_RANGE.min}
                        max={MD5_KEY_ID_RANGE.max}
                        value={key.key_id}
                        onChange={(e) => updateMd5Key(idx, "key_id", e.target.value)}
                        className="w-24"
                      />
                      <Input
                        type="password"
                        autoComplete="new-password"
                        aria-label={t("interfaceModal.password")}
                        placeholder={t("interfaceModal.password")}
                        maxLength={PASSWORD_MAX_LENGTH}
                        value={key.password}
                        onChange={(e) => updateMd5Key(idx, "password", e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        aria-label={tc("delete")}
                        onClick={() => removeMd5Key(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addMd5Key}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t("interfaceModal.addKey")}
                  </Button>
                </div>
              )}

              {authType === "plaintext" && (
                <div className="pl-2 border-l-2 border-border">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    aria-label={t("interfaceModal.password")}
                    placeholder={t("interfaceModal.plaintextPlaceholder", { max: PASSWORD_MAX_LENGTH })}
                    maxLength={PASSWORD_MAX_LENGTH}
                    value={plaintextPassword}
                    onChange={(e) => setPlaintextPassword(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Send / Receive Version */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rip-iface-send">{t("interfaceModal.sendVersion")}</Label>
                <Select
                  value={sendVersion || NONE_SENTINEL}
                  onValueChange={(v) => setSendVersion(v === NONE_SENTINEL ? "" : v)}
                >
                  <SelectTrigger id="rip-iface-send">
                    <SelectValue placeholder={tc("default")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_SENTINEL}>{tc("default")}</SelectItem>
                    {VERSIONS.map((v) => (
                      <SelectItem key={v} value={v}>{t("versionOption", { value: v })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rip-iface-receive">{t("interfaceModal.receiveVersion")}</Label>
                <Select
                  value={receiveVersion || NONE_SENTINEL}
                  onValueChange={(v) => setReceiveVersion(v === NONE_SENTINEL ? "" : v)}
                >
                  <SelectTrigger id="rip-iface-receive">
                    <SelectValue placeholder={tc("default")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_SENTINEL}>{tc("default")}</SelectItem>
                    {VERSIONS.map((v) => (
                      <SelectItem key={v} value={v}>{t("versionOption", { value: v })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Split Horizon */}
            <div className="space-y-2">
              <Label htmlFor="rip-iface-split-horizon">{t("interfaces.splitHorizon")}</Label>
              <Select
                value={splitHorizon || NONE_SENTINEL}
                onValueChange={(v) => setSplitHorizon(v === NONE_SENTINEL ? "" : v)}
              >
                <SelectTrigger id="rip-iface-split-horizon">
                  <SelectValue placeholder={tc("default")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SENTINEL}>{tc("default")}</SelectItem>
                  <SelectItem value="disable">{t("interfaceModal.disable")}</SelectItem>
                  <SelectItem value="poison-reverse">{t("interfaceModal.poisonReverse")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <pre className="text-sm text-destructive whitespace-pre-wrap flex-1">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? tc("saving") : t("modal.adding")}
              </>
            ) : isEditMode ? (
              tc("saveChanges")
            ) : (
              tc("addInterface")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
