"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, X, Plus } from "lucide-react";
import { flowtablesService, type Flowtable } from "@/lib/api/firewall-flowtables";
import { ethernetService } from "@/lib/api/ethernet";
import type { EthernetInterface } from "@/lib/api/types/ethernet";

interface CreateFlowtableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingFlowtables: Flowtable[];
}

export function CreateFlowtableModal({
  open,
  onOpenChange,
  onSuccess,
  existingFlowtables,
}: CreateFlowtableModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [offload, setOffload] = useState<string>("software");

  // Available interfaces
  const [availableInterfaces, setAvailableInterfaces] = useState<EthernetInterface[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>("");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      resetForm();
      loadInterfaces();
    }
  }, [open]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setInterfaces([]);
    setOffload("software");
    setSelectedInterface("");
    setError(null);
  };

  const loadInterfaces = async () => {
    try {
      const config = await ethernetService.getConfig();
      setAvailableInterfaces(config.interfaces);
    } catch (err) {
      console.error("Failed to load interfaces:", err);
    }
  };

  const handleAddInterface = () => {
    if (selectedInterface && !interfaces.includes(selectedInterface)) {
      setInterfaces([...interfaces, selectedInterface]);
      setSelectedInterface("");
    }
  };

  const handleRemoveInterface = (iface: string) => {
    setInterfaces(interfaces.filter((i) => i !== iface));
  };

  const validateName = (value: string): string | null => {
    if (!value.trim()) {
      return "Name is required";
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) {
      return "Name must start with a letter and contain only letters, numbers, hyphens, and underscores";
    }
    if (existingFlowtables.some((ft) => ft.name.toLowerCase() === value.toLowerCase())) {
      return "A flowtable with this name already exists";
    }
    return null;
  };

  const handleSubmit = async () => {
    const nameError = validateName(name);
    if (nameError) {
      setError(nameError);
      return;
    }

    if (interfaces.length === 0) {
      setError("At least one interface is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await flowtablesService.createFlowtable(name, {
        description: description.trim() || undefined,
        interfaces,
        offload,
      });

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create flowtable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Flowtable</DialogTitle>
          <DialogDescription>
            Create a new flowtable for fast-path packet offloading.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., FT_LAN"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Must start with a letter. Use letters, numbers, hyphens, and underscores.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          {/* Interfaces */}
          <div className="space-y-2">
            <Label>
              Interfaces <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <InterfaceSelect
                value={selectedInterface}
                onValueChange={setSelectedInterface}
                interfaces={availableInterfaces
                  .filter((iface) => !interfaces.includes(iface.name))
                  .map((i) => ({ name: i.name, type: i.type, description: i.description ?? null }))}
                className="flex-1"
                placeholder="Select interface"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddInterface}
                disabled={!selectedInterface}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {interfaces.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {interfaces.map((iface) => (
                  <Badge key={iface} variant="secondary" className="gap-1">
                    {iface}
                    <button
                      type="button"
                      onClick={() => handleRemoveInterface(iface)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Select the network interfaces to include in this flowtable.
            </p>
          </div>

          {/* Offload Type */}
          <div className="space-y-2">
            <Label htmlFor="offload">Offload Type</Label>
            <Select value={offload} onValueChange={setOffload}>
              <SelectTrigger id="offload">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="software">Software (kernel-based)</SelectItem>
                <SelectItem value="hardware">Hardware (NIC-based)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Software offload uses the kernel for processing. Hardware offload uses the NIC
              (requires compatible hardware).
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Flowtable"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
