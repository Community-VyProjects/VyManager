"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import type { BabelInterface, BabelCapabilities } from "@/lib/api/babel";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { useTranslations } from "next-intl";

interface BabelInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: BabelInterface) => Promise<void>;
  existingInterface?: BabelInterface | null;
  capabilities?: BabelCapabilities | null;
}

export function BabelInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
}: BabelInterfaceModalProps) {
  const t = useTranslations("babel");
  const tc = useTranslations("common");
  const isEditMode = !!existingInterface;

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [channel, setChannel] = useState("");
  const [splitHorizon, setSplitHorizon] = useState("");
  const [enableTimestamps, setEnableTimestamps] = useState(false);
  const [helloInterval, setHelloInterval] = useState("");
  const [updateInterval, setUpdateInterval] = useState("");
  const [rxcost, setRxcost] = useState("");
  const [maxRttPenalty, setMaxRttPenalty] = useState("");
  const [rttDecay, setRttDecay] = useState("");
  const [rttMin, setRttMin] = useState("");
  const [rttMax, setRttMax] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);

  const loadInterfaces = async () => {
    try {
      const response = await showService.getAllInterfaces();
      setAvailableInterfaces(response.interfaces);
    } catch (err) {
      console.error("Failed to load interfaces:", err);
    }
  };

  // Populate form when editing or when modal opens
  useEffect(() => {
    if (open) {
      loadInterfaces();
      if (existingInterface) {
        setName(existingInterface.name);
        setType(existingInterface.type || "");
        setChannel(existingInterface.channel || "");
        setSplitHorizon(existingInterface.split_horizon || "");
        setEnableTimestamps(existingInterface.enable_timestamps);
        setHelloInterval(
          existingInterface.hello_interval != null
            ? String(existingInterface.hello_interval)
            : ""
        );
        setUpdateInterval(
          existingInterface.update_interval != null
            ? String(existingInterface.update_interval)
            : ""
        );
        setRxcost(
          existingInterface.rxcost != null
            ? String(existingInterface.rxcost)
            : ""
        );
        setMaxRttPenalty(
          existingInterface.max_rtt_penalty != null
            ? String(existingInterface.max_rtt_penalty)
            : ""
        );
        setRttDecay(
          existingInterface.rtt_decay != null
            ? String(existingInterface.rtt_decay)
            : ""
        );
        setRttMin(
          existingInterface.rtt_min != null
            ? String(existingInterface.rtt_min)
            : ""
        );
        setRttMax(
          existingInterface.rtt_max != null
            ? String(existingInterface.rtt_max)
            : ""
        );
      } else {
        resetForm();
      }
    }
  }, [open, existingInterface]);

  const resetForm = () => {
    setName("");
    setType("");
    setChannel("");
    setSplitHorizon("");
    setEnableTimestamps(false);
    setHelloInterval("");
    setUpdateInterval("");
    setRxcost("");
    setMaxRttPenalty("");
    setRttDecay("");
    setRttMin("");
    setRttMax("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): string | null => {
    if (!name) {
      return t("interfaceModal.selectInterface");
    }

    if (channel.trim()) {
      const channelVal = channel.trim();
      if (
        channelVal !== "interfering" &&
        channelVal !== "non-interfering"
      ) {
        const num = parseInt(channelVal, 10);
        if (isNaN(num) || num < 1 || num > 254) {
          return t("interfaceModal.channelInvalid");
        }
      }
    }

    if (helloInterval.trim()) {
      const val = parseInt(helloInterval.trim(), 10);
      if (isNaN(val) || val < 20 || val > 655340) {
        return t("interfaceModal.helloIntervalRange");
      }
    }

    if (updateInterval.trim()) {
      const val = parseInt(updateInterval.trim(), 10);
      if (isNaN(val) || val < 20 || val > 655340) {
        return t("interfaceModal.updateIntervalRange");
      }
    }

    if (rxcost.trim()) {
      const val = parseInt(rxcost.trim(), 10);
      if (isNaN(val) || val < 1 || val > 65534) {
        return t("interfaceModal.rxCostRange");
      }
    }

    if (maxRttPenalty.trim()) {
      const val = parseInt(maxRttPenalty.trim(), 10);
      if (isNaN(val) || val < 0 || val > 65535) {
        return t("interfaceModal.maxRttPenaltyRange");
      }
    }

    if (rttDecay.trim()) {
      const val = parseInt(rttDecay.trim(), 10);
      if (isNaN(val) || val < 1 || val > 256) {
        return t("interfaceModal.rttDecayRange");
      }
    }

    if (rttMin.trim()) {
      const val = parseInt(rttMin.trim(), 10);
      if (isNaN(val) || val < 1 || val > 65535) {
        return t("interfaceModal.rttMinRange");
      }
    }

    if (rttMax.trim()) {
      const val = parseInt(rttMax.trim(), 10);
      if (isNaN(val) || val < 1 || val > 65535) {
        return t("interfaceModal.rttMaxRange");
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
      const config: BabelInterface = {
        name: name.trim(),
        type: type || null,
        channel: channel.trim() || null,
        split_horizon: splitHorizon || null,
        enable_timestamps: enableTimestamps,
        hello_interval: helloInterval.trim()
          ? parseInt(helloInterval.trim(), 10)
          : null,
        update_interval: updateInterval.trim()
          ? parseInt(updateInterval.trim(), 10)
          : null,
        rxcost: rxcost.trim() ? parseInt(rxcost.trim(), 10) : null,
        max_rtt_penalty: maxRttPenalty.trim()
          ? parseInt(maxRttPenalty.trim(), 10)
          : null,
        rtt_decay: rttDecay.trim()
          ? parseInt(rttDecay.trim(), 10)
          : null,
        rtt_min: rttMin.trim() ? parseInt(rttMin.trim(), 10) : null,
        rtt_max: rttMax.trim() ? parseInt(rttMax.trim(), 10) : null,
      };

      await onSubmit(config);
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
            {isEditMode ? t("interfaceModal.titleEdit") : t("interfaceModal.titleAdd")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("interfaceModal.descriptionEdit", { name: existingInterface?.name ?? "" })
              : t("interfaceModal.descriptionAdd")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 pb-2">
            {/* Basic Settings */}
            <div className="space-y-4">
              {/* Interface Name */}
              <div className="space-y-2">
                <Label htmlFor="babel-iface-name">{t("fields.interface")}</Label>
                <InterfaceSelect
                  value={name}
                  onValueChange={setName}
                  disabled={isEditMode}
                  id="babel-iface-name"
                  className={isEditMode ? "bg-muted" : ""}
                  interfaces={availableInterfaces}
                />
                <p className="text-xs text-muted-foreground">
                  {t("interfaceModal.interfaceHelp")}
                </p>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="babel-iface-type">{t("fields.type")}</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="babel-iface-type">
                    <SelectValue placeholder={t("interfaceModal.typePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t("interfaceModal.typeAuto")}</SelectItem>
                    <SelectItem value="wired">{t("interfaceModal.typeWired")}</SelectItem>
                    <SelectItem value="wireless">{t("interfaceModal.typeWireless")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t("interfaceModal.typeHelp")}
                </p>
              </div>

              {/* Channel */}
              <div className="space-y-2">
                <Label htmlFor="babel-iface-channel">{t("fields.channel")}</Label>
                <Input
                  id="babel-iface-channel"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder={t("interfaceModal.channelPlaceholder")}
                />
                <p className="text-xs text-muted-foreground">
                  {t("interfaceModal.channelHelp")}
                </p>
              </div>

              {/* Split Horizon */}
              <div className="space-y-2">
                <Label htmlFor="babel-iface-split-horizon">{t("fields.splitHorizon")}</Label>
                <Select value={splitHorizon} onValueChange={setSplitHorizon}>
                  <SelectTrigger id="babel-iface-split-horizon">
                    <SelectValue placeholder={t("interfaceModal.splitHorizonPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">{tc("default")}</SelectItem>
                    <SelectItem value="enable">{t("interfaceModal.enable")}</SelectItem>
                    <SelectItem value="disable">{t("interfaceModal.disable")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t("interfaceModal.splitHorizonHelp")}
                </p>
              </div>

              {/* Enable Timestamps */}
              <div className="flex items-center space-x-3 rounded-lg border p-3">
                <Checkbox
                  id="babel-iface-timestamps"
                  checked={enableTimestamps}
                  onCheckedChange={(checked) =>
                    setEnableTimestamps(checked === true)
                  }
                />
                <div className="flex-1">
                  <Label
                    htmlFor="babel-iface-timestamps"
                    className="cursor-pointer"
                  >
                    {t("interfaceModal.enableTimestamps")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("interfaceModal.timestampsHelp")}
                  </p>
                </div>
              </div>
            </div>

            {/* Timing & Cost Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("interfaceModal.timingCost")}</h4>
              <div className="grid grid-cols-2 gap-4">
                {/* Hello Interval */}
                <div className="space-y-2">
                  <Label htmlFor="babel-iface-hello">{t("interfaceModal.helloInterval")}</Label>
                  <Input
                    id="babel-iface-hello"
                    type="number"
                    value={helloInterval}
                    onChange={(e) => setHelloInterval(e.target.value)}
                    placeholder="20-655340"
                    min={20}
                    max={655340}
                  />
                </div>

                {/* Update Interval */}
                <div className="space-y-2">
                  <Label htmlFor="babel-iface-update">
                    {t("interfaceModal.updateInterval")}
                  </Label>
                  <Input
                    id="babel-iface-update"
                    type="number"
                    value={updateInterval}
                    onChange={(e) => setUpdateInterval(e.target.value)}
                    placeholder="20-655340"
                    min={20}
                    max={655340}
                  />
                </div>

                {/* RX Cost */}
                <div className="space-y-2">
                  <Label htmlFor="babel-iface-rxcost">{t("interfaces.rxCost")}</Label>
                  <Input
                    id="babel-iface-rxcost"
                    type="number"
                    value={rxcost}
                    onChange={(e) => setRxcost(e.target.value)}
                    placeholder="1-65534"
                    min={1}
                    max={65534}
                  />
                </div>
              </div>
            </div>

            {/* RTT Settings Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("interfaceModal.rttSettings")}</h4>
              <div className="grid grid-cols-2 gap-4">
                {/* Max RTT Penalty */}
                <div className="space-y-2">
                  <Label htmlFor="babel-iface-max-rtt">
                    {t("interfaceModal.maxRttPenalty")}
                  </Label>
                  <Input
                    id="babel-iface-max-rtt"
                    type="number"
                    value={maxRttPenalty}
                    onChange={(e) => setMaxRttPenalty(e.target.value)}
                    placeholder="0-65535"
                    min={0}
                    max={65535}
                  />
                </div>

                {/* RTT Decay */}
                <div className="space-y-2">
                  <Label htmlFor="babel-iface-rtt-decay">{t("interfaceModal.rttDecay")}</Label>
                  <Input
                    id="babel-iface-rtt-decay"
                    type="number"
                    value={rttDecay}
                    onChange={(e) => setRttDecay(e.target.value)}
                    placeholder="1-256"
                    min={1}
                    max={256}
                  />
                </div>

                {/* RTT Min */}
                <div className="space-y-2">
                  <Label htmlFor="babel-iface-rtt-min">{t("interfaceModal.rttMin")}</Label>
                  <Input
                    id="babel-iface-rtt-min"
                    type="number"
                    value={rttMin}
                    onChange={(e) => setRttMin(e.target.value)}
                    placeholder="1-65535"
                    min={1}
                    max={65535}
                  />
                </div>

                {/* RTT Max */}
                <div className="space-y-2">
                  <Label htmlFor="babel-iface-rtt-max">{t("interfaceModal.rttMax")}</Label>
                  <Input
                    id="babel-iface-rtt-max"
                    type="number"
                    value={rttMax}
                    onChange={(e) => setRttMax(e.target.value)}
                    placeholder="1-65535"
                    min={1}
                    max={65535}
                  />
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
                {isEditMode ? tc("saving") : t("fields.creating")}
              </>
            ) : isEditMode ? (
              t("fields.saveChanges")
            ) : (
              t("fields.addInterface")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
