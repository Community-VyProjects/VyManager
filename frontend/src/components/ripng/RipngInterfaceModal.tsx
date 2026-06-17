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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import type { RipNgInterface } from "@/lib/api/ripng";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";

interface RipngInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: RipNgInterface) => Promise<void>;
  existingInterface?: RipNgInterface | null;
}

export function RipngInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
}: RipngInterfaceModalProps) {
  const isEditMode = !!existingInterface;

  const [name, setName] = useState("");
  const [splitHorizon, setSplitHorizon] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);

  useEffect(() => {
    if (!open) return;
    showService.getAllInterfaces()
      .then((res) => setAvailableInterfaces(res.interfaces))
      .catch(() => {});

    if (existingInterface) {
      setName(existingInterface.name);
      setSplitHorizon(existingInterface.split_horizon || "");
    } else {
      resetForm();
    }
  }, [open, existingInterface]);

  const resetForm = () => {
    setName("");
    setSplitHorizon("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validate = (): string | null => {
    if (!name) return "Please select an interface";
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const config: RipNgInterface = {
      name,
      split_horizon: splitHorizon || null,
    };

    try {
      setLoading(true);
      setError(null);
      await onSubmit(config);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit RIPng Interface" : "Add RIPng Interface"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Modify RIPng settings for ${existingInterface?.name}.`
              : "Configure per-interface RIPng split-horizon settings."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Interface */}
          <div className="space-y-2">
            <Label htmlFor="ripng-iface-name">Interface</Label>
            <InterfaceSelect
              value={name}
              onValueChange={setName}
              disabled={isEditMode}
              id="ripng-iface-name"
              className={isEditMode ? "bg-muted" : ""}
              interfaces={availableInterfaces}
            />
          </div>

          {/* Split Horizon */}
          <div className="space-y-2">
            <Label>Split Horizon</Label>
            <Select value={splitHorizon || "unset"} onValueChange={(v) => setSplitHorizon(v === "unset" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">Default</SelectItem>
                <SelectItem value="disable">Disable</SelectItem>
                <SelectItem value="poison-reverse">Poison Reverse</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
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
                {isEditMode ? "Saving..." : "Adding..."}
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
