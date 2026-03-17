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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2 } from "lucide-react";
import { vrfService } from "@/lib/api/vrf";

interface CreateVrfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  existingNames: string[];
}

export function CreateVrfModal({
  open,
  onOpenChange,
  onCreated,
  existingNames,
}: CreateVrfModalProps) {
  const [name, setName] = useState("");
  const [table, setTable] = useState("");
  const [description, setDescription] = useState("");
  const [vni, setVni] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setTable("");
    setDescription("");
    setVni("");
    setDisabled(false);
    setError(null);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const validate = (): string | null => {
    if (!name.trim()) return "VRF name is required";
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name.trim())) {
      return "Name must start with a letter and contain only letters, numbers, hyphens, and underscores";
    }
    if (existingNames.includes(name.trim())) {
      return `VRF "${name.trim()}" already exists`;
    }
    if (!table.trim()) return "Table ID is required";
    const tableNum = parseInt(table.trim());
    if (isNaN(tableNum) || tableNum < 1 || tableNum > 4294967295) {
      return "Table ID must be a number between 1 and 4294967295";
    }
    if (vni.trim()) {
      const vniNum = parseInt(vni.trim());
      if (isNaN(vniNum) || vniNum < 0 || vniNum > 16777215) {
        return "VNI must be a number between 0 and 16777215";
      }
    }
    return null;
  };

  const handleCreate = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await vrfService.createVrf(name.trim(), {
        table: table.trim(),
        description: description.trim() || undefined,
        vni: vni.trim() || undefined,
        disabled,
      });
      if (!result.success) {
        throw new Error(result.error || "Failed to create VRF");
      }
      resetForm();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create VRF");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create VRF Instance</DialogTitle>
          <DialogDescription>
            Create a new Virtual Routing and Forwarding instance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="vrf-name">Name *</Label>
            <Input
              id="vrf-name"
              placeholder="e.g., MGMT, CUSTOMER"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vrf-table">Table ID *</Label>
            <Input
              id="vrf-table"
              placeholder="e.g., 100"
              type="number"
              min={1}
              value={table}
              onChange={(e) => setTable(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Unique routing table ID for this VRF (1-4294967295)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vrf-desc">Description</Label>
            <Input
              id="vrf-desc"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vrf-vni">VNI</Label>
            <Input
              id="vrf-vni"
              placeholder="VXLAN Network Identifier"
              type="number"
              min={0}
              value={vni}
              onChange={(e) => setVni(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="vrf-disabled"
              checked={disabled}
              onCheckedChange={(checked) => setDisabled(checked === true)}
            />
            <Label htmlFor="vrf-disabled" className="text-sm font-normal">
              Create in disabled state
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create VRF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
