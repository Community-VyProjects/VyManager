"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Circle, Plus, X, AlertTriangle } from "lucide-react";
import { dummyService, type DummyInterface, type DummyOperation } from "@/lib/api/dummy";
import { useToast } from "@/hooks/useToast";

interface DummyInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  interface?: DummyInterface;
  onSuccess: () => void;
}

export function DummyInterfaceModal({
  open,
  onOpenChange,
  mode,
  interface: existingInterface,
  onSuccess,
}: DummyInterfaceModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [addresses, setAddresses] = useState<string[]>([""]);
  const [mtu, setMtu] = useState("");
  const [vrf, setVrf] = useState("");
  const [disabled, setDisabled] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (mode === "edit" && existingInterface) {
        setName(existingInterface.name);
        setDescription(existingInterface.description || "");
        setAddresses(existingInterface.addresses?.length > 0 ? existingInterface.addresses : [""]);
        setMtu(existingInterface.mtu || "");
        setVrf(existingInterface.vrf || "");
        setDisabled(existingInterface.disable || false);
      } else {
        setName("");
        setDescription("");
        setAddresses([""]);
        setMtu("");
        setVrf("");
        setDisabled(false);
      }
      setShowDeleteConfirm(false);
    }
  }, [open, mode, existingInterface]);

  const handleAddAddress = () => {
    setAddresses([...addresses, ""]);
  };

  const handleRemoveAddress = (index: number) => {
    const newAddresses = addresses.filter((_, i) => i !== index);
    setAddresses(newAddresses.length > 0 ? newAddresses : [""]);
  };

  const handleAddressChange = (index: number, value: string) => {
    const newAddresses = [...addresses];
    newAddresses[index] = value;
    setAddresses(newAddresses);
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      toast.error("Validation Error", "Interface name is required");
      return false;
    }

    // Validate name format (dum0, dum1, etc.)
    if (mode === "create" && !/^dum\d+$/.test(name.trim())) {
      toast.error("Validation Error", "Interface name must be in format: dum0, dum1, dum2, etc.");
      return false;
    }

    // Validate addresses
    const nonEmptyAddresses = addresses.filter(a => a.trim());
    for (const addr of nonEmptyAddresses) {
      // Basic CIDR validation
      if (!/^[\d\.:a-fA-F]+\/\d{1,3}$/.test(addr.trim())) {
        toast.error("Validation Error", `Invalid address format: ${addr}. Use CIDR notation (e.g., 10.0.0.1/32)`);
        return false;
      }
    }

    // Validate MTU
    if (mtu && (isNaN(parseInt(mtu)) || parseInt(mtu) < 68 || parseInt(mtu) > 65535)) {
      toast.error("Validation Error", "MTU must be between 68 and 65535");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const operations: DummyOperation[] = [];
      const nonEmptyAddresses = addresses.filter(a => a.trim());

      if (mode === "create") {
        // Add new addresses
        for (const addr of nonEmptyAddresses) {
          operations.push({ op: "set_address", value: addr.trim() });
        }

        if (description.trim()) {
          operations.push({ op: "set_description", value: description.trim() });
        }

        if (mtu.trim()) {
          operations.push({ op: "set_mtu", value: mtu.trim() });
        }

        if (vrf.trim()) {
          operations.push({ op: "set_vrf", value: vrf.trim() });
        }

        if (disabled) {
          operations.push({ op: "disable" });
        }
      } else if (existingInterface) {
        // Edit mode - calculate diff
        const existingAddrs = new Set(existingInterface.addresses || []);
        const newAddrs = new Set(nonEmptyAddresses.map(a => a.trim()));

        // Remove old addresses
        for (const addr of existingAddrs) {
          if (!newAddrs.has(addr)) {
            operations.push({ op: "delete_address", value: addr });
          }
        }

        // Add new addresses
        for (const addr of newAddrs) {
          if (!existingAddrs.has(addr)) {
            operations.push({ op: "set_address", value: addr });
          }
        }

        // Description
        if (description.trim() !== (existingInterface.description || "")) {
          if (description.trim()) {
            operations.push({ op: "set_description", value: description.trim() });
          } else {
            operations.push({ op: "delete_description" });
          }
        }

        // MTU
        if (mtu.trim() !== (existingInterface.mtu || "")) {
          if (mtu.trim()) {
            operations.push({ op: "set_mtu", value: mtu.trim() });
          } else {
            operations.push({ op: "delete_mtu" });
          }
        }

        // VRF
        if (vrf.trim() !== (existingInterface.vrf || "")) {
          if (vrf.trim()) {
            operations.push({ op: "set_vrf", value: vrf.trim() });
          } else if (existingInterface.vrf) {
            operations.push({ op: "delete_vrf", value: existingInterface.vrf });
          }
        }

        // Disable state
        if (disabled !== (existingInterface.disable || false)) {
          operations.push({ op: disabled ? "disable" : "enable" });
        }
      }

      if (operations.length === 0 && mode === "edit") {
        toast.info("No Changes", "No changes were made to the interface");
        onOpenChange(false);
        return;
      }

      const response = await dummyService.configureBatch({
        interface: name.trim(),
        operations,
      });

      if (response.success) {
        toast.success(
          mode === "create" ? "Interface Created" : "Interface Updated",
          `Loopback interface ${name} has been ${mode === "create" ? "created" : "updated"}`
        );
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error("Operation Failed", response.error || "Unknown error");
      }
    } catch (error) {
      console.error("Interface operation error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Error", errorMessage || "Failed to save interface");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingInterface) return;

    setLoading(true);
    try {
      const response = await dummyService.deleteInterface(existingInterface.name);

      if (response.success) {
        toast.success("Interface Deleted", `Loopback interface ${existingInterface.name} has been deleted`);
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error("Delete Failed", response.error || "Unknown error");
      }
    } catch (error) {
      console.error("Delete interface error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Error", errorMessage || "Failed to delete interface");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Circle className="h-5 w-5 text-pink-500" />
            {mode === "create" ? "Create Loopback Interface" : `Edit ${existingInterface?.name}`}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new dummy (loopback) interface for local routing and services."
              : "Modify the loopback interface configuration."}
          </DialogDescription>
        </DialogHeader>

        {showDeleteConfirm ? (
          <div className="py-6">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <div className="flex-1">
                <h4 className="font-semibold text-destructive">Delete Interface?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Are you sure you want to delete <code className="font-mono">{existingInterface?.name}</code>?
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Interface
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              {/* Interface Name */}
              <div className="grid gap-2">
                <Label htmlFor="name">
                  Interface Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., dum0"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading || mode === "edit"}
                />
                <p className="text-xs text-muted-foreground">
                  Use format: dum0, dum1, dum2, etc.
                </p>
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="e.g., Router ID Loopback"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* IP Addresses */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>IP Addresses</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddAddress}
                    disabled={loading}
                    className="h-7 px-2"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {addresses.map((addr, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        placeholder="e.g., 10.255.255.1/32"
                        value={addr}
                        onChange={(e) => handleAddressChange(idx, e.target.value)}
                        disabled={loading}
                        className="flex-1"
                      />
                      {addresses.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAddress(idx)}
                          disabled={loading}
                          className="h-9 w-9 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Use CIDR notation. For loopback, typically use /32 for IPv4.
                </p>
              </div>

              {/* MTU */}
              <div className="grid gap-2">
                <Label htmlFor="mtu">MTU</Label>
                <Input
                  id="mtu"
                  type="number"
                  min="68"
                  max="65535"
                  placeholder="Default: 1500"
                  value={mtu}
                  onChange={(e) => setMtu(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* VRF */}
              <div className="grid gap-2">
                <Label htmlFor="vrf">VRF</Label>
                <Input
                  id="vrf"
                  placeholder="e.g., MGMT"
                  value={vrf}
                  onChange={(e) => setVrf(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Assign this interface to a VRF (optional)
                </p>
              </div>

              {/* Disable Switch */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="disabled">Disable Interface</Label>
                  <p className="text-xs text-muted-foreground">
                    Administratively disable this interface
                  </p>
                </div>
                <Switch
                  id="disabled"
                  checked={disabled}
                  onCheckedChange={setDisabled}
                  disabled={loading}
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {mode === "edit" && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading}
                  className="sm:mr-auto"
                >
                  Delete Interface
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "create" ? "Create Interface" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
