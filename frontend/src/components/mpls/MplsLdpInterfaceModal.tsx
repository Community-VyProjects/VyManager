"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2 } from "lucide-react";
import { MplsLdpInterface } from "@/lib/api/mpls";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";

interface MplsLdpInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (iface: MplsLdpInterface) => Promise<void>;
  existingInterface: MplsLdpInterface | null;
}

export function MplsLdpInterfaceModal({
  open,
  onOpenChange,
  onSubmit,
  existingInterface,
}: MplsLdpInterfaceModalProps) {
  const isEditMode = existingInterface !== null;

  const [interfaceName, setInterfaceName] = useState("");
  const [disableHello, setDisableHello] = useState(false);
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available interfaces on open
  useEffect(() => {
    if (open && !isEditMode) {
      showService.getAllInterfaces().then((res) => {
        setAvailableInterfaces(res.interfaces);
      }).catch(() => {
        // Silently ignore — user can type manually via fallback
      });
    }
  }, [open, isEditMode]);

  // Reset form on open
  useEffect(() => {
    if (open) {
      setInterfaceName(existingInterface?.name ?? "");
      setDisableHello(existingInterface?.disable_establish_hello ?? false);
      setError(null);
    }
  }, [open, existingInterface]);

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
    }
  };

  const handleSubmit = async () => {
    if (!interfaceName.trim()) {
      setError("Interface name is required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        name: interfaceName.trim(),
        disable_establish_hello: disableHello,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit LDP Interface" : "Add LDP Interface"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Interface Name */}
          <div className="space-y-2">
            <Label htmlFor="ldp-iface-name">Interface</Label>
            {isEditMode ? (
              <p className="text-sm font-mono font-medium px-3 py-2 bg-muted rounded-md">
                {existingInterface?.name}
              </p>
            ) : availableInterfaces.length > 0 ? (
              <InterfaceSelect
                value={interfaceName}
                onValueChange={setInterfaceName}
                interfaces={availableInterfaces}
                id="ldp-iface-name"
                placeholder="Select interface..."
              />
            ) : (
              <input
                id="ldp-iface-name"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={interfaceName}
                onChange={(e) => setInterfaceName(e.target.value)}
                placeholder="e.g. eth0"
              />
            )}
          </div>

          {/* Disable Establish Hello */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="ldp-iface-disable-hello"
              checked={disableHello}
              onCheckedChange={(checked) => setDisableHello(checked === true)}
            />
            <div className="space-y-0.5">
              <Label htmlFor="ldp-iface-disable-hello" className="cursor-pointer">
                Disable Establish Hello
              </Label>
              <p className="text-xs text-muted-foreground">
                Suppress LDP hello messages on this interface
              </p>
            </div>
          </div>
        </div>

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
              "Add Interface"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
