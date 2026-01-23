"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Server, Building2, Trash2, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  userManagementService,
  type UserListItem,
  type UserInstanceAssignment,
} from "@/lib/api/user-management";

interface UserAssignmentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserListItem | null;
  onAssignmentRemoved?: () => void;
}

export function UserAssignmentsModal({
  open,
  onOpenChange,
  user,
  onAssignmentRemoved,
}: UserAssignmentsModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<UserInstanceAssignment[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      loadAssignments();
    }
  }, [open, user]);

  const loadAssignments = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const data = await userManagementService.getUserAssignments(user.id);
      setAssignments(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load assignments"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    setRemovingId(assignmentId);

    try {
      await userManagementService.removeAssignment(assignmentId);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      onAssignmentRemoved?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove assignment"
      );
    } finally {
      setRemovingId(null);
    }
  };

  if (!user) return null;

  const getRoleBadgeStyles = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "OPERATOR":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "VIEWER":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "";
    }
  };

  // Group assignments by site
  const groupedBySite = assignments.reduce(
    (acc, assignment) => {
      if (!acc[assignment.site_id]) {
        acc[assignment.site_id] = {
          site_name: assignment.site_name,
          assignments: [],
        };
      }
      acc[assignment.site_id].assignments.push(assignment);
      return acc;
    },
    {} as Record<
      string,
      { site_name: string; assignments: UserInstanceAssignment[] }
    >
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Instance Assignments</DialogTitle>
          <DialogDescription>
            View and manage instance access for {user.name || user.email}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={loadAssignments}>
                  Retry
                </Button>
              </div>
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Server className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Instance Access
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                This user doesn&apos;t have access to any instances. Assign them
                to instances from the Sites &amp; Instances page.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedBySite).map(
                ([siteId, { site_name, assignments: siteAssignments }]) => (
                  <div key={siteId} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium text-foreground">{site_name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {siteAssignments.length} instance
                        {siteAssignments.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {siteAssignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="border rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Server className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-foreground">
                                  {assignment.instance_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Assigned{" "}
                                  {new Date(
                                    assignment.assigned_at
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={getRoleBadgeStyles(assignment.role)}
                              >
                                <Shield className="h-3 w-3 mr-1" />
                                {assignment.role}
                              </Badge>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleRemoveAssignment(assignment.id)
                                }
                                disabled={removingId === assignment.id}
                              >
                                {removingId === assignment.id ? (
                                  <LoadingSpinner className="h-4 w-4" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Show feature permissions for OPERATOR/VIEWER */}
                          {assignment.role !== "ADMIN" &&
                            assignment.feature_permissions.length > 0 && (
                              <div className="pt-2 border-t">
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                  Feature Permissions:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {assignment.feature_permissions.map(
                                    (perm, idx) => (
                                      <Badge
                                        key={idx}
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {perm.feature}
                                        {perm.can_edit ? " (Edit)" : " (View)"}
                                      </Badge>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
