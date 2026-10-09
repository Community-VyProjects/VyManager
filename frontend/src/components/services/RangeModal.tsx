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
import { AlertCircle, Network, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { dhcpService, type DHCPCapabilitiesResponse, type DHCPRange, type DHCPSharedNetwork } from "@/lib/api/dhcp";
import { ApiError } from "@/lib/types/api";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import { DhcpCatalogFields } from "./DhcpCatalogFields";
import { failedSaveMessage } from "./dhcp-save";
import {
  catalogCreateOps,
  catalogDraftFrom,
  catalogOps,
  type CatalogDraft,
} from "./dhcp-catalog";
import {
  emptyRangeDraft,
  nextRangeId,
  rangeDraftFrom,
  submitRangeCreate,
  submitRangeUpdate,
  validateRangeCreate,
  validateRangeShared,
  type RangeDraft,
} from "./dhcp-form";

const NO_LEAVES: never[] = [];

interface RangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  network: DHCPSharedNetwork;
  capabilities?: DHCPCapabilitiesResponse | null;
  existing?: { subnet: string; range: DHCPRange } | null;
}

export function RangeModal({
  open,
  onOpenChange,
  onSuccess,
  network,
  capabilities,
  existing,
}: RangeModalProps) {
  const isEdit = modalIsEdit(existing);
  const rangeLeaves = capabilities?.catalog?.range ?? NO_LEAVES;
  const [draft, setDraft] = useState<RangeDraft>(emptyRangeDraft());
  const [catalogDraft, setCatalogDraft] = useState<CatalogDraft>({});
  const [catalogOriginal, setCatalogOriginal] = useState<CatalogDraft>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setDraft(rangeDraftFrom(existing.subnet, existing.range));
      const loaded = catalogDraftFrom(rangeLeaves, existing.range.catalog);
      setCatalogDraft(loaded);
      setCatalogOriginal(loaded);
    } else {
      const next = emptyRangeDraft();
      if (network.subnets.length === 1) {
        next.subnet = network.subnets[0].subnet;
      }
      setDraft(next);
      const loaded = catalogDraftFrom(rangeLeaves, undefined);
      setCatalogDraft(loaded);
      setCatalogOriginal(loaded);
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing]);

  const patch = (fields: Partial<RangeDraft>) =>
    setDraft((current) => ({ ...current, ...fields }));

  const lockedSubnet = lockedIdentity(existing, (record) => record.subnet, draft.subnet);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const validationError = isEdit
      ? validateRangeShared(draft)
      : validateRangeCreate(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    const write = modalWriteKind(existing ? { name: existing.range.range_id } : null);
    setLoading(true);
    setError(null);

    try {
      if (write.kind === "update" && existing) {
        const startChanged =
          draft.startIp.trim() !== (existing.range.start || "") ||
          draft.stopIp.trim() !== (existing.range.stop || "");
        const follow = startChanged
          ? catalogCreateOps("set_range_catalog", rangeLeaves, catalogDraft, existing.range.range_id)
          : catalogOps(
              "set_range_catalog",
              "delete_range_catalog",
              rangeLeaves,
              catalogOriginal,
              catalogDraft,
              existing.range.range_id,
            );
        const updated = await submitRangeUpdate(network.name, existing, draft, dhcpService, follow);
        const updateError = failedSaveMessage(updated, "Failed to save range");
        if (updateError) {
          setError(updateError);
          return;
        }
      } else {
        const rangeId = nextRangeId(network, draft.subnet);
        const follow = catalogCreateOps("set_range_catalog", rangeLeaves, catalogDraft, rangeId);
        const created = await submitRangeCreate(network.name, draft, rangeId, dhcpService, follow);
        const createError = failedSaveMessage(created, "Failed to create range");
        if (createError) {
          setError(createError);
          return;
        }
      }
      handleClose();
      onSuccess();
    } catch (err) {
      setError(
        (err as ApiError).message ||
          (isEdit ? "Failed to update range" : "Failed to create range"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {isEdit ? "Edit DHCP Range" : "Add DHCP Range"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modify the IP address range for DHCP allocation"
              : "Create a new IP address range for DHCP allocation"}
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
                : "Select the subnet where this range will be created"}
            </p>
          </div>

          {isEdit && existing && (
            <div className="space-y-2">
              <Label>Range ID</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">
                  {existing.range.range_id}
                </Badge>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="start-ip">Start IP Address</Label>
            <Input
              id="start-ip"
              placeholder="e.g., 192.168.1.100"
              value={draft.startIp}
              onChange={(e) => patch({ startIp: e.target.value })}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              The first IP address in the range
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stop-ip">Stop IP Address</Label>
            <Input
              id="stop-ip"
              placeholder="e.g., 192.168.1.200"
              value={draft.stopIp}
              onChange={(e) => patch({ stopIp: e.target.value })}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              The last IP address in the range
            </p>
          </div>

          <DhcpCatalogFields
            leaves={rangeLeaves}
            values={catalogDraft}
            onChange={(token, value) =>
              setCatalogDraft((current) => ({ ...current, [token]: value }))
            }
            idPrefix="range-dhcp"
          />

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
                : "Create Range"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
