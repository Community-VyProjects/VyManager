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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, X, RefreshCw } from "lucide-react";
import { vrrpService, type VRRPGroup } from "@/lib/api/vrrp";
import { useToast } from "@/hooks/useToast";

interface VRRPGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingGroups: VRRPGroup[];
  editData?: VRRPGroup | null;
  onSuccess?: () => void;
}

export function VRRPGroupModal({
  open,
  onOpenChange,
  existingGroups,
  editData,
  onSuccess,
}: VRRPGroupModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEditing = !!editData;

  // Form state
  const [name, setName] = useState("");
  const [vrid, setVrid] = useState("");
  const [interfaceName, setInterfaceName] = useState("");
  const [priority, setPriority] = useState("100");
  const [description, setDescription] = useState("");
  const [addresses, setAddresses] = useState<string[]>([]);
  const [newAddress, setNewAddress] = useState("");
  const [noPreempt, setNoPreempt] = useState(false);
  const [preemptDelay, setPreemptDelay] = useState("");
  const [rfc3768Compatibility, setRfc3768Compatibility] = useState(false);

  // Reset form when modal opens/closes or edit data changes
  useEffect(() => {
    if (open) {
      if (editData) {
        setName(editData.name);
        setVrid(editData.vrid || "");
        setInterfaceName(editData.interface || "");
        setPriority(editData.priority || "100");
        setDescription(editData.description || "");
        setAddresses(editData.addresses || []);
        setNoPreempt(editData.no_preempt);
        setPreemptDelay(editData.preempt_delay || "");
        setRfc3768Compatibility(editData.rfc3768_compatibility);
      } else {
        setName("");
        setVrid("");
        setInterfaceName("");
        setPriority("100");
        setDescription("");
        setAddresses([]);
        setNoPreempt(false);
        setPreemptDelay("");
        setRfc3768Compatibility(false);
      }
      setNewAddress("");
    }
  }, [open, editData]);

  const handleAddAddress = () => {
    if (newAddress && !addresses.includes(newAddress)) {
      setAddresses([...addresses, newAddress]);
      setNewAddress("");
    }
  };

  const handleRemoveAddress = (addr: string) => {
    setAddresses(addresses.filter((a) => a !== addr));
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      toast.error("Validation Error", "Group name is required");
      return;
    }

    if (!isEditing) {
      if (!vrid.trim()) {
        toast.error("Validation Error", "VRID is required");
        return;
      }

      if (!interfaceName.trim()) {
        toast.error("Validation Error", "Interface is required");
        return;
      }

      if (addresses.length === 0) {
        toast.error("Validation Error", "At least one virtual address is required");
        return;
      }

      // Check for duplicate name
      if (existingGroups.some((g) => g.name === name)) {
        toast.error("Validation Error", "A VRRP group with this name already exists");
        return;
      }
    }

    setLoading(true);

    try {
      let response;

      if (isEditing) {
        // Update existing group
        response = await vrrpService.updateVRRPGroup(name, {
          priority: parseInt(priority),
          description: description || undefined,
          noPreempt,
          preemptDelay: preemptDelay ? parseInt(preemptDelay) : undefined,
          rfc3768Compatibility,
        });
      } else {
        // Create new group
        response = await vrrpService.createVRRPGroup(name, {
          vrid: parseInt(vrid),
          interface: interfaceName,
          addresses,
          priority: parseInt(priority),
          description: description || undefined,
          noPreempt,
          preemptDelay: preemptDelay ? parseInt(preemptDelay) : undefined,
          rfc3768Compatibility,
        });
      }

      if (response.success) {
        toast.success(
          isEditing ? "Group Updated" : "Group Created",
          `VRRP group "${name}" has been ${isEditing ? "updated" : "created"} successfully`
        );
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error("Error", response.error || "Failed to save VRRP group");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit VRRP Group" : "Create VRRP Group"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modify the VRRP group settings"
              : "Configure a new VRRP group for high availability"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Basic Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Basic Settings</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Group Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., WAN, LAN"
                    disabled={isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vrid">VRID (1-255)</Label>
                  <Input
                    id="vrid"
                    type="number"
                    min={1}
                    max={255}
                    value={vrid}
                    onChange={(e) => setVrid(e.target.value)}
                    placeholder="e.g., 10"
                    disabled={isEditing}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interface">Interface</Label>
                  <Input
                    id="interface"
                    value={interfaceName}
                    onChange={(e) => setInterfaceName(e.target.value)}
                    placeholder="e.g., eth0"
                    disabled={isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority (1-255)</Label>
                  <Input
                    id="priority"
                    type="number"
                    min={1}
                    max={255}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    placeholder="100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher priority becomes master
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={2}
                />
              </div>
            </div>

            {/* Virtual Addresses */}
            {!isEditing && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Virtual Addresses</h4>

                <div className="flex gap-2">
                  <Input
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="e.g., 192.168.1.1/24"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAddress())}
                  />
                  <Button type="button" onClick={handleAddAddress} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {addresses.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {addresses.map((addr) => (
                      <Badge key={addr} variant="secondary" className="gap-1">
                        {addr}
                        <button
                          type="button"
                          onClick={() => handleRemoveAddress(addr)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Advanced Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Advanced Settings</h4>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>No Preempt</Label>
                  <p className="text-xs text-muted-foreground">
                    Prevent higher priority router from taking over
                  </p>
                </div>
                <Switch
                  checked={noPreempt}
                  onCheckedChange={setNoPreempt}
                />
              </div>

              {!noPreempt && (
                <div className="space-y-2">
                  <Label htmlFor="preemptDelay">Preempt Delay (seconds)</Label>
                  <Input
                    id="preemptDelay"
                    type="number"
                    min={0}
                    value={preemptDelay}
                    onChange={(e) => setPreemptDelay(e.target.value)}
                    placeholder="Optional delay before preemption"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>RFC 3768 Compatibility</Label>
                  <p className="text-xs text-muted-foreground">
                    Create dedicated interface with virtual MAC
                  </p>
                </div>
                <Switch
                  checked={rfc3768Compatibility}
                  onCheckedChange={setRfc3768Compatibility}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
