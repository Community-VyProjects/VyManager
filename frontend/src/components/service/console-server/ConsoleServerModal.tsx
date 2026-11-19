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
import {
  consoleServerService,
  ConsoleDevice,
  ConsoleServerCapabilities,
} from "@/lib/api/console-server";

interface ConsoleServerModalProps {
  open: boolean;
  device: ConsoleDevice | null;
  onClose: () => void;
  onSubmit: (updated: ConsoleDevice) => Promise<void>;
}

const NONE = "__none__";

function featureOptions(
  capabilities: ConsoleServerCapabilities | null,
  key: string,
  current: string,
): string[] {
  const feature = capabilities?.features[key];
  const raw =
    feature && typeof feature === "object" && "options" in feature
      ? (feature as { options?: unknown }).options
      : undefined;
  const options = Array.isArray(raw)
    ? raw.filter((value): value is string => typeof value === "string" && value !== "" && value !== NONE)
    : [];
  if (current && !options.includes(current)) return [...options, current];
  return options;
}

function sshPortNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return Number(trimmed);
}

function OptionSelect({
  id,
  label,
  value,
  options,
  noneLabel,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  noneLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Select value={value || NONE} onValueChange={(next) => onChange(next === NONE ? "" : next)}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{noneLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option} className="font-mono">
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ConsoleServerModal({ open, device, onClose, onSubmit }: ConsoleServerModalProps) {
  const t = useTranslations("consoleServer");
  const tc = useTranslations("common");
  const isEditing = device !== null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<ConsoleServerCapabilities | null>(null);

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
    let cancelled = false;
    consoleServerService.getCapabilities().then((caps) => {
      if (!cancelled) setCapabilities(caps);
    }).catch(() => {
      if (!cancelled) setError(t("modal.capabilitiesFailed"));
    });

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
    return () => {
      cancelled = true;
    };
  }, [open, device, t]);

  function validate(): string | null {
    if (!deviceName.trim()) return t("modal.nameRequired");
    if (!isEditing && !/^(ttyS\d+|usb\d+b.*p.*)$/.test(deviceName.trim())) {
      return t("modal.deviceNameInvalid");
    }
    const trimmedAlias = alias.trim();
    if (trimmedAlias.length > 128) return t("modal.aliasTooLong");
    if (trimmedAlias && !/^[-_a-zA-Z0-9.]+$/.test(trimmedAlias)) {
      return t("modal.aliasInvalid");
    }
    if (description.length > 255) return t("modal.descriptionTooLong");
    const port = sshPort.trim();
    if (port && (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)) {
      return t("modal.sshPortRange");
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
      const port = sshPortNumber(sshPort);
      const updated: ConsoleDevice = {
        name: deviceName.trim(),
        alias: alias.trim() || null,
        description: description.trim() || null,
        speed: speed || null,
        data_bits: dataBits || null,
        parity: parity || null,
        stop_bits: stopBits || null,
        ssh: port != null ? { port } : null,
      };
      await onSubmit(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(message || t("modal.unexpectedError"));
    } finally {
      setLoading(false);
    }
  }

  const noneLabel = tc("notSet");

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
              <p className="text-sm font-medium">{t("modal.serialParameters")}</p>

              <OptionSelect
                id="device-speed"
                label={t("modal.speed")}
                value={speed}
                options={featureOptions(capabilities, "speed", speed)}
                noneLabel={noneLabel}
                onChange={setSpeed}
              />

              <div className="grid grid-cols-3 gap-3">
                <OptionSelect
                  id="device-data-bits"
                  label={t("modal.dataBits")}
                  value={dataBits}
                  options={featureOptions(capabilities, "data_bits", dataBits)}
                  noneLabel={noneLabel}
                  onChange={setDataBits}
                />
                <OptionSelect
                  id="device-parity"
                  label={t("modal.parity")}
                  value={parity}
                  options={featureOptions(capabilities, "parity", parity)}
                  noneLabel={noneLabel}
                  onChange={setParity}
                />
                <OptionSelect
                  id="device-stop-bits"
                  label={t("modal.stopBits")}
                  value={stopBits}
                  options={featureOptions(capabilities, "stop_bits", stopBits)}
                  noneLabel={noneLabel}
                  onChange={setStopBits}
                />
              </div>
            </div>

            <Separator />

            {/* Remote Access */}
            <div className="space-y-4">
              <p className="text-sm font-medium">{t("modal.remoteAccess")}</p>

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
