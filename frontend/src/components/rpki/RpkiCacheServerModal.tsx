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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import type { RpkiCacheServer } from "@/lib/api/rpki";
import { pkiService } from "@/lib/api/pki";

interface RpkiCacheServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (server: RpkiCacheServer) => Promise<void>;
  existingServer?: RpkiCacheServer | null;
}

export function RpkiCacheServerModal({
  open,
  onOpenChange,
  onSubmit,
  existingServer,
}: RpkiCacheServerModalProps) {
  const t = useTranslations("rpki");
  const tc = useTranslations("common");
  const isEditMode = !!existingServer;

  const [address, setAddress] = useState("");
  const [port, setPort] = useState("");
  const [preference, setPreference] = useState("");
  const [sourceAddress, setSourceAddress] = useState("");
  const [sshEnabled, setSshEnabled] = useState(false);
  const [sshKey, setSshKey] = useState("");
  const [sshUsername, setSshUsername] = useState("");
  const [opensshKeys, setOpensshKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setAddress("");
    setPort("");
    setPreference("");
    setSourceAddress("");
    setSshEnabled(false);
    setSshKey("");
    setSshUsername("");
    setError(null);
  };

  useEffect(() => {
    if (open) {
      pkiService.getConfig().then((pki) => {
        setOpensshKeys(pki.openssh.map((k) => k.name));
      }).catch(() => {
        setOpensshKeys([]);
      });

      if (existingServer) {
        setAddress(existingServer.address);
        setPort(existingServer.port != null ? String(existingServer.port) : "");
        setPreference(existingServer.preference != null ? String(existingServer.preference) : "");
        setSourceAddress(existingServer.source_address ?? "");
        setSshEnabled(existingServer.ssh != null);
        setSshKey(existingServer.ssh?.key ?? "");
        setSshUsername(existingServer.ssh?.username ?? "");
        setError(null);
      } else {
        resetForm();
      }
    }
  }, [open, existingServer]);

  const validateForm = (): string | null => {
    if (!address.trim()) return t("modal.addressRequired");

    if (port) {
      const p = parseInt(port, 10);
      if (isNaN(p) || p < 1 || p > 65535) return t("modal.portRange");
    }

    if (preference) {
      const pref = parseInt(preference, 10);
      if (isNaN(pref) || pref < 1 || pref > 255) return t("modal.preferenceRange");
    }

    if (sshEnabled && !sshKey.trim() && !sshUsername.trim()) {
      return t("modal.sshRequired");
    }

    return null;
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    const server: RpkiCacheServer = {
      address: address.trim(),
      port: port ? parseInt(port, 10) : null,
      preference: preference ? parseInt(preference, 10) : null,
      source_address: sourceAddress.trim() || null,
      ssh: sshEnabled
        ? { key: sshKey.trim() || null, username: sshUsername.trim() || null }
        : null,
    };

    try {
      await onSubmit(server);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("modal.editTitle") : t("servers.add")}
          </DialogTitle>
          <DialogDescription>
            {t("modal.description")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5 py-2">
            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="rpki-address">{t("modal.address")}</Label>
              <Input
                id="rpki-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("modal.addressPlaceholder")}
                disabled={isEditMode}
                className={isEditMode ? "bg-muted" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {t("modal.addressHelp")}
              </p>
            </div>

            {/* Connection Settings */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="rpki-port">{t("servers.port")}</Label>
                  <Input
                    id="rpki-port"
                    type="number"
                    min={1}
                    max={65535}
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder={tc("optional")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rpki-preference">{t("servers.preference")}</Label>
                  <Input
                    id="rpki-preference"
                    type="number"
                    min={1}
                    max={255}
                    value={preference}
                    onChange={(e) => setPreference(e.target.value)}
                    placeholder={t("modal.preferencePlaceholder")}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rpki-source-address">{t("servers.sourceAddress")}</Label>
                <Input
                  id="rpki-source-address"
                  value={sourceAddress}
                  onChange={(e) => setSourceAddress(e.target.value)}
                  placeholder={t("modal.sourceAddressPlaceholder")}
                />
              </div>
            </div>

            {/* SSH Transport */}
            <div className="rounded-md border border-border p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="rpki-ssh-enabled"
                  checked={sshEnabled}
                  onCheckedChange={(checked) => setSshEnabled(checked === true)}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="rpki-ssh-enabled" className="cursor-pointer">
                    {t("modal.useSsh")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("modal.useSshHelp")}
                  </p>
                </div>
              </div>

              {sshEnabled && (
                <div className="pl-7 space-y-3">
                  <div className="space-y-1.5">
                    <Label>{t("modal.sshKey")}</Label>
                    {opensshKeys.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-1">
                        {t("modal.noSshKeys")}
                      </p>
                    ) : (
                      <>
                        <Select value={sshKey} onValueChange={setSshKey}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("modal.selectKey")} />
                          </SelectTrigger>
                          <SelectContent>
                            {opensshKeys.map((name) => (
                              <SelectItem key={name} value={name}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {t("modal.keyHelp")}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rpki-ssh-username">{t("modal.sshUsername")}</Label>
                    <Input
                      id="rpki-ssh-username"
                      value={sshUsername}
                      onChange={(e) => setSshUsername(e.target.value)}
                      placeholder={t("modal.usernamePlaceholder")}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? tc("saving") : t("modal.creating")}
              </>
            ) : isEditMode ? (
              t("modal.saveChanges")
            ) : (
              t("servers.add")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
