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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { userManagementService, SiteRole } from "@/lib/api/user-management";
import { ApiError } from "@/lib/types/api";

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateUserModal({ open, onOpenChange, onSuccess }: CreateUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [siteRole, setSiteRole] = useState<SiteRole>(SiteRole.VIEWER);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const resetForm = () => {
    setName("");
    setEmail("");
    setSiteRole(SiteRole.VIEWER);
    setPassword("");
    setConfirmPassword("");
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
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await userManagementService.createUser({
        name: name.trim() || null,
        email: email.trim(),
        password,
        site_role: siteRole,
      });

      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>
            Create a new user account. You can assign them to instances later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Name (optional) */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Email (required) */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Site Role (required) */}
          <div className="space-y-2">
            <Label htmlFor="siteRole">
              Site Role <span className="text-destructive">*</span>
            </Label>
            <Select
              value={siteRole}
              onValueChange={(value) => setSiteRole(value as SiteRole)}
              disabled={loading}
            >
              <SelectTrigger id="siteRole">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SiteRole.ADMIN}>
                  <div className="flex flex-col">
                    <span className="font-medium">Admin</span>
                    <span className="text-xs text-muted-foreground">Can manage sites, instances, and users</span>
                  </div>
                </SelectItem>
                <SelectItem value={SiteRole.VIEWER}>
                  <div className="flex flex-col">
                    <span className="font-medium">Viewer</span>
                    <span className="text-xs text-muted-foreground">Read-only access to assigned sites and instances</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Site role determines platform-wide permissions
            </p>
          </div>

          {/* Password (required) */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Confirm Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
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
              {loading ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
