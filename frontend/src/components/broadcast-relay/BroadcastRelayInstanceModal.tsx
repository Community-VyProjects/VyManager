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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import type { BroadcastRelayInstance } from "@/lib/api/broadcast-relay";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: BroadcastRelayInstance | null;
  onSuccess: () => void;
  onSubmit: (data: Partial<BroadcastRelayInstance> & { id: string }) => Promise<void>;
}

const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

function isValidIPv4(value: string): boolean {
  if (!IPV4_REGEX.test(value)) return false;
  return value.split(".").every((octet) => parseInt(octet, 10) <= 255);
}

export function BroadcastRelayInstanceModal({ open, onOpenChange, instance, onSuccess, onSubmit }: Props) {
  const isEditMode = !!instance;

  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [interfacesLoading, setInterfacesLoading] = useState(false);

  const [instanceId, setInstanceId] = useState("");
  const [port, setPort] = useState("");
  const [interfaces, setInterfaces] = useState<string[]>([]);
  const [selectedInterface, setSelectedInterface] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [disabled, setDisabled] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (instance) {
        setInstanceId(instance.id);
        setPort(instance.port != null ? String(instance.port) : "");
        setInterfaces([...instance.interfaces]);
        setAddress(instance.address ?? "");
        setDescription(instance.description ?? "");
        setDisabled(instance.disabled);
      } else {
        resetForm();
      }
      loadInterfaces();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, instance]);

  const loadInterfaces = async () => {
    setInterfacesLoading(true);
    try {
      const response = await showService.getAllInterfaces();
      setAvailableInterfaces(response.interfaces);
    } catch {
      // non-critical
    } finally {
      setInterfacesLoading(false);
    }
  };

  const resetForm = () => {
    setInstanceId("");
    setPort("");
    setInterfaces([]);
    setSelectedInterface("");
    setAddress("");
    setDescription("");
    setDisabled(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleAddInterface = () => {
    if (!selectedInterface || interfaces.includes(selectedInterface)) return;
    setInterfaces([...interfaces, selectedInterface]);
    setSelectedInterface("");
    setError(null);
  };

  const handleRemoveInterface = (iface: string) => {
    setInterfaces(interfaces.filter((i) => i !== iface));
  };

  const validate = (): string | null => {
    if (!isEditMode) {
      const idNum = parseInt(instanceId, 10);
      if (!instanceId || isNaN(idNum) || idNum < 1 || idNum > 99) {
        return "Instance ID must be an integer between 1 and 99";
      }
    }

    const portNum = parseInt(port, 10);
    if (!port || isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return "UDP port must be an integer between 1 and 65535";
    }

    if (interfaces.length === 0) {
      return "At least one interface is required";
    }

    if (address && !isValidIPv4(address)) {
      return "Source address must be a valid IPv4 address (e.g. 192.168.1.1)";
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        id: isEditMode ? instance!.id : instanceId,
        port: parseInt(port, 10),
        interfaces,
        address: address || null,
        description: description || null,
        disabled,
      });
      handleClose();
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const availableToAdd = availableInterfaces.filter((i) => !interfaces.includes(i.name));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Relay Instance" : "Add Relay Instance"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Modify relay instance #${instance!.id}.`
              : "Configure a new UDP broadcast relay instance."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5 pb-2">
            {/* Instance ID */}
            <div className="space-y-2">
              <Label htmlFor="br-instance-id">Instance ID</Label>
              <Input
                id="br-instance-id"
                type="number"
                value={instanceId}
                onChange={(e) => setInstanceId(e.target.value)}
                min={1}
                max={99}
                disabled={isEditMode}
                className={isEditMode ? "bg-muted font-mono" : "font-mono"}
                placeholder="1–99"
              />
              {isEditMode && (
                <p className="text-xs text-muted-foreground">Instance ID cannot be changed after creation.</p>
              )}
            </div>

            {/* UDP Port */}
            <div className="space-y-2">
              <Label htmlFor="br-port">UDP Port</Label>
              <Input
                id="br-port"
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                min={1}
                max={65535}
                placeholder="e.g. 67"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">UDP port to relay broadcasts on (1–65535).</p>
            </div>

            {/* Interfaces */}
            <div className="space-y-3">
              <div>
                <Label>Interfaces</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  At least one interface required; two or more needed for relaying.
                </p>
              </div>

              {interfaces.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {interfaces.map((iface) => (
                    <Badge key={iface} variant="secondary" className="font-mono gap-1 pr-1">
                      {iface}
                      <button
                        onClick={() => handleRemoveInterface(iface)}
                        className="ml-1 hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <InterfaceSelect
                  value={selectedInterface}
                  onValueChange={setSelectedInterface}
                  interfaces={availableToAdd}
                  className="flex-1"
                  placeholder="Select interface to add"
                  emptyText="No more interfaces available"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={handleAddInterface}
                  disabled={!selectedInterface}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Source Address */}
            <div className="space-y-2">
              <Label htmlFor="br-address">Source Address</Label>
              <Input
                id="br-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 192.168.1.1"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Optional. If unset, the original sender&apos;s address is used.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="br-description">Description</Label>
              <Input
                id="br-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                maxLength={255}
              />
            </div>

            {/* Disabled */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="br-disabled"
                checked={disabled}
                onCheckedChange={(checked) => setDisabled(checked === true)}
              />
              <Label htmlFor="br-disabled" className="cursor-pointer">
                Disable this instance
              </Label>
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
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
              "Add Instance"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
