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
import { Loader2, AlertCircle, AlertTriangle } from "lucide-react";
import { userManagementService, CustomRoleListItem } from "@/lib/api/user-management";

interface DeleteRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: CustomRoleListItem;
  onSuccess: () => void;
}

export function DeleteRoleModal({ open, onOpenChange, role, onSuccess }: DeleteRoleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    setError(null);
    setLoading(true);

    try {
      await userManagementService.deleteRole(role.id);
      handleClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to delete role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Role</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this role? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning message */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-destructive mb-1">Warning</p>
              <p className="text-muted-foreground">
                Deleting this role will:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                <li>Remove this role from {role.user_count} {role.user_count === 1 ? "user" : "users"}</li>
                <li>Delete all associated permissions</li>
                <li>Cannot be recovered once deleted</li>
              </ul>
              {role.user_count > 0 && (
                <p className="mt-3 font-medium text-destructive">
                  Note: Users assigned this role will lose access to features granted by it.
                </p>
              )}
            </div>
          </div>

          {/* Role info */}
          <div className="border border-border rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between">
              <span className="text-sm font-medium text-muted-foreground">Name:</span>
              <span className="text-sm text-foreground font-medium">{role.name}</span>
            </div>
            {role.description && (
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium text-muted-foreground">Description:</span>
                <span className="text-sm text-foreground">{role.description}</span>
              </div>
            )}
            <div className="flex items-start justify-between">
              <span className="text-sm font-medium text-muted-foreground">Assigned to:</span>
              <span className="text-sm text-foreground">
                {role.user_count} {role.user_count === 1 ? "user" : "users"}
              </span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
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
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? "Deleting..." : "Delete Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
