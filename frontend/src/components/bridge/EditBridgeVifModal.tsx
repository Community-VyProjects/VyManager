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
import { AlertCircle, Loader2 } from "lucide-react";
import { bridgeService, type BridgeVifConfig } from "@/lib/api/bridge";
import { ApiError } from "@/lib/types/api";

interface EditBridgeVifModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceName: string;
  vif: BridgeVifConfig | null;
}

export function EditBridgeVifModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceName,
  vif,
}: EditBridgeVifModalProps) {
  const [addresses, setAddresses] = useState("");
  const [description, setDescription] = useState("");
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vif && open) {
      setAddresses(vif.addresses.join(", "));
      setDescription(vif.description || "");
      setMtu(vif.mtu || "");
      setVrf(vif.vrf || "");
      setDisabled(vif.disable);
      setError(null);
    }
  }, [vif, open]);

  const handleSubmit = async () => {
    if (!vif) return;
    setLoading(true);
    setError(null);
    try {
      const addrList = addresses.split(/[,\n]/).map((a) => a.trim()).filter(Boolean);
      const result = await bridgeService.updateVif(interfaceName, vif, {
        addresses: addrList,
        description: description.trim() || null,
        mtu: mtu.trim() || null,
        vrf: vrf.trim() || null,
        disabled,
      });

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to update VIF");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to update VIF");
    } finally {
      setLoading(false);
    }
  };

  if (!vif) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit VIF {vif.vlan_id} on {interfaceName}
          </DialogTitle>
          <DialogDescription>
            Modify VLAN sub-interface configuration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>VLAN ID</Label>
            <Input value={vif.vlan_id} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-vif-description">Description</Label>
            <Input
              id="edit-vif-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-vif-addresses">IP Addresses</Label>
            <Input
              id="edit-vif-addresses"
              value={addresses}
              onChange={(e) => setAddresses(e.target.value)}
              placeholder="192.168.10.1/24, 10.0.10.1/24"
            />
            <p className="text-xs text-muted-foreground">Comma-separated CIDR addresses</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-vif-mtu">MTU</Label>
              <Input
                id="edit-vif-mtu"
                value={mtu}
                onChange={(e) => setMtu(e.target.value)}
                placeholder="1500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-vif-vrf">VRF</Label>
              <Input
                id="edit-vif-vrf"
                value={vrf}
                onChange={(e) => setVrf(e.target.value)}
                placeholder="Optional VRF"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-vif-disabled"
              checked={disabled}
              onCheckedChange={(c) => setDisabled(c === true)}
            />
            <Label htmlFor="edit-vif-disabled" className="font-normal text-sm">
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
