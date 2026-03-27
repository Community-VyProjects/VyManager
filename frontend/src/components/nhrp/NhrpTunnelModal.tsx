"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2 } from "lucide-react";
import { NhrpTunnel, NhrpCapabilities } from "@/lib/api/nhrp";

interface TunnelFormData {
  name: string;
  authentication: string;
  holding_time: string;
  mtu: string;
  network_id: string;
  redirect: boolean;
  shortcut: boolean;
  non_caching: boolean;
  shortcut_destination: boolean;
  registration_no_unique: boolean;
}

const emptyForm: TunnelFormData = {
  name: "",
  authentication: "",
  holding_time: "",
  mtu: "",
  network_id: "",
  redirect: false,
  shortcut: false,
  non_caching: false,
  shortcut_destination: false,
  registration_no_unique: false,
};

interface NhrpTunnelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: TunnelFormData) => Promise<void>;
  existingTunnel: NhrpTunnel | null;
  capabilities: NhrpCapabilities;
}

export function NhrpTunnelModal({
  open,
  onOpenChange,
  onSubmit,
  existingTunnel,
  capabilities,
}: NhrpTunnelModalProps) {
  const isEditMode = existingTunnel !== null;

  const [form, setForm] = useState<TunnelFormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingTunnel) {
        setForm({
          name: existingTunnel.name,
          authentication: existingTunnel.authentication ?? "",
          holding_time: existingTunnel.holding_time ?? "",
          mtu: existingTunnel.mtu ?? "",
          network_id: existingTunnel.network_id ?? "",
          redirect: existingTunnel.redirect,
          shortcut: existingTunnel.shortcut,
          non_caching: existingTunnel.non_caching,
          shortcut_destination: existingTunnel.shortcut_destination,
          registration_no_unique: existingTunnel.registration_no_unique,
        });
      } else {
        setForm(emptyForm);
      }
      setError(null);
    }
  }, [open, existingTunnel]);

  const handleClose = () => {
    if (!loading) onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!isEditMode && !form.name.trim()) {
      setError("Tunnel name is required");
      return;
    }
    if (!isEditMode && !/^tun\d+$/.test(form.name.trim())) {
      setError("Tunnel name must match format tunN (e.g. tun0, tun1)");
      return;
    }
    if (form.authentication && form.authentication.length > 8) {
      setError("Authentication passphrase must be 8 characters or fewer");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const update = (key: keyof TunnelFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Tunnel Settings" : "Add NHRP Tunnel"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tunnel Name */}
          <div className="space-y-2">
            <Label htmlFor="tunnel-name">Tunnel Name</Label>
            {isEditMode ? (
              <p className="text-sm font-mono font-medium px-3 py-2 bg-muted rounded-md">
                {existingTunnel?.name}
              </p>
            ) : (
              <Input
                id="tunnel-name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. tun0"
              />
            )}
          </div>

          {/* Authentication */}
          <div className="space-y-2">
            <Label htmlFor="tunnel-auth">Authentication</Label>
            <Input
              id="tunnel-auth"
              value={form.authentication}
              onChange={(e) => update("authentication", e.target.value)}
              placeholder="Passphrase (max 8 chars)"
              maxLength={8}
            />
          </div>

          {/* Holding Time */}
          <div className="space-y-2">
            <Label htmlFor="tunnel-holdtime">Holding Time (seconds)</Label>
            <Input
              id="tunnel-holdtime"
              value={form.holding_time}
              onChange={(e) => update("holding_time", e.target.value)}
              placeholder="Optional"
              type="number"
            />
          </div>

          {/* MTU — 1.5 only */}
          {capabilities.features.mtu.supported && (
            <div className="space-y-2">
              <Label htmlFor="tunnel-mtu">MTU</Label>
              <Input
                id="tunnel-mtu"
                value={form.mtu}
                onChange={(e) => update("mtu", e.target.value)}
                placeholder="Optional"
                type="number"
              />
            </div>
          )}

          {/* Network ID — 1.5 only */}
          {capabilities.features.network_id.supported && (
            <div className="space-y-2">
              <Label htmlFor="tunnel-network-id">Network ID</Label>
              <Input
                id="tunnel-network-id"
                value={form.network_id}
                onChange={(e) => update("network_id", e.target.value)}
                placeholder="Optional"
                type="number"
              />
            </div>
          )}

          {/* Boolean flags */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="tunnel-redirect"
                checked={form.redirect}
                onCheckedChange={(checked) => update("redirect", checked === true)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="tunnel-redirect" className="cursor-pointer">Redirect</Label>
                <p className="text-xs text-muted-foreground">Enable Cisco-style NHRP Traffic Indication packets</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="tunnel-shortcut"
                checked={form.shortcut}
                onCheckedChange={(checked) => update("shortcut", checked === true)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="tunnel-shortcut" className="cursor-pointer">Shortcut</Label>
                <p className="text-xs text-muted-foreground">Enable shortcut route creation via NHRP</p>
              </div>
            </div>

            {capabilities.features.non_caching.supported && (
              <div className="flex items-center gap-3">
                <Checkbox
                  id="tunnel-non-caching"
                  checked={form.non_caching}
                  onCheckedChange={(checked) => update("non_caching", checked === true)}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="tunnel-non-caching" className="cursor-pointer">Non-Caching</Label>
                  <p className="text-xs text-muted-foreground">Reduce memory usage on large NBMA subnets</p>
                </div>
              </div>
            )}

            {capabilities.features.shortcut_destination.supported && (
              <div className="flex items-center gap-3">
                <Checkbox
                  id="tunnel-shortcut-dest"
                  checked={form.shortcut_destination}
                  onCheckedChange={(checked) => update("shortcut_destination", checked === true)}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="tunnel-shortcut-dest" className="cursor-pointer">Shortcut Destination</Label>
                  <p className="text-xs text-muted-foreground">Reply with authoritative answers on resolution requests</p>
                </div>
              </div>
            )}

            {capabilities.features.registration_no_unique.supported && (
              <div className="flex items-center gap-3">
                <Checkbox
                  id="tunnel-reg-no-unique"
                  checked={form.registration_no_unique}
                  onCheckedChange={(checked) => update("registration_no_unique", checked === true)}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="tunnel-reg-no-unique" className="cursor-pointer">Registration No-Unique</Label>
                  <p className="text-xs text-muted-foreground">Don&apos;t set unique flag in NHRP registration</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
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
              "Create Tunnel"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
