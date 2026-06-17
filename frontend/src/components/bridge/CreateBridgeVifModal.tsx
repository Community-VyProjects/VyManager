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
import { VrfSelect } from "@/components/ui/vrf-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2 } from "lucide-react";
import { bridgeService } from "@/lib/api/bridge";
import { ApiError } from "@/lib/types/api";

interface CreateBridgeVifModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceName: string;
  existingVlanIds: string[];
}

export function CreateBridgeVifModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceName,
  existingVlanIds,
}: CreateBridgeVifModalProps) {
  const [vlanId, setVlanId] = useState("");
  const [addresses, setAddresses] = useState("");
  const [description, setDescription] = useState("");
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setVlanId("");
    setAddresses("");
    setDescription("");
    setMtu("");
    setVrf("");
    setDisabled(false);
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    const vid = vlanId.trim();
    if (!vid) {
      setError("VLAN ID is required.");
      return;
    }
    const vidNum = Number(vid);
    if (!Number.isInteger(vidNum) || vidNum < 1 || vidNum > 4094) {
      setError("VLAN ID must be a number between 1 and 4094.");
      return;
    }
    if (existingVlanIds.includes(vid)) {
      setError(`VIF ${vid} already exists on ${interfaceName}.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const addrList = addresses.split(/[,\n]/).map((a) => a.trim()).filter(Boolean);
      const result = await bridgeService.createVif(interfaceName, {
        vlan_id: vid,
        addresses: addrList,
        description: description.trim() || undefined,
        mtu: mtu.trim() || undefined,
        vrf: vrf.trim() || undefined,
        disabled,
      });

      if (result.success) {
        handleOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to create VIF");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to create VIF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add VIF to {interfaceName}</DialogTitle>
          <DialogDescription>
            Create a VLAN sub-interface (802.1Q) on this bridge.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vif-vlan-id">
              VLAN ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="vif-vlan-id"
              value={vlanId}
              onChange={(e) => setVlanId(e.target.value)}
              placeholder="1–4094"
              type="number"
              min={1}
              max={4094}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vif-description">Description</Label>
            <Input
              id="vif-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vif-addresses">IP Addresses</Label>
            <Input
              id="vif-addresses"
              value={addresses}
              onChange={(e) => setAddresses(e.target.value)}
              placeholder="192.168.10.1/24, 10.0.10.1/24"
            />
            <p className="text-xs text-muted-foreground">Comma-separated CIDR addresses</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vif-mtu">MTU</Label>
              <Input
                id="vif-mtu"
                value={mtu}
                onChange={(e) => setMtu(e.target.value)}
                placeholder="1500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vif-vrf">VRF</Label>
              <VrfSelect
                id="vif-vrf"
                value={vrf}
                onValueChange={setVrf}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="vif-disabled"
              checked={disabled}
              onCheckedChange={(c) => setDisabled(c === true)}
            />
            <Label htmlFor="vif-disabled" className="font-normal text-sm">
              Administratively Disabled
            </Label>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create VIF"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
