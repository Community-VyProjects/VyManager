"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw } from "lucide-react";
import { vrrpService, type VRRPGroup, type VRRPSyncGroup } from "@/lib/api/vrrp";
import { useToast } from "@/hooks/useToast";

interface VRRPSyncGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vrrpGroups: VRRPGroup[];
  editData?: VRRPSyncGroup | null;
  onSuccess?: () => void;
}

export function VRRPSyncGroupModal({
  open,
  onOpenChange,
  vrrpGroups,
  editData,
  onSuccess,
}: VRRPSyncGroupModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEditing = !!editData;

  // Form state
  const [name, setName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [masterScript, setMasterScript] = useState("");
  const [backupScript, setBackupScript] = useState("");
  const [faultScript, setFaultScript] = useState("");

  // Reset form when modal opens/closes or edit data changes
  useEffect(() => {
    if (open) {
      if (editData) {
        setName(editData.name);
        setSelectedMembers(editData.members || []);
        setMasterScript(editData.transition_scripts?.master || "");
        setBackupScript(editData.transition_scripts?.backup || "");
        setFaultScript(editData.transition_scripts?.fault || "");
      } else {
        setName("");
        setSelectedMembers([]);
        setMasterScript("");
        setBackupScript("");
        setFaultScript("");
      }
    }
  }, [open, editData]);

  const handleMemberToggle = (groupName: string, checked: boolean) => {
    if (checked) {
      setSelectedMembers([...selectedMembers, groupName]);
    } else {
      setSelectedMembers(selectedMembers.filter((m) => m !== groupName));
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      toast.error("Validation Error", "Sync group name is required");
      return;
    }

    if (selectedMembers.length < 2) {
      toast.error("Validation Error", "Select at least 2 VRRP groups to sync");
      return;
    }

    setLoading(true);

    try {
      let response;

      if (isEditing) {
        // For editing, we need to manage members manually
        // This is simplified - in production you'd track adds/removes
        const operations = [];

        // Add new members
        for (const member of selectedMembers) {
          if (!editData?.members?.includes(member)) {
            operations.push({ op: "add_sync_group_member", name, member });
          }
        }

        // Remove old members
        for (const member of editData?.members || []) {
          if (!selectedMembers.includes(member)) {
            operations.push({ op: "delete_sync_group_member", name, member });
          }
        }

        // Add transition scripts if provided
        if (masterScript) {
          operations.push({ op: "set_sync_group_transition_script_master", name, script: masterScript });
        }
        if (backupScript) {
          operations.push({ op: "set_sync_group_transition_script_backup", name, script: backupScript });
        }
        if (faultScript) {
          operations.push({ op: "set_sync_group_transition_script_fault", name, script: faultScript });
        }

        response = await vrrpService.configureBatch({ operations });
      } else {
        // Create new sync group
        response = await vrrpService.createSyncGroup(name, selectedMembers);

        // Add transition scripts if provided
        if (response.success && (masterScript || backupScript || faultScript)) {
          const scriptOps = [];
          if (masterScript) {
            scriptOps.push({ op: "set_sync_group_transition_script_master", name, script: masterScript });
          }
          if (backupScript) {
            scriptOps.push({ op: "set_sync_group_transition_script_backup", name, script: backupScript });
          }
          if (faultScript) {
            scriptOps.push({ op: "set_sync_group_transition_script_fault", name, script: faultScript });
          }
          if (scriptOps.length > 0) {
            await vrrpService.configureBatch({ operations: scriptOps });
          }
        }
      }

      if (response.success) {
        toast.success(
          isEditing ? "Sync Group Updated" : "Sync Group Created",
          `Sync group "${name}" has been ${isEditing ? "updated" : "created"} successfully`
        );
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error("Error", response.error || "Failed to save sync group");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Sync Group" : "Create Sync Group"}</DialogTitle>
          <DialogDescription>
            Sync groups allow VRRP groups to transition together for coordinated failover
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Sync Group Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., MAIN"
                disabled={isEditing}
              />
            </div>

            {/* Members */}
            <div className="space-y-3">
              <Label>VRRP Group Members</Label>
              {vrrpGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No VRRP groups available. Create VRRP groups first.
                </p>
              ) : (
                <div className="space-y-2">
                  {vrrpGroups.map((group) => (
                    <div key={group.name} className="flex items-center space-x-2">
                      <Checkbox
                        id={`member-${group.name}`}
                        checked={selectedMembers.includes(group.name)}
                        onCheckedChange={(checked) =>
                          handleMemberToggle(group.name, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={`member-${group.name}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {group.name}
                        <span className="text-muted-foreground ml-2">
                          (VRID: {group.vrid}, {group.interface})
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                All members should have similar priority and preemption settings
              </p>
            </div>

            {/* Transition Scripts */}
            <div className="space-y-4">
              <Label>Transition Scripts (optional)</Label>

              <div className="space-y-2">
                <Label htmlFor="masterScript" className="text-xs">Master Script</Label>
                <Input
                  id="masterScript"
                  value={masterScript}
                  onChange={(e) => setMasterScript(e.target.value)}
                  placeholder="/config/scripts/sync-master.sh"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="backupScript" className="text-xs">Backup Script</Label>
                <Input
                  id="backupScript"
                  value={backupScript}
                  onChange={(e) => setBackupScript(e.target.value)}
                  placeholder="/config/scripts/sync-backup.sh"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="faultScript" className="text-xs">Fault Script</Label>
                <Input
                  id="faultScript"
                  value={faultScript}
                  onChange={(e) => setFaultScript(e.target.value)}
                  placeholder="/config/scripts/sync-fault.sh"
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || vrrpGroups.length < 2}>
            {loading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Sync Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
