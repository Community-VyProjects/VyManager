"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertCircle } from "lucide-react";
import {
  userManagementService,
  CustomRoleListItem,
  FeatureGroup,
  PermissionLevel,
} from "@/lib/api/user-management";
import { PermissionMatrix } from "./PermissionMatrix";

interface EditRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: CustomRoleListItem;
  onSuccess: () => void;
}

export function EditRoleModal({ open, onOpenChange, role, onSuccess }: EditRoleModalProps) {
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      loadRoleDetails();
    }
  }, [open, role.id]);

  const loadRoleDetails = async () => {
    setDataLoading(true);
    setError(null);

    try {
      const roleDetails = await userManagementService.getRole(role.id);
      setName(roleDetails.name);
      setDescription(roleDetails.description || "");
      setPermissions(roleDetails.permissions);
    } catch (err: any) {
      setError(err.message || "Failed to load role details");
    } finally {
      setDataLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setPermissions({});
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError("Role name is required");
      return;
    }

    if (name.length > 50) {
      setError("Role name must be 50 characters or less");
      return;
    }

    setLoading(true);

    try {
      await userManagementService.updateRole(role.id, {
        name: name.trim(),
        description: description.trim() || null,
        permissions,
      });

      handleClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to update role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Role: {role.name}</DialogTitle>
          <DialogDescription>
            Update role permissions and details
          </DialogDescription>
        </DialogHeader>

        {dataLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-4 overflow-hidden">
            {/* Error message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Role Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., NAT_ADMIN, FIREWALL_VIEWER"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                {name.length}/50 characters
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose of this role..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={2}
              />
            </div>

            {/* Permission Matrix */}
            <div className="space-y-2 flex-1 flex flex-col overflow-hidden">
              <Label>Permissions</Label>
              <div className="flex-1 overflow-auto border border-border rounded-lg">
                <PermissionMatrix
                  permissions={permissions}
                  onChange={setPermissions}
                  disabled={loading}
                />
              </div>
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
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {loading ? "Updating..." : "Update Role"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
