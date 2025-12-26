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
import { userManagementService, UserListItem } from "@/lib/api/user-management";

interface DeleteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserListItem;
  onSuccess: () => void;
}

export function DeleteUserModal({ open, onOpenChange, user, onSuccess }: DeleteUserModalProps) {
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
      await userManagementService.deleteUser(user.id);
      handleClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this user? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning message */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-destructive mb-1">Warning</p>
              <p className="text-muted-foreground">
                Deleting this user will remove:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                <li>All instance access ({user.instance_count} {user.instance_count === 1 ? "instance" : "instances"})</li>
                <li>All role assignments ({user.roles.length} {user.roles.length === 1 ? "role" : "roles"})</li>
                <li>User authentication and account data</li>
              </ul>
            </div>
          </div>

          {/* User info */}
          <div className="border border-border rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between">
              <span className="text-sm font-medium text-muted-foreground">Name:</span>
              <span className="text-sm text-foreground font-medium">
                {user.name || "Unnamed User"}
              </span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-sm font-medium text-muted-foreground">Email:</span>
              <span className="text-sm text-foreground">{user.email}</span>
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
            {loading ? "Deleting..." : "Delete User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
