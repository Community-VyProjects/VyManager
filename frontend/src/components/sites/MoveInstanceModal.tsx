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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, MoveRight, Loader2 } from "lucide-react";
import { sessionService, Site } from "@/lib/api/session";

interface MoveInstanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  instance: any | null;
  currentSite: Site | null;
  allSites: Site[];
}

export function MoveInstanceModal({
  open,
  onOpenChange,
  onSuccess,
  instance,
  currentSite,
  allSites,
}: MoveInstanceModalProps) {
  const [destinationSiteId, setDestinationSiteId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setDestinationSiteId("");
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const handleMove = async () => {
    if (!instance || !destinationSiteId) {
      setError("Please select a destination site");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await sessionService.updateInstance(instance.id, {
        site_id: destinationSiteId,
      });

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move instance");
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDestinationSiteId("");
    setError(null);
    setLoading(false);
    onOpenChange(false);
  };

  // Filter available sites - only show sites where user has ADMIN role
  // and exclude the current site
  const availableSites = allSites.filter(
    (site) =>
      site.id !== currentSite?.id &&
      site.role === "ADMIN"
  );

  if (!instance || !currentSite) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Move Instance to Another Site</DialogTitle>
          <DialogDescription>
            Move "{instance.name}" to a different site. You can only move instances
            to sites where you have Owner or Admin permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Site */}
          <div className="space-y-2">
            <Label>Current Site</Label>
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="font-medium text-sm">{currentSite.name}</p>
              {currentSite.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {currentSite.description}
                </p>
              )}
            </div>
          </div>

          {/* Destination Site */}
          <div className="space-y-2">
            <Label htmlFor="destination-site">Destination Site *</Label>
            {availableSites.length === 0 ? (
              <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No other sites available. You need Owner or Admin permissions on
                  another site to move this instance.
                </p>
              </div>
            ) : (
              <Select
                value={destinationSiteId}
                onValueChange={setDestinationSiteId}
                disabled={loading}
              >
                <SelectTrigger id="destination-site">
                  <SelectValue placeholder="Select destination site" />
                </SelectTrigger>
                <SelectContent>
                  {availableSites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      <div>
                        <p className="font-medium">{site.name}</p>
                        {site.description && (
                          <p className="text-xs text-muted-foreground">
                            {site.description}
                          </p>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Warning */}
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                  Important
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Moving this instance will immediately change its site association.
                  If you're currently connected to this instance, you'll be
                  disconnected.
                </p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Error</p>
                  <p className="text-sm text-destructive mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={loading || !destinationSiteId || availableSites.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Moving...
              </>
            ) : (
              <>
                <MoveRight className="mr-2 h-4 w-4" />
                Move Instance
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
