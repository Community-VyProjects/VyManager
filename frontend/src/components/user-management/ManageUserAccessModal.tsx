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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Server,
  Shield,
  X,
} from "lucide-react";
import {
  userManagementService,
  UserListItem,
  UserInstanceAssignment,
  BuiltInRole,
  CustomRoleListItem,
} from "@/lib/api/user-management";
import { sessionService, Site } from "@/lib/api/session";

interface ManageUserAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserListItem;
  onSuccess: () => void;
}

interface InstanceWithSite {
  id: string;
  name: string;
  siteId: string;
  siteName: string;
}

export function ManageUserAccessModal({
  open,
  onOpenChange,
  user,
  onSuccess,
}: ManageUserAccessModalProps) {
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [assignments, setAssignments] = useState<UserInstanceAssignment[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [instances, setInstances] = useState<InstanceWithSite[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRoleListItem[]>([]);

  // Add assignment form
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<string[]>([]);
  const [selectedRoleType, setSelectedRoleType] = useState<"BUILT_IN" | "CUSTOM">("BUILT_IN");
  const [selectedBuiltInRole, setSelectedBuiltInRole] = useState<string>("");
  const [selectedCustomRoleId, setSelectedCustomRoleId] = useState<string>("");

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, user.id]);

  const loadData = async () => {
    setDataLoading(true);
    setError(null);

    try {
      // Load in parallel
      const [assignmentsData, sitesData, rolesData] = await Promise.all([
        userManagementService.getUserAssignments(user.id),
        sessionService.listSites(),
        userManagementService.listRoles(),
      ]);

      setAssignments(assignmentsData);
      setSites(sitesData);
      setCustomRoles(rolesData);

      // Load instances for each site
      const allInstances: InstanceWithSite[] = [];
      for (const site of sitesData) {
        try {
          const siteInstances = await sessionService.listInstances(site.id);
          for (const instance of siteInstances) {
            allInstances.push({
              id: instance.id,
              name: instance.name,
              siteId: site.id,
              siteName: site.name,
            });
          }
        } catch (err) {
          console.error(`Failed to load instances for site ${site.name}:`, err);
        }
      }
      setInstances(allInstances);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setDataLoading(false);
    }
  };

  const handleClose = () => {
    setShowAddForm(false);
    setSelectedSiteId("");
    setSelectedInstanceIds([]);
    setSelectedRoleType("BUILT_IN");
    setSelectedBuiltInRole("");
    setSelectedCustomRoleId("");
    setError(null);
    onOpenChange(false);
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    setLoading(true);
    setError(null);

    try {
      await userManagementService.removeAssignment(assignmentId);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to remove assignment");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async () => {
    setError(null);

    // Validation
    if (selectedInstanceIds.length === 0) {
      setError("Please select at least one instance");
      return;
    }

    if (selectedRoleType === "BUILT_IN" && !selectedBuiltInRole) {
      setError("Please select a built-in role");
      return;
    }

    if (selectedRoleType === "CUSTOM" && !selectedCustomRoleId) {
      setError("Please select a custom role");
      return;
    }

    setLoading(true);

    try {
      const roles =
        selectedRoleType === "BUILT_IN"
          ? [{ type: "BUILT_IN" as const, builtInRole: selectedBuiltInRole }]
          : [{ type: "CUSTOM" as const, customRoleId: selectedCustomRoleId }];

      await userManagementService.assignUser({
        user_id: user.id,
        instance_ids: selectedInstanceIds,
        roles,
      });

      // Reset form
      setShowAddForm(false);
      setSelectedSiteId("");
      setSelectedInstanceIds([]);
      setSelectedRoleType("BUILT_IN");
      setSelectedBuiltInRole("");
      setSelectedCustomRoleId("");

      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to assign user");
    } finally {
      setLoading(false);
    }
  };

  const handleSiteChange = (siteId: string) => {
    setSelectedSiteId(siteId);
    setSelectedInstanceIds([]);
  };

  const handleSelectAllInstances = () => {
    const siteInstances = instances
      .filter((inst) => inst.siteId === selectedSiteId)
      .map((inst) => inst.id);
    setSelectedInstanceIds(siteInstances);
  };

  const handleInstanceToggle = (instanceId: string) => {
    setSelectedInstanceIds((prev) =>
      prev.includes(instanceId)
        ? prev.filter((id) => id !== instanceId)
        : [...prev, instanceId]
    );
  };

  const filteredInstances = selectedSiteId
    ? instances.filter((inst) => inst.siteId === selectedSiteId)
    : [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Access: {user.name || user.email}</DialogTitle>
          <DialogDescription>
            Assign or revoke instance access and roles for this user
          </DialogDescription>
        </DialogHeader>

        {dataLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 px-1">
            <div className="space-y-4">
              {/* Error message */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Current Assignments */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Current Access ({assignments.length})
                </h4>
                {assignments.length === 0 ? (
                  <div className="border border-dashed border-border rounded-lg p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      User has no instance access yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="border border-border rounded-lg p-3 flex items-start justify-between gap-3"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Server className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm text-foreground">
                              {assignment.instance_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({assignment.site_name})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 pl-6">
                            <Shield className="h-3 w-3 text-primary" />
                            <span className="text-xs text-muted-foreground">
                              {assignment.role_type === "BUILT_IN"
                                ? assignment.built_in_role
                                : assignment.custom_role_name}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveAssignment(assignment.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Assignment Section */}
              {!showAddForm ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAddForm(true)}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Instance Access
                </Button>
              ) : (
                <div className="border border-border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">
                      Add Instance Access
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddForm(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Select Site */}
                  <div className="space-y-2">
                    <Label>Site</Label>
                    <Select value={selectedSiteId} onValueChange={handleSiteChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a site" />
                      </SelectTrigger>
                      <SelectContent>
                        {sites.map((site) => {
                          const instanceCount = instances.filter(i => i.siteId === site.id).length;
                          return (
                            <SelectItem key={site.id} value={site.id}>
                              {site.name} ({instanceCount} {instanceCount === 1 ? 'instance' : 'instances'})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Select Instances */}
                  {selectedSiteId && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Instances</Label>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={handleSelectAllInstances}
                        >
                          Select All
                        </Button>
                      </div>
                      <div className="border border-border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                        {filteredInstances.map((instance) => (
                          <div
                            key={instance.id}
                            className="flex items-center gap-2"
                          >
                            <Checkbox
                              id={`instance-${instance.id}`}
                              checked={selectedInstanceIds.includes(instance.id)}
                              onCheckedChange={() => handleInstanceToggle(instance.id)}
                            />
                            <label
                              htmlFor={`instance-${instance.id}`}
                              className="text-sm text-foreground cursor-pointer flex-1"
                            >
                              {instance.name}
                            </label>
                          </div>
                        ))}
                      </div>
                      {selectedInstanceIds.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {selectedInstanceIds.length} instance(s) selected
                        </p>
                      )}
                    </div>
                  )}

                  {/* Select Role Type */}
                  <div className="space-y-2">
                    <Label>Role Type</Label>
                    <Select
                      value={selectedRoleType}
                      onValueChange={(value) =>
                        setSelectedRoleType(value as "BUILT_IN" | "CUSTOM")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUILT_IN">Built-in Role</SelectItem>
                        <SelectItem value="CUSTOM">Custom Role</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Select Role */}
                  {selectedRoleType === "BUILT_IN" ? (
                    <div className="space-y-2">
                      <Label>Built-in Role</Label>
                      <Select
                        value={selectedBuiltInRole}
                        onValueChange={setSelectedBuiltInRole}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={BuiltInRole.SUPER_ADMIN}>
                            SUPER_ADMIN (Full access to everything)
                          </SelectItem>
                          <SelectItem value={BuiltInRole.ADMIN}>
                            ADMIN (All VyOS features)
                          </SelectItem>
                          <SelectItem value={BuiltInRole.VIEWER}>
                            VIEWER (Read-only access)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Custom Role</Label>
                      <Select
                        value={selectedCustomRoleId}
                        onValueChange={setSelectedCustomRoleId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {customRoles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                              {role.description && ` - ${role.description}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {customRoles.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          No custom roles available. Create one in the Roles tab.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Add Button */}
                  <Button
                    onClick={handleAddAssignment}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {loading ? "Adding..." : "Add Access"}
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Close
          </Button>
          <Button onClick={() => { handleClose(); onSuccess(); }} disabled={loading}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
