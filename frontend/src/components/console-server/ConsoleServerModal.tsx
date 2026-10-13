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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { ConsoleDevice } from "@/lib/api/console-server";

interface ConsoleServerModalProps {
  open: boolean;
  device: ConsoleDevice | null;
  onClose: () => void;
  onSubmit: (updated: ConsoleDevice) => Promise<void>;
}

const SPEED_OPTIONS = ["300", "1200", "2400", "4800", "9600", "19200", "38400", "57600", "115200"];
const DATA_BITS_OPTIONS = ["7", "8"];
const PARITY_OPTIONS = ["none", "even", "odd"];
const STOP_BITS_OPTIONS = ["1", "2"];

export function ConsoleServerModal({ open, device, onClose, onSubmit }: ConsoleServerModalProps) {
  const t = useTranslations("consoleServer");
  const tc = useTranslations("common");
  const isEditing = device !== null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Device Identity
  const [deviceName, setDeviceName] = useState("");
  const [alias, setAlias] = useState("");
  const [description, setDescription] = useState("");

  // Serial Parameters
  const [speed, setSpeed] = useState("");
  const [dataBits, setDataBits] = useState("");
  const [parity, setParity] = useState("");
  const [stopBits, setStopBits] = useState("");

  // Remote Access
  const [sshPort, setSshPort] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);

    if (device) {
      setDeviceName(device.name);
      setAlias(device.alias ?? "");
      setDescription(device.description ?? "");
      setSpeed(device.speed ?? "");
      setDataBits(device.data_bits ?? "");
      setParity(device.parity ?? "");
      setStopBits(device.stop_bits ?? "");
      setSshPort(device.ssh?.port != null ? String(device.ssh.port) : "");
    } else {
      setDeviceName("");
      setAlias("");
      setDescription("");
      setSpeed("");
      setDataBits("");
      setParity("");
      setStopBits("");
      setSshPort("");
    }
  }, [open, device]);

  function validate(): string | null {
    if (!deviceName.trim()) return t("modal.nameRequired");
    if (alias.length > 128) return t("modal.aliasTooLong");
    if (description.length > 255) return t("modal.descriptionTooLong");
    if (sshPort) {
      const port = parseInt(sshPort, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        return t("modal.sshPortRange");
      }
    }
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const sshPortNum = sshPort ? parseInt(sshPort, 10) : null;
      const updated: ConsoleDevice = {
        name: deviceName.trim(),
        alias: alias.trim() || null,
        description: description.trim() || null,
        speed: speed || null,
        data_bits: dataBits || null,
        parity: parity || null,
        stop_bits: stopBits || null,
        ssh: sshPortNum != null ? { port: sshPortNum } : null,
      };
      await onSubmit(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("modal.unexpectedError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("modal.editTitle") : t("modal.addTitle")}</DialogTitle>
          <DialogDescription>
            {t("modal.description")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 min-h-0">
          <div className="space-y-6 py-2">
            {/* Device Identity */}
            <div className="space-y-4">
              <p className="text-sm font-medium">{t("modal.deviceIdentity")}</p>

              <div className="space-y-1.5">
                <Label htmlFor="device-name" className="text-xs">
                  {t("modal.deviceName")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="device-name"
                  placeholder={t("modal.deviceNamePlaceholder")}
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  disabled={isEditing}
                  className="font-mono"
                />
                {isEditing && (
                  <p className="text-xs text-muted-foreground">
                    {t("modal.deviceNameLocked")}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="device-alias" className="text-xs">
                  {t("modal.alias")} <span className="text-muted-foreground">{t("modal.optionalSuffix")}</span>
                </Label>
                <Input
                  id="device-alias"
                  placeholder={t("modal.aliasPlaceholder")}
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  maxLength={128}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="device-description" className="text-xs">
                  {tc("description")} <span className="text-muted-foreground">{t("modal.optionalSuffix")}</span>
                </Label>
                <Input
                  id="device-description"
                  placeholder={t("modal.descriptionPlaceholder")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={255}
                />
              </div>
            </div>

            <Separator />

            {/* Serial Parameters */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{t("modal.serialParameters")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("modal.serialParametersHint")}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">{t("modal.speed")}</Label>
                <Select value={speed} onValueChange={setSpeed}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("modal.defaultValue", { value: "9600" })} />
                  </SelectTrigger>
                  <SelectContent>
                    {SPEED_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s} className="font-mono">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("modal.dataBits")}</Label>
                  <Select value={dataBits} onValueChange={setDataBits}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("modal.defaultValue", { value: "8" })} />
                    </SelectTrigger>
                    <SelectContent>
                      {DATA_BITS_OPTIONS.map((b) => (
                        <SelectItem key={b} value={b} className="font-mono">
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{t("modal.parity")}</Label>
                  <Select value={parity} onValueChange={setParity}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("modal.defaultValue", { value: "none" })} />
                    </SelectTrigger>
                    <SelectContent>
                      {PARITY_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p} className="font-mono">
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{t("modal.stopBits")}</Label>
                  <Select value={stopBits} onValueChange={setStopBits}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("modal.defaultValue", { value: "1" })} />
                    </SelectTrigger>
                    <SelectContent>
                      {STOP_BITS_OPTIONS.map((b) => (
                        <SelectItem key={b} value={b} className="font-mono">
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Remote Access */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{t("modal.remoteAccess")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("modal.remoteAccessHint")}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ssh-port" className="text-xs">
                  {t("modal.sshPort")} <span className="text-muted-foreground">{t("modal.optionalSuffix")}</span>
                </Label>
                <Input
                  id="ssh-port"
                  type="number"
                  placeholder={t("modal.sshPortPlaceholder")}
                  min={1}
                  max={65535}
                  value={sshPort}
                  onChange={(e) => setSshPort(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("modal.sshPortHint")}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 shrink-0 mt-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive whitespace-pre-wrap font-mono">{error}</p>
          </div>
        )}

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? tc("saveChanges") : t("content.addDevice")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
