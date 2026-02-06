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
      return "Profile name is required";
    }
    if (!/^[a-zA-Z0-9-]{1,32}$/.test(name.trim())) {
      return "Profile name must be 1-32 characters, alphanumeric and hyphens only";
    }

    if (transmit.trim()) {
      const val = parseInt(transmit.trim(), 10);
      if (isNaN(val) || val < 10 || val > 60000) {
        return "Transmit interval must be between 10 and 60000 ms";
      }
    }

    if (receive.trim()) {
      const val = parseInt(receive.trim(), 10);
      if (isNaN(val) || val < 10 || val > 60000) {
        return "Receive interval must be between 10 and 60000 ms";
      }
    }

    if (echoInterval.trim()) {
      const val = parseInt(echoInterval.trim(), 10);
      if (isNaN(val) || val < 10 || val > 60000) {
        return "Echo interval must be between 10 and 60000 ms";
      }
    }

    if (multiplier.trim()) {
      const val = parseInt(multiplier.trim(), 10);
      if (isNaN(val) || val < 2 || val > 255) {
        return "Multiplier must be between 2 and 255";
      }
    }

    if (minimumTtl.trim()) {
      const val = parseInt(minimumTtl.trim(), 10);
      if (isNaN(val) || val < 1 || val > 254) {
        return "Minimum TTL must be between 1 and 254";
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
            {isEditMode ? "Edit BFD Profile" : "Create BFD Profile"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Modify the BFD profile configuration for "${existingProfile?.name}".`
              : "Configure a reusable BFD timer profile that peers can reference."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 pb-2">
            {/* Profile Name */}
            <div className="space-y-2">
              <Label htmlFor="bfd-profile-name">Profile Name</Label>
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
                Alphanumeric and hyphens only, 1-32 characters.
              </p>
            </div>

            {/* Status & Mode Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Status &amp; Mode</h4>
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
                      Shutdown
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Administratively disable this profile. Peers using it
                      will not establish BFD sessions.
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
                      Passive Mode
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Wait for the remote peer to initiate the BFD session.
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
                      Echo Mode
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable BFD echo mode for faster failure detection.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timer Intervals Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Timer Intervals</h4>
              <div className="grid grid-cols-2 gap-4">
                {/* Transmit Interval */}
                <div className="space-y-2">
                  <Label htmlFor="bfd-profile-transmit">
                    Transmit Interval (ms)
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
                    Receive Interval (ms)
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
                    Echo Interval (ms)
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
                  <Label htmlFor="bfd-profile-multiplier">Multiplier</Label>
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
              <h4 className="text-sm font-medium">Advanced</h4>
              <div className="space-y-2">
                <Label htmlFor="bfd-profile-min-ttl">Minimum TTL</Label>
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
                  Minimum Time To Live (1-254). Used to restrict BFD packets
                  to a certain number of hops.
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
              "Create Profile"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
