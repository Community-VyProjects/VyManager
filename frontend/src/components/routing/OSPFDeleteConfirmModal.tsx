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
import { ospfService } from "@/lib/api/ospf";
import { useToast } from "@/hooks/useToast";

type DeleteType = "interface" | "area" | "area-network" | "redistribute";

interface OSPFDeleteConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  deleteType: DeleteType;
  targetName: string;
  additionalInfo?: {
    area?: string;
    network?: string;
  };
}

const DELETE_TITLES: Record<DeleteType, string> = {
  interface: "Delete Interface",
  area: "Delete Area",
  "area-network": "Delete Network",
  redistribute: "Remove Redistribution",
};

const DELETE_DESCRIPTIONS: Record<DeleteType, string> = {
  interface: "This will remove the interface from OSPF routing.",
  area: "This will delete the area and all its networks.",
  "area-network": "This network will be removed from the OSPF area.",
  redistribute: "Routes from this protocol will no longer be redistributed into OSPF.",
};

export function OSPFDeleteConfirmModal({
  open,
  onOpenChange,
  onSuccess,
  deleteType,
  targetName,
  additionalInfo,
}: OSPFDeleteConfirmModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      let operation: { op: string; [key: string]: string };

      switch (deleteType) {
        case "interface":
          operation = { op: "delete_interface", interface: targetName };
          break;
        case "area":
          operation = { op: "delete_area", area: targetName };
          break;
        case "area-network":
          operation = {
            op: "delete_area_network",
            area: additionalInfo?.area || "",
            network: additionalInfo?.network || targetName,
          };
          break;
        case "redistribute":
          operation = { op: "delete_redistribute", protocol: targetName };
          break;
      }

      const response = await ospfService.configureBatch({
        operations: [operation],
      });

      if (response.success) {
        toast.success("Deleted", `${DELETE_TITLES[deleteType]} successful`);
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error("Delete Failed", response.error || "Unknown error");
      }
    } catch (error) {
      console.error("Delete error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Error", errorMessage || "Failed to delete");
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
            {DELETE_TITLES[deleteType]}
          </DialogTitle>
          <DialogDescription>{DELETE_DESCRIPTIONS[deleteType]}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm">
              Are you sure you want to delete{" "}
              <code className="font-mono font-bold">{targetName}</code>?
            </p>
            {additionalInfo?.area && deleteType === "area-network" && (
              <p className="text-xs text-muted-foreground mt-1">
                Area: {additionalInfo.area}
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
