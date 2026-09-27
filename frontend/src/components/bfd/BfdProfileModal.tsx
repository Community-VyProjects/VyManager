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
import { AlertCircle, Loader2 } from "lucide-react";
import type { BfdProfile } from "@/lib/api/bfd";

interface BfdProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (profile: BfdProfile) => Promise<void>;
  existingProfile?: BfdProfile | null;
}

export function BfdProfileModal({
  open,
  onOpenChange,
  onSubmit,
  existingProfile,
}: BfdProfileModalProps) {
  const t = useTranslations("bfd");
  const tc = useTranslations("common");
  const isEditMode = !!existingProfile;

  // Form state
  const [name, setName] = useState("");
  const [echoMode, setEchoMode] = useState(false);
  const [passive, setPassive] = useState(false);
  const [shutdown, setShutdown] = useState(false);
  const [transmit, setTransmit] = useState("");
  const [receive, setReceive] = useState("");
  const [echoInterval, setEchoInterval] = useState("");
  const [multiplier, setMultiplier] = useState("");
  const [minimumTtl, setMinimumTtl] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing or reset when creating
  useEffect(() => {
    if (open) {
      if (existingProfile) {
        setName(existingProfile.name);
        setEchoMode(existingProfile.echo_mode);
        setPassive(existingProfile.passive);
        setShutdown(existingProfile.shutdown);
        setTransmit(
          existingProfile.interval.transmit != null
            ? String(existingProfile.interval.transmit)
            : ""
        );
        setReceive(
          existingProfile.interval.receive != null
            ? String(existingProfile.interval.receive)
            : ""
        );
        setEchoInterval(
          existingProfile.interval.echo_interval != null
            ? String(existingProfile.interval.echo_interval)
            : ""
        );
        setMultiplier(
          existingProfile.interval.multiplier != null
            ? String(existingProfile.interval.multiplier)
            : ""
        );
        setMinimumTtl(
          existingProfile.minimum_ttl != null
            ? String(existingProfile.minimum_ttl)
            : ""
        );
      } else {
        resetForm();
      }
    }
  }, [open, existingProfile]);

  const resetForm = () => {
    setName("");
    setEchoMode(false);
    setPassive(false);
    setShutdown(false);
    setTransmit("");
    setReceive("");
    setEchoInterval("");
    setMultiplier("");
    setMinimumTtl("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): string | null => {
    if (!name.trim()) {
      return t("profileModal.nameRequired");
    }
    if (!/^[a-zA-Z0-9-]{1,32}$/.test(name.trim())) {
      return t("profileModal.nameInvalid");
    }

    if (transmit.trim()) {
      const val = parseInt(transmit.trim(), 10);
      if (isNaN(val) || val < 10 || val > 60000) {
        return t("validation.transmitRange");
      }
    }

    if (receive.trim()) {
      const val = parseInt(receive.trim(), 10);
      if (isNaN(val) || val < 10 || val > 60000) {
        return t("validation.receiveRange");
      }
    }

    if (echoInterval.trim()) {
      const val = parseInt(echoInterval.trim(), 10);
      if (isNaN(val) || val < 10 || val > 60000) {
        return t("validation.echoRange");
      }
    }

    if (multiplier.trim()) {
      const val = parseInt(multiplier.trim(), 10);
      if (isNaN(val) || val < 2 || val > 255) {
        return t("validation.multiplierRange");
      }
    }

    if (minimumTtl.trim()) {
      const val = parseInt(minimumTtl.trim(), 10);
      if (isNaN(val) || val < 1 || val > 254) {
        return t("validation.minTtlRange");
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profile: BfdProfile = {
        name: name.trim(),
        echo_mode: echoMode,
        interval: {
          transmit: transmit.trim()
            ? parseInt(transmit.trim(), 10)
            : null,
          receive: receive.trim()
            ? parseInt(receive.trim(), 10)
            : null,
          echo_interval: echoInterval.trim()
            ? parseInt(echoInterval.trim(), 10)
            : null,
          multiplier: multiplier.trim()
            ? parseInt(multiplier.trim(), 10)
            : null,
        },
        minimum_ttl: minimumTtl.trim()
          ? parseInt(minimumTtl.trim(), 10)
          : null,
        passive,
        shutdown,
      };

      await onSubmit(profile);
      handleClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : tc("operationFailed");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("profileModal.editTitle") : t("profileModal.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("profileModal.editDescription", { name: existingProfile?.name ?? "" })
              : t("profileModal.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 pb-2">
            {/* Profile Name */}
            <div className="space-y-2">
              <Label htmlFor="bfd-profile-name">{t("content.profileName")}</Label>
              <Input
                id="bfd-profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-profile"
                disabled={isEditMode}
                className={isEditMode ? "bg-muted" : ""}
                maxLength={32}
              />
              <p className="text-xs text-muted-foreground">
                {t("profileModal.nameHelp")}
              </p>
            </div>

            {/* Status & Mode Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("form.statusAndMode")}</h4>
              <div className="rounded-lg border p-3 space-y-4">
                {/* Shutdown */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bfd-profile-shutdown"
                    checked={shutdown}
                    onCheckedChange={(checked) =>
                      setShutdown(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bfd-profile-shutdown"
                      className="cursor-pointer"
                    >
                      {t("content.shutdown")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("profileModal.shutdownHelp")}
                    </p>
                  </div>
                </div>

                {/* Passive */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bfd-profile-passive"
                    checked={passive}
                    onCheckedChange={(checked) =>
                      setPassive(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bfd-profile-passive"
                      className="cursor-pointer"
                    >
                      {t("form.passiveMode")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("form.passiveHelp")}
                    </p>
                  </div>
                </div>

                {/* Echo Mode */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bfd-profile-echo-mode"
                    checked={echoMode}
                    onCheckedChange={(checked) =>
                      setEchoMode(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bfd-profile-echo-mode"
                      className="cursor-pointer"
                    >
                      {t("form.echoMode")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("form.echoModeHelp")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timer Intervals Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("form.timerIntervals")}</h4>
              <div className="grid grid-cols-2 gap-4">
                {/* Transmit Interval */}
                <div className="space-y-2">
                  <Label htmlFor="bfd-profile-transmit">
                    {t("form.transmitInterval")}
                  </Label>
                  <Input
                    id="bfd-profile-transmit"
                    type="number"
                    value={transmit}
                    onChange={(e) => setTransmit(e.target.value)}
                    placeholder="300"
                    min={10}
                    max={60000}
                  />
                </div>

                {/* Receive Interval */}
                <div className="space-y-2">
                  <Label htmlFor="bfd-profile-receive">
                    {t("form.receiveInterval")}
                  </Label>
                  <Input
                    id="bfd-profile-receive"
                    type="number"
                    value={receive}
                    onChange={(e) => setReceive(e.target.value)}
                    placeholder="300"
                    min={10}
                    max={60000}
                  />
                </div>

                {/* Echo Interval */}
                <div className="space-y-2">
                  <Label htmlFor="bfd-profile-echo-interval">
                    {t("form.echoInterval")}
                  </Label>
                  <Input
                    id="bfd-profile-echo-interval"
                    type="number"
                    value={echoInterval}
                    onChange={(e) => setEchoInterval(e.target.value)}
                    placeholder="10-60000"
                    min={10}
                    max={60000}
                  />
                </div>

                {/* Multiplier */}
                <div className="space-y-2">
                  <Label htmlFor="bfd-profile-multiplier">{t("content.multiplier")}</Label>
                  <Input
                    id="bfd-profile-multiplier"
                    type="number"
                    value={multiplier}
                    onChange={(e) => setMultiplier(e.target.value)}
                    placeholder="3"
                    min={2}
                    max={255}
                  />
                </div>
              </div>
            </div>

            {/* Advanced Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("form.advanced")}</h4>
              <div className="space-y-2">
                <Label htmlFor="bfd-profile-min-ttl">{t("form.minimumTtl")}</Label>
                <Input
                  id="bfd-profile-min-ttl"
                  type="number"
                  value={minimumTtl}
                  onChange={(e) => setMinimumTtl(e.target.value)}
                  placeholder="1-254"
                  min={1}
                  max={254}
                />
                <p className="text-xs text-muted-foreground">
                  {t("profileModal.minimumTtlHelp")}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Error Display */}
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
                {isEditMode ? tc("saving") : t("form.creating")}
              </>
            ) : isEditMode ? (
              t("form.saveChanges")
            ) : (
              t("profileModal.createProfile")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
