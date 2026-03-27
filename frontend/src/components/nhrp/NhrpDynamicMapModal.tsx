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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { NhrpDynamicMap } from "@/lib/api/nhrp";

interface NhrpDynamicMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (network: string, nbmaDomainName: string) => Promise<void>;
  existingDynamicMap: NhrpDynamicMap | null;
}

export function NhrpDynamicMapModal({
  open,
  onOpenChange,
  onSubmit,
  existingDynamicMap,
}: NhrpDynamicMapModalProps) {
  const isEditMode = existingDynamicMap !== null;

  const [network, setNetwork] = useState("");
  const [nbmaDomainName, setNbmaDomainName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNetwork(existingDynamicMap?.network ?? "");
      setNbmaDomainName(existingDynamicMap?.nbma_domain_name ?? "");
      setError(null);
    }
  }, [open, existingDynamicMap]);

  const handleClose = () => {
    if (!loading) onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!network.trim()) {
      setError("Network is required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit(network.trim(), nbmaDomainName.trim());
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
            {isEditMode ? "Edit Dynamic Map" : "Add Dynamic Map"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="dynmap-network">Network</Label>
            {isEditMode ? (
              <p className="text-sm font-mono font-medium px-3 py-2 bg-muted rounded-md">
                {existingDynamicMap?.network}
              </p>
            ) : (
              <Input
                id="dynmap-network"
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                placeholder="e.g. 10.0.0.0/24"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dynmap-nbma-domain">NBMA Domain Name</Label>
            <Input
              id="dynmap-nbma-domain"
              value={nbmaDomainName}
              onChange={(e) => setNbmaDomainName(e.target.value)}
              placeholder="e.g. nhrp.example.com"
            />
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
              "Add Dynamic Map"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
