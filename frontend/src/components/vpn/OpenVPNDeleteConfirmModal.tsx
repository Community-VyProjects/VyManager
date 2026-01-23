"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, AlertTriangle } from "lucide-react";
import { openvpnService, type OpenVPNInterface } from "@/lib/api/openvpn";
import { useToast } from "@/hooks/useToast";

interface OpenVPNDeleteConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interface: OpenVPNInterface;
}

export function OpenVPNDeleteConfirmModal({
  open,
  onOpenChange,
  onSuccess,
  interface: iface,
}: OpenVPNDeleteConfirmModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const getModeLabel = () => {
    switch (iface.mode) {
      case "server":
        return "server";
      case "site-to-site":
        return "site-to-site tunnel";
      case "client":
        return "client";
      default:
        return "interface";
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await openvpnService.deleteInterface(iface.name);

      if (response.success) {
        toast.success("Deleted", `OpenVPN ${getModeLabel()} ${iface.name} has been deleted`);
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error("Delete Failed", response.error || "Unknown error");
      }
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Failed to delete interface");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete OpenVPN Interface
          </DialogTitle>
          <DialogDescription>
            This will permanently delete the OpenVPN {getModeLabel()}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm">
              Are you sure you want to delete{" "}
              <code className="font-mono font-bold">{iface.name}</code>?
            </p>
            {iface.description && (
              <p className="text-xs text-muted-foreground mt-1">{iface.description}</p>
            )}
            {iface.mode === "server" && iface.server?.clients && iface.server.clients.length > 0 && (
              <p className="text-xs text-destructive mt-2">
                Warning: This server has {iface.server.clients.length} configured client(s) that will also be removed.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
