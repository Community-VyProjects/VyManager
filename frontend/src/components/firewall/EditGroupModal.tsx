"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X, AlertCircle } from "lucide-react";
import { firewallGroupsService } from "@/lib/api/firewall-groups";
import type { FirewallGroup, GroupBatchOperation } from "@/lib/api/types/firewall-groups";

interface EditGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: FirewallGroup | null;
  onSuccess: () => void;
}

export function EditGroupModal({ open, onOpenChange, group, onSuccess }: EditGroupModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [description, setDescription] = useState("");
  const [currentMembers, setCurrentMembers] = useState<string[]>([]);
  const [newMember, setNewMember] = useState("");
  const [membersToAdd, setMembersToAdd] = useState<string[]>([]);
  const [membersToRemove, setMembersToRemove] = useState<string[]>([]);

  // Initialize form when group changes
  useEffect(() => {
    if (group) {
      setDescription(group.description || "");
      setCurrentMembers([...group.members]);
      setMembersToAdd([]);
      setMembersToRemove([]);
      setNewMember("");
      setError(null);
    }
  }, [group]);

  const resetForm = () => {
    setDescription("");
    setCurrentMembers([]);
    setMembersToAdd([]);
    setMembersToRemove([]);
    setNewMember("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const addMember = () => {
    const trimmed = newMember.trim();
    if (!trimmed) return;

    // Check if already exists in current members
    if (currentMembers.includes(trimmed)) {
      setError(`Member "${trimmed}" already exists`);
      return;
    }

    // Check if already in add queue
    if (membersToAdd.includes(trimmed)) {
      setError(`Member "${trimmed}" is already queued to be added`);
      return;
    }

    // If it was marked for removal, remove it from that list and restore it
    if (membersToRemove.includes(trimmed)) {
      setMembersToRemove(membersToRemove.filter((m) => m !== trimmed));
      setCurrentMembers([...currentMembers, trimmed]);
    } else {
      // Otherwise add to the add queue
      setMembersToAdd([...membersToAdd, trimmed]);
      setCurrentMembers([...currentMembers, trimmed]);
    }

    setNewMember("");
    setError(null);
  };

  const removeMember = (member: string) => {
    // Remove from current display
    setCurrentMembers(currentMembers.filter((m) => m !== member));

    // If it was in the add queue, just remove it from there
    if (membersToAdd.includes(member)) {
      setMembersToAdd(membersToAdd.filter((m) => m !== member));
    } else {
      // Otherwise mark for removal
      setMembersToRemove([...membersToRemove, member]);
    }
  };

  const handleSubmit = async () => {
    if (!group) return;

    setLoading(true);
    setError(null);

    try {
      const operations: GroupBatchOperation[] = [];

      // Get operation names based on group type
      const getDescOp = (action: "set" | "delete") => {
        const prefix = action === "set" ? "set" : "delete";
        const typeKey = group.type.replace(/-/g, "_");
        return `${prefix}_${typeKey}_description`;
      };

      const getMemberOp = (action: "set" | "delete") => {
        const prefix = action === "set" ? "set" : "delete";
        const typeKey = group.type.replace(/-/g, "_");

        // Determine member field name based on group type
        const memberField = group.type.includes("remote") ? "url" :
                           group.type.includes("network") ? "network" :
                           group.type.includes("port") ? "port" :
                           group.type.includes("interface") ? "interface" :
                           group.type.includes("mac") ? "mac" :
                           group.type.includes("address") ? "address" :
                           group.type.includes("domain") ? "address" : "address";

        return `${prefix}_${typeKey}_${memberField}`;
      };

      // Handle description changes
      const originalDesc = group.description || "";
      const newDesc = description.trim();

      if (newDesc !== originalDesc) {
        if (newDesc) {
          // Set new description
          operations.push({ op: getDescOp("set"), value: newDesc });
        } else if (originalDesc) {
          // Delete description if it was cleared
          operations.push({ op: getDescOp("delete") });
        }
      }

      // Handle member additions
      for (const member of membersToAdd) {
        operations.push({ op: getMemberOp("set"), value: member });
      }

      // Handle member removals
      for (const member of membersToRemove) {
        operations.push({ op: getMemberOp("delete"), value: member });
      }

      // Only submit if there are changes
      if (operations.length === 0) {
        setError("No changes to save");
        setLoading(false);
        return;
      }

      await firewallGroupsService.updateGroup(group.name, group.type, operations);

      // Refresh config cache
      await firewallGroupsService.refreshConfig();

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update group");
    } finally {
      setLoading(false);
    }
  };

  const getMemberPlaceholder = () => {
    if (!group) return "";

    const placeholders: Record<string, string> = {
      "address-group": "e.g., 10.0.0.1 or 10.0.0.1-10.0.0.10",
      "ipv6-address-group": "e.g., 2001:db8::1 or 2001:db8::1-2001:db8::10",
      "network-group": "e.g., 10.0.0.0/24",
      "ipv6-network-group": "e.g., 2001:db8::/32",
      "port-group": "e.g., 80, 8000-8100, or http",
      "interface-group": "e.g., eth0 or eth1.100",
      "mac-group": "e.g., 00:11:22:33:44:55",
      "domain-group": "e.g., example.com",
    };
    return placeholders[group.type] || "";
  };

  const getMemberLabel = () => {
    if (!group) return "Member";

    const labels: Record<string, string> = {
      "address-group": "IPv4 Address/Range",
      "ipv6-address-group": "IPv6 Address/Range",
      "network-group": "Network (CIDR)",
      "ipv6-network-group": "IPv6 Network (CIDR)",
      "port-group": "Port",
      "interface-group": "Interface",
      "mac-group": "MAC Address",
      "domain-group": "Domain",
    };
    return labels[group.type] || "Member";
  };

  const getGroupTypeLabel = () => {
    if (!group) return "";

    const labels: Record<string, string> = {
      "address-group": "IPv4 Address Group",
      "ipv6-address-group": "IPv6 Address Group",
      "network-group": "IPv4 Network Group",
      "ipv6-network-group": "IPv6 Network Group",
      "port-group": "Port Group",
      "interface-group": "Interface Group",
      "mac-group": "MAC Address Group",
      "domain-group": "Domain Group",
    };
    return labels[group.type] || group.type;
  };

  if (!group) return null;

  const hasChanges =
    description.trim() !== (group.description || "") ||
    membersToAdd.length > 0 ||
    membersToRemove.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Firewall Group</DialogTitle>
          <DialogDescription>
            Modify the description and members of this firewall group. Changes will be applied immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error Alert */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* Group Info (read-only) */}
          <div className="space-y-2">
            <Label>Group Name</Label>
            <Input value={group.name} disabled className="font-mono" />
          </div>

          <div className="space-y-2">
            <Label>Group Type</Label>
            <Input value={getGroupTypeLabel()} disabled />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for this group"
              rows={2}
            />
          </div>

          {/* Add Members */}
          <div className="space-y-2">
            <Label htmlFor="new-member">Add {getMemberLabel()}</Label>
            <div className="flex gap-2">
              <Input
                id="new-member"
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMember();
                  }
                }}
                placeholder={getMemberPlaceholder()}
                className="font-mono"
              />
              <Button type="button" onClick={addMember} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Current Members */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Current Members</Label>
              <span className="text-sm text-muted-foreground">
                {currentMembers.length} member{currentMembers.length !== 1 ? "s" : ""}
              </span>
            </div>
            {currentMembers.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-3 border rounded-md bg-muted/30">
                {currentMembers.map((member, idx) => {
                  const isNew = membersToAdd.includes(member);
                  return (
                    <Badge
                      key={idx}
                      variant={isNew ? "default" : "secondary"}
                      className="gap-1 font-mono text-xs"
                    >
                      {isNew && <span className="text-xs">NEW</span>}
                      {member}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeMember(member);
                        }}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3 cursor-pointer" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/30">
                No members (all removed)
              </p>
            )}
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !hasChanges}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
