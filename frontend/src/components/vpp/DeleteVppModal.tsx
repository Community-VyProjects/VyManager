"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { vppService, type VppSubType } from "@/lib/api/vpp";
import { ApiError } from "@/lib/types/api";

const SUB_TYPE_LABELS: Record<VppSubType, string> = {
  bonding: "Bonding",
  bridge: "Bridge",
  gre: "GRE",
  ipip: "IPIP",
  loopback: "Loopback",
  vxlan: "VXLAN",
  xconnect: "XConnect",
};

interface DeleteVppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: { name: string } | null;
  subType: VppSubType | null;
}

export function DeleteVppModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
  subType,
}: DeleteVppModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!interfaceData || !subType) return;
    setLoading(true);
    setError(null);
    try {
      const result = await vppService.deleteInterface(interfaceData.name, subType);
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to delete VPP interface");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to delete VPP interface");
    } finally {
      setLoading(false);
    }
  };

  if (!interfaceData || !subType) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete VPP {SUB_TYPE_LABELS[subType]}: {interfaceData.name}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Are you sure you want to delete this VPP interface? This action cannot be undone.</p>
            <div className="rounded-lg bg-muted/50 border p-3 mt-2">
              <p className="text-sm text-muted-foreground">
                Type: <span className="font-medium text-foreground">{SUB_TYPE_LABELS[subType]}</span>
                {" · "}
                Name: <span className="font-medium text-foreground font-mono">{interfaceData.name}</span>
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Interface"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
