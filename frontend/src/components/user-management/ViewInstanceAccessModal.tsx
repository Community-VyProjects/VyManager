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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, AlertCircle, Users, Shield, Server } from "lucide-react";
import { userManagementService, InstanceUserListItem } from "@/lib/api/user-management";

interface ViewInstanceAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: {
    id: string;
    name: string;
    siteName: string;
    description: string | null;
    host: string;
  };
}

export function ViewInstanceAccessModal({
  open,
  onOpenChange,
  instance,
}: ViewInstanceAccessModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<InstanceUserListItem[]>([]);

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open, instance.id]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await userManagementService.getInstanceUsers(instance.id);
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Instance Access: {instance.name}</DialogTitle>
          <DialogDescription>
            Users with access to this instance and their roles
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instance Info */}
          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Server className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="font-medium text-sm text-foreground">{instance.name}</div>
                {instance.description && (
                  <div className="text-xs text-muted-foreground">{instance.description}</div>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Site: {instance.siteName}</span>
                  <span className="font-mono">{instance.host}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8">
              <AlertCircle className="h-10 w-10 text-destructive mb-3" />
              <p className="text-sm text-destructive">{error}</p>
              <Button onClick={loadUsers} variant="outline" size="sm" className="mt-3">
                Retry
              </Button>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No users have access to this instance yet
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {user.user_name?.charAt(0).toUpperCase() ||
                                user.user_email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-sm text-foreground">
                            {user.user_name || "Unnamed User"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{user.user_email}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {user.roles.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No roles</span>
                          ) : (
                            user.roles.map((role, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium"
                              >
                                <Shield className="h-3 w-3" />
                                {role}
                              </span>
                            ))
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Summary */}
          {!loading && !error && (
            <div className="text-sm text-muted-foreground text-center">
              {users.length} {users.length === 1 ? "user has" : "users have"} access to this instance
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
