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
  capabilities,
}: BabelInterfaceModalProps) {
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
      return "Please select an interface";
    }

    if (channel.trim()) {
      const channelVal = channel.trim();
      if (
        channelVal !== "interfering" &&
        channelVal !== "non-interfering"
      ) {
        const num = parseInt(channelVal, 10);
        if (isNaN(num) || num < 1 || num > 254) {
          return "Channel must be 1-254, 'interfering', or 'non-interfering'";
        }
      }
    }

    if (helloInterval.trim()) {
      const val = parseInt(helloInterval.trim(), 10);
      if (isNaN(val) || val < 20 || val > 655340) {
        return "Hello interval must be between 20 and 655340 ms";
      }
    }

    if (updateInterval.trim()) {
      const val = parseInt(updateInterval.trim(), 10);
      if (isNaN(val) || val < 20 || val > 655340) {
        return "Update interval must be between 20 and 655340 ms";
      }
    }

    if (rxcost.trim()) {
      const val = parseInt(rxcost.trim(), 10);
      if (isNaN(val) || val < 1 || val > 65534) {
        return "RX cost must be between 1 and 65534";
      }
    }

    if (maxRttPenalty.trim()) {
      const val = parseInt(maxRttPenalty.trim(), 10);
      if (isNaN(val) || val < 0 || val > 65535) {
        return "Max RTT penalty must be between 0 and 65535 ms";
      }
    }

    if (rttDecay.trim()) {
      const val = parseInt(rttDecay.trim(), 10);
      if (isNaN(val) || val < 1 || val > 256) {
        return "RTT decay must be between 1 and 256";
      }
    }

    if (rttMin.trim()) {
      const val = parseInt(rttMin.trim(), 10);
      if (isNaN(val) || val < 1 || val > 65535) {
        return "RTT min must be between 1 and 65535 ms";
      }
    }

    if (rttMax.trim()) {
      const val = parseInt(rttMax.trim(), 10);
      if (isNaN(val) || val < 1 || val > 65535) {
        return "RTT max must be between 1 and 65535 ms";
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
        err instanceof Error ? err.message : "Operation failed";
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
            {isEditMode ? "Edit Babel Interface" : "Add Babel Interface"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Modify the Babel protocol configuration for ${existingInterface?.name}.`
              : "Configure a new interface for the Babel routing protocol."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 pb-2">
            {/* Basic Settings */}
            <div className="space-y-4">
              {/* Interface Name */}
              <div className="space-y-2">
                <Label htmlFor="babel-iface-name">Interface</Label>
                <InterfaceSelect
                  value={name}
                  onValueChange={setName}
                  disabled={isEditMode}
                  id="babel-iface-name"
                  className={isEditMode ? "bg-muted" : ""}
                  interfaces={availableInterfaces}
                />
                <p className="text-xs text-muted-foreground">
                  The VyOS interface to enable Babel on.
                </p>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="babel-iface-type">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="babel-iface-type">
                    <SelectValue placeholder="Select type (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="wired">Wired</SelectItem>
                    <SelectItem value="wireless">Wireless</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Interface type determines default cost and hello interval.
                </p>
              </div>

              {/* Channel */}
              <div className="space-y-2">
                <Label htmlFor="babel-iface-channel">Channel</Label>
                <Input
                  id="babel-iface-channel"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="1-254, interfering, or non-interfering"
                />
                <p className="text-xs text-muted-foreground">
                  Babel channel number (1-254) or &quot;interfering&quot; /
                  &quot;non-interfering&quot;.
                </p>
              </div>

              {/* Split Horizon */}
              <div className="space-y-2">
                <Label htmlFor="babel-iface-split-horizon">Split Horizon</Label>
                <Select value={splitHorizon} onValueChange={setSplitHorizon}>
                  <SelectTrigger id="babel-iface-split-horizon">
                    <SelectValue placeholder="Select split horizon (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="enable">Enable</SelectItem>
                    <SelectItem value="disable">Disable</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Controls the split-horizon optimization for this interface.
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
                    Enable Timestamps
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Enable timestamps on Hello and IHU packets for RTT
                    estimation.
                  </p>
                </div>
              </div>
            </div>

            {/* Timing & Cost Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Timing &amp; Cost</h4>
              <div className="grid grid-cols-2 gap-4">
                {/* Hello Interval */}
                <div className="space-y-2">
                  <Label htmlFor="babel-iface-hello">Hello Interval (ms)</Label>
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
                    Update Interval (ms)
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
                  <Label htmlFor="babel-iface-rxcost">RX Cost</Label>
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
              <h4 className="text-sm font-medium">RTT Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                {/* Max RTT Penalty */}
                <div className="space-y-2">
                  <Label htmlFor="babel-iface-max-rtt">
                    Max RTT Penalty (ms)
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
                  <Label htmlFor="babel-iface-rtt-decay">RTT Decay</Label>
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
                  <Label htmlFor="babel-iface-rtt-min">RTT Min (ms)</Label>
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
                  <Label htmlFor="babel-iface-rtt-max">RTT Max (ms)</Label>
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
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? "Saving..." : "Creating..."}
              </>
            ) : isEditMode ? (
              "Save Changes"
            ) : (
              "Add Interface"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
