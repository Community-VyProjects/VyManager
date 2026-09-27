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
import { VrfSelect } from "@/components/ui/vrf-select";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import type { BfdPeer, BfdCapabilities } from "@/lib/api/bfd";

interface BfdPeerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (peer: BfdPeer) => Promise<void>;
  existingPeer?: BfdPeer | null;
  profiles: string[];
  capabilities?: BfdCapabilities | null;
}

export function BfdPeerModal({
  open,
  onOpenChange,
  onSubmit,
  existingPeer,
  profiles,
}: BfdPeerModalProps) {
  const t = useTranslations("bfd");
  const tc = useTranslations("common");
  const isEditMode = !!existingPeer;

  // Form state
  const [address, setAddress] = useState("");
  const [shutdown, setShutdown] = useState(false);
  const [passive, setPassive] = useState(false);
  const [echoMode, setEchoMode] = useState(false);
  const [multihop, setMultihop] = useState(false);
  const [transmit, setTransmit] = useState("");
  const [receive, setReceive] = useState("");
  const [echoInterval, setEchoInterval] = useState("");
  const [multiplier, setMultiplier] = useState("");
  const [profile, setProfile] = useState("");
  const [sourceAddress, setSourceAddress] = useState("");
  const [sourceInterface, setSourceInterface] = useState("");
  const [minimumTtl, setMinimumTtl] = useState("");
  const [vrf, setVrf] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing or when modal opens
  useEffect(() => {
    if (open) {
      if (existingPeer) {
        setAddress(existingPeer.address);
        setShutdown(existingPeer.shutdown);
        setPassive(existingPeer.passive);
        setEchoMode(existingPeer.echo_mode);
        setMultihop(existingPeer.multihop);
        setTransmit(
          existingPeer.interval.transmit != null
            ? String(existingPeer.interval.transmit)
            : ""
        );
        setReceive(
          existingPeer.interval.receive != null
            ? String(existingPeer.interval.receive)
            : ""
        );
        setEchoInterval(
          existingPeer.interval.echo_interval != null
            ? String(existingPeer.interval.echo_interval)
            : ""
        );
        setMultiplier(
          existingPeer.interval.multiplier != null
            ? String(existingPeer.interval.multiplier)
            : ""
        );
        setProfile(existingPeer.profile || "");
        setSourceAddress(existingPeer.source.address || "");
        setSourceInterface(existingPeer.source.interface || "");
        setMinimumTtl(
          existingPeer.minimum_ttl != null
            ? String(existingPeer.minimum_ttl)
            : ""
        );
        setVrf(existingPeer.vrf || "");
      } else {
        resetForm();
      }
    }
  }, [open, existingPeer]);

  const resetForm = () => {
    setAddress("");
    setShutdown(false);
    setPassive(false);
    setEchoMode(false);
    setMultihop(false);
    setTransmit("");
    setReceive("");
    setEchoInterval("");
    setMultiplier("");
    setProfile("");
    setSourceAddress("");
    setSourceInterface("");
    setMinimumTtl("");
    setVrf("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): string | null => {
    if (!address.trim()) {
      return t("peerModal.addressRequired");
    }

    if (!address.includes(".") && !address.includes(":")) {
      return t("peerModal.addressInvalid");
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
      if (!multihop) {
        return t("validation.minTtlRequiresMultihop");
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
      const peer: BfdPeer = {
        address: address.trim(),
        echo_mode: echoMode,
        interval: {
          echo_interval: echoInterval.trim()
            ? parseInt(echoInterval.trim(), 10)
            : null,
          multiplier: multiplier.trim()
            ? parseInt(multiplier.trim(), 10)
            : null,
          receive: receive.trim() ? parseInt(receive.trim(), 10) : null,
          transmit: transmit.trim() ? parseInt(transmit.trim(), 10) : null,
        },
        minimum_ttl: minimumTtl.trim()
          ? parseInt(minimumTtl.trim(), 10)
          : null,
        multihop,
        passive,
        profile: profile && profile !== "__none__" ? profile : null,
        shutdown,
        source: {
          address: sourceAddress.trim() || null,
          interface: sourceInterface.trim() || null,
        },
        vrf: vrf.trim() || null,
      };

      await onSubmit(peer);
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
            {isEditMode ? t("peerModal.editTitle") : t("peerModal.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("peerModal.editDescription", { address: existingPeer?.address ?? "" })
              : t("peerModal.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 pb-2">
            {/* Peer Address */}
            <div className="space-y-2">
              <Label htmlFor="bfd-peer-address">{t("content.peerAddress")}</Label>
              <Input
                id="bfd-peer-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("peerModal.addressPlaceholder")}
                disabled={isEditMode}
                className={isEditMode ? "bg-muted" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {t("peerModal.addressHelp")}
              </p>
            </div>

            {/* Status & Mode Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("form.statusAndMode")}</h4>
              <div className="space-y-3 rounded-lg border p-3">
                {/* Shutdown */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bfd-peer-shutdown"
                    checked={shutdown}
                    onCheckedChange={(checked) =>
                      setShutdown(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bfd-peer-shutdown"
                      className="cursor-pointer text-destructive"
                    >
                      {t("content.shutdown")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("peerModal.shutdownHelp")}
                    </p>
                  </div>
                </div>

                {/* Passive */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bfd-peer-passive"
                    checked={passive}
                    onCheckedChange={(checked) =>
                      setPassive(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bfd-peer-passive"
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
                    id="bfd-peer-echo-mode"
                    checked={echoMode}
                    onCheckedChange={(checked) =>
                      setEchoMode(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bfd-peer-echo-mode"
                      className="cursor-pointer"
                    >
                      {t("form.echoMode")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("form.echoModeHelp")}
                    </p>
                  </div>
                </div>

                {/* Multihop */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bfd-peer-multihop"
                    checked={multihop}
                    onCheckedChange={(checked) =>
                      setMultihop(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bfd-peer-multihop"
                      className="cursor-pointer"
                    >
                      {t("content.multihop")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("peerModal.multihopHelp")}
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
                  <Label htmlFor="bfd-peer-transmit">
                    {t("form.transmitInterval")}
                  </Label>
                  <Input
                    id="bfd-peer-transmit"
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
                  <Label htmlFor="bfd-peer-receive">
                    {t("form.receiveInterval")}
                  </Label>
                  <Input
                    id="bfd-peer-receive"
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
                  <Label htmlFor="bfd-peer-echo-interval">
                    {t("form.echoInterval")}
                  </Label>
                  <Input
                    id="bfd-peer-echo-interval"
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
                  <Label htmlFor="bfd-peer-multiplier">{t("content.multiplier")}</Label>
                  <Input
                    id="bfd-peer-multiplier"
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
              <div className="space-y-4">
                {/* Profile */}
                <div className="space-y-2">
                  <Label htmlFor="bfd-peer-profile">{t("content.profile")}</Label>
                  <Select value={profile} onValueChange={setProfile}>
                    <SelectTrigger id="bfd-peer-profile">
                      <SelectValue placeholder={t("peerModal.profilePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{tc("none")}</SelectItem>
                      {profiles.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t("peerModal.profileHelp")}
                  </p>
                </div>

                {/* Source Address */}
                <div className="space-y-2">
                  <Label htmlFor="bfd-peer-source-address">
                    {t("peerModal.sourceAddress")}
                  </Label>
                  <Input
                    id="bfd-peer-source-address"
                    value={sourceAddress}
                    onChange={(e) => setSourceAddress(e.target.value)}
                    placeholder={t("peerModal.sourceAddressPlaceholder")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("peerModal.sourceAddressHelp")}
                  </p>
                </div>

                {/* Source Interface */}
                <div className="space-y-2">
                  <Label htmlFor="bfd-peer-source-interface">
                    {t("peerModal.sourceInterface")}
                  </Label>
                  <Input
                    id="bfd-peer-source-interface"
                    value={sourceInterface}
                    onChange={(e) => setSourceInterface(e.target.value)}
                    placeholder={t("peerModal.sourceInterfacePlaceholder")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("peerModal.sourceInterfaceHelp")}
                  </p>
                </div>

                {/* Minimum TTL - only relevant when multihop is enabled */}
                {multihop && (
                  <div className="space-y-2">
                    <Label htmlFor="bfd-peer-minimum-ttl">
                      {t("form.minimumTtl")}
                    </Label>
                    <Input
                      id="bfd-peer-minimum-ttl"
                      type="number"
                      value={minimumTtl}
                      onChange={(e) => setMinimumTtl(e.target.value)}
                      placeholder="1-254"
                      min={1}
                      max={254}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("form.minimumTtlHelp")}
                    </p>
                  </div>
                )}

                {/* VRF */}
                <div className="space-y-2">
                  <Label htmlFor="bfd-peer-vrf">VRF</Label>
                  <VrfSelect
                    id="bfd-peer-vrf"
                    value={vrf}
                    onValueChange={setVrf}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("peerModal.vrfHelp")}
                  </p>
                </div>
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
              t("content.addPeer")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
