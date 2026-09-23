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
import { AlertCircle, Monitor, Network, Plus } from "lucide-react";
import {
  type DHCPCapabilitiesResponse,
  type DHCPSharedNetwork,
  type DHCPStaticMapping,
} from "@/lib/api/dhcp";
import { ApiError } from "@/lib/types/api";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  emptyMappingDraft,
  mappingDraftFrom,
  submitMappingCreate,
  submitMappingUpdate,
  validateMappingCreate,
  validateMappingShared,
  type MappingDraft,
} from "./dhcp-form";

interface StaticMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  network: DHCPSharedNetwork;
  capabilities?: DHCPCapabilitiesResponse | null;
  existing?: {
    network: string;
    subnet: string;
    mapping: DHCPStaticMapping;
  } | null;
}

export function StaticMappingModal({
  open,
  onOpenChange,
  onSuccess,
  network,
  capabilities,
  existing,
}: StaticMappingModalProps) {
  const isEdit = modalIsEdit(existing);
  const [draft, setDraft] = useState<MappingDraft>(emptyMappingDraft());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setDraft(mappingDraftFrom(existing.subnet, existing.mapping));
    } else {
      const next = emptyMappingDraft();
      if (network.subnets.length === 1) {
        next.subnet = network.subnets[0].subnet;
      }
      setDraft(next);
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing]);

  const patch = (fields: Partial<MappingDraft>) =>
    setDraft((current) => ({ ...current, ...fields }));

  const lockedName = lockedIdentity(existing, (record) => record.mapping.name, draft.name);
  const lockedSubnet = lockedIdentity(existing, (record) => record.subnet, draft.subnet);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const canDuid = capabilities?.fields.static_mapping_duid?.supported ?? false;
    const validationError = isEdit
      ? validateMappingShared(draft)
      : validateMappingCreate(draft, canDuid);
    if (validationError) {
      setError(validationError);
      return;
    }

    const write = modalWriteKind(existing ? { name: existing.mapping.name } : null);
    setLoading(true);
    setError(null);

    try {
      if (write.kind === "update" && existing) {
        await submitMappingUpdate(existing, draft);
      } else {
        await submitMappingCreate(network.name, draft);
      }
      handleClose();
      onSuccess();
    } catch (err) {
      setError(
        (err as ApiError).message ||
          (isEdit
            ? "Failed to update static mapping"
            : "Failed to create static mapping"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? (
              <Monitor className="h-5 w-5" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
            {isEdit ? "Edit Static Mapping" : "Add Static Mapping"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the static DHCP mapping configuration"
              : "Create a new static MAC to IP address mapping"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Network className="h-4 w-4" />
            <span>
              Network:{" "}
              <span className="font-medium text-foreground">{network.name}</span>
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subnet">Subnet</Label>
            <Select
              value={lockedSubnet.value}
              onValueChange={(value) => patch({ subnet: value })}
              disabled={lockedSubnet.disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a subnet" />
              </SelectTrigger>
              <SelectContent>
                {network.subnets.map((subnet) => (
                  <SelectItem key={subnet.subnet} value={subnet.subnet}>
                    {subnet.subnet}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isEdit
                ? "The subnet cannot be changed"
                : "Select the subnet for this static mapping"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mapping-name">Mapping Name</Label>
            <Input
              id="mapping-name"
              placeholder="e.g., server-1 or printer-hp"
              value={lockedName.value}
              onChange={(e) => patch({ name: e.target.value })}
              disabled={lockedName.disabled}
              className={isEdit ? "bg-muted" : undefined}
            />
            <p className="text-xs text-muted-foreground">
              {isEdit
                ? "The mapping name cannot be changed"
                : "A unique identifier for this mapping (letters, numbers, hyphens, underscores)"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ip-address">IP Address</Label>
            <Input
              id="ip-address"
              placeholder="e.g., 192.168.1.100"
              value={draft.ipAddress}
              onChange={(e) => patch({ ipAddress: e.target.value })}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              The IP address to assign to this device
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mac-address">MAC Address</Label>
            <Input
              id="mac-address"
              placeholder="e.g., AA:BB:CC:DD:EE:FF"
              value={draft.macAddress}
              onChange={(e) =>
                patch({
                  macAddress: isEdit
                    ? e.target.value
                    : e.target.value.toUpperCase(),
                })
              }
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              The hardware MAC address of the device
            </p>
          </div>

          {capabilities?.fields.static_mapping_duid?.supported && (
            <div className="space-y-2">
              <Label htmlFor="duid">DUID</Label>
              <Input
                id="duid"
                placeholder="e.g., 00:01:00:01:2a:3b:4c:5d:6e:7f"
                value={draft.duid}
                onChange={(e) => patch({ duid: e.target.value })}
                className="font-mono"
              />
              {!isEdit && (
                <p className="text-xs text-muted-foreground">
                  Client DUID. Use this instead of or with a MAC address.
                </p>
              )}
            </div>
          )}

          {isEdit && (
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Checkbox
                id="disabled"
                checked={draft.disabled}
                onCheckedChange={(checked) =>
                  patch({ disabled: checked === true })
                }
              />
              <div className="space-y-0.5">
                <Label htmlFor="disabled" className="cursor-pointer">
                  Disable Mapping
                </Label>
                <p className="text-xs text-muted-foreground">
                  When disabled, this mapping will not assign the IP to the device
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="mapping-description">Description</Label>
            <Input
              id="mapping-description"
              placeholder="Optional description"
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading
              ? isEdit
                ? "Saving..."
                : "Creating..."
              : isEdit
                ? "Save Changes"
                : "Create Mapping"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
