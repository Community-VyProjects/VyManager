"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Loader2 } from "lucide-react";
import { wirelessService, type WirelessInterface } from "@/lib/api/wireless";

interface DeleteWirelessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: WirelessInterface | null;
}

export function DeleteWirelessModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
}: DeleteWirelessModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!interfaceData) return;
    setLoading(true);
    setError(null);
    try {
      const result = await wirelessService.deleteInterface(interfaceData.name);
      if (!result.success) {
        setError(result.error ?? "Delete failed");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!loading) { setError(null); onOpenChange(o); } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Wireless Interface</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            Are you sure you want to delete interface{" "}
            <code className="font-mono font-semibold text-foreground">
              {interfaceData?.name}
            </code>
            {interfaceData?.ssid && (
              <>
                {" "}(SSID:{" "}
                <span className="font-medium text-foreground">
                  {interfaceData.ssid}
                </span>
                )
              </>
            )}
            ?{" "}
            This will permanently remove the interface and all its configuration from VyOS.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <pre className="text-sm text-destructive whitespace-pre-wrap flex-1">{error}</pre>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting…
              </>
            ) : (
              "Delete Interface"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
