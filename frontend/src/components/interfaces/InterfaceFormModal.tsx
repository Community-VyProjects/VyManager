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
import { Loader2, Plus, X } from "lucide-react";
import type { NetworkInterface, CreateInterfaceRequest } from "@/lib/api/interfaces";
import { vrfService, type VRF } from "@/lib/api/vrf";

interface InterfaceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateInterfaceRequest) => Promise<void>;
  interface?: NetworkInterface | null;
  mode: "create" | "edit";
}

export function InterfaceFormModal({
  isOpen,
  onClose,
  onSubmit,
  interface: editInterface,
  mode,
}: InterfaceFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateInterfaceRequest>({
    name: "",
    type: "ethernet",
    addresses: [],
    description: "",
    vrf: "",
    "hw-id": "",
    "source-interface": "",
  });
  const [addressInput, setAddressInput] = useState("");
  const [vrfs, setVrfs] = useState<VRF[]>([]);
  const [isLoadingVrfs, setIsLoadingVrfs] = useState(false);

  // Fetch VRFs when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchVrfs();
    }
  }, [isOpen]);

  async function fetchVrfs() {
    try {
      setIsLoadingVrfs(true);
      const data = await vrfService.getConfig();
      // Convert Record<string, VRF> to array
      const vrfArray = Object.entries(data.vrfs).map(([_, vrf]) => vrf);
      setVrfs(vrfArray);
    } catch (error) {
      console.error("Failed to fetch VRFs:", error);
      setVrfs([]);
    } finally {
      setIsLoadingVrfs(false);
    }
  }

  useEffect(() => {
    if (editInterface && mode === "edit") {
      setFormData({
        name: editInterface.name,
        type: editInterface.type,
        addresses: editInterface.addresses,
        description: editInterface.description || "",
        vrf: editInterface.vrf || "",
        "hw-id": editInterface["hw-id"] || "",
        "source-interface": editInterface["source-interface"] || "",
      });
    } else {
      setFormData({
        name: "",
        type: "ethernet",
        addresses: [],
        description: "",
        vrf: "",
        "hw-id": "",
        "source-interface": "",
      });
    }
    setAddressInput("");
  }, [editInterface, mode, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submitData: CreateInterfaceRequest = {
        ...formData,
        addresses: formData.addresses?.filter((a) => a.trim() !== ""),
        description: formData.description || undefined,
        vrf: formData.vrf || undefined,
        "hw-id": formData["hw-id"] || undefined,
        "source-interface": formData["source-interface"] || undefined,
      };

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error("Failed to submit interface:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addAddress = () => {
    if (addressInput.trim()) {
      setFormData({
        ...formData,
        addresses: [...(formData.addresses || []), addressInput.trim()],
      });
      setAddressInput("");
    }
  };

  const removeAddress = (index: number) => {
    setFormData({
      ...formData,
      addresses: formData.addresses?.filter((_, i) => i !== index),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create New Interface" : `Edit Interface: ${editInterface?.name}`}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Configure a new network interface for your VyOS router."
              : "Update the configuration for this network interface."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Interface Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Interface Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="eth0"
                required
                disabled={mode === "edit"}
              />
            </div>

            {/* Interface Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as CreateInterfaceRequest["type"] })
                }
                disabled={mode === "edit"}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ethernet">Ethernet</SelectItem>
                  <SelectItem value="wireguard">WireGuard</SelectItem>
                  <SelectItem value="dummy">Dummy</SelectItem>
                  <SelectItem value="loopback">Loopback</SelectItem>
                  <SelectItem value="pppoe">PPPoE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., LAN Interface"
            />
          </div>

          {/* IP Addresses */}
          <div className="space-y-2">
            <Label>IP Addresses</Label>
            <div className="flex gap-2">
              <Input
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="e.g., 192.168.1.1/24"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAddress();
                  }
                }}
              />
              <Button type="button" onClick={addAddress} variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.addresses && formData.addresses.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.addresses.map((addr, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1 bg-accent text-foreground px-2 py-1 rounded text-sm font-mono"
                  >
                    {addr}
                    <button
                      type="button"
                      onClick={() => removeAddress(idx)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* VRF */}
          <div className="space-y-2">
            <Label htmlFor="vrf">VRF</Label>
            <Select
              value={formData.vrf || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, vrf: value === "none" ? "" : value })
              }
              disabled={isLoadingVrfs}
            >
              <SelectTrigger id="vrf">
                <SelectValue placeholder={isLoadingVrfs ? "Loading VRFs..." : "Select VRF"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {vrfs.map((vrf) => (
                  <SelectItem key={vrf.name} value={vrf.name}>
                    {vrf.name}
                    {vrf.description && ` - ${vrf.description}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Hardware ID (for Ethernet) */}
          {formData.type === "ethernet" && (
            <div className="space-y-2">
              <Label htmlFor="hw-id">Hardware ID (MAC Address)</Label>
              <Input
                id="hw-id"
                value={formData["hw-id"]}
                onChange={(e) => setFormData({ ...formData, "hw-id": e.target.value })}
                placeholder="e.g., 00:11:22:33:44:55"
              />
            </div>
          )}

          {/* Source Interface (for PPPoE) */}
          {formData.type === "pppoe" && (
            <div className="space-y-2">
              <Label htmlFor="source-interface">Source Interface</Label>
              <Input
                id="source-interface"
                value={formData["source-interface"]}
                onChange={(e) => setFormData({ ...formData, "source-interface": e.target.value })}
                placeholder="e.g., eth0"
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create Interface" : "Update Interface"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
