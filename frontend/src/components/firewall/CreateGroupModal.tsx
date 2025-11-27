"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X, AlertCircle } from "lucide-react";
import { firewallGroupsService } from "@/lib/api/firewall-groups";
import type { GroupType, FirewallGroupsCapabilities } from "@/lib/api/types/firewall-groups";

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: FirewallGroupsCapabilities | null;
}

export function CreateGroupModal({ open, onOpenChange, onSuccess, capabilities }: CreateGroupModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [groupName, setGroupName] = useState("");
  const [groupType, setGroupType] = useState<GroupType>("address-group");
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [newMember, setNewMember] = useState("");

  const resetForm = () => {
    setGroupName("");
    setGroupType("address-group");
    setDescription("");
    setMembers([]);
    setNewMember("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const addMember = () => {
    const trimmed = newMember.trim();
    if (trimmed && !members.includes(trimmed)) {
      setMembers([...members, trimmed]);
      setNewMember("");
    }
  };

  const removeMember = (member: string) => {
    setMembers(members.filter((m) => m !== member));
  };

  const handleSubmit = async () => {
    // Validation
    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }

    if (members.length === 0) {
      setError("At least one member is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await firewallGroupsService.createGroup(groupName.trim(), groupType, {
        description: description.trim() || undefined,
        members,
      });

      // Refresh config cache
      await firewallGroupsService.refreshConfig();

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  const getGroupTypeLabel = (type: GroupType) => {
    const labels: Record<GroupType, string> = {
      "address-group": "IPv4 Address Group",
      "ipv6-address-group": "IPv6 Address Group",
      "network-group": "IPv4 Network Group",
      "ipv6-network-group": "IPv6 Network Group",
      "port-group": "Port Group",
      "interface-group": "Interface Group",
      "mac-group": "MAC Address Group",
      "domain-group": "Domain Group",
      "remote-group": "Remote Group",
    };
    return labels[type];
  };

  const getMemberPlaceholder = (type: GroupType) => {
    const placeholders: Record<GroupType, string> = {
      "address-group": "e.g., 10.0.0.1 or 10.0.0.1-10.0.0.10",
      "ipv6-address-group": "e.g., 2001:db8::1 or 2001:db8::1-2001:db8::10",
      "network-group": "e.g., 10.0.0.0/24",
      "ipv6-network-group": "e.g., 2001:db8::/32",
      "port-group": "e.g., 80, 8000-8100, or http",
      "interface-group": "e.g., eth0 or eth1.100",
      "mac-group": "e.g., 00:11:22:33:44:55",
      "domain-group": "e.g., example.com",
      "remote-group": "e.g., https://example.com/blocklist.txt",
    };
    return placeholders[type];
  };

  const getMemberLabel = (type: GroupType) => {
    const labels: Record<GroupType, string> = {
      "address-group": "IPv4 Address/Range",
      "ipv6-address-group": "IPv6 Address/Range",
      "network-group": "Network (CIDR)",
      "ipv6-network-group": "IPv6 Network (CIDR)",
      "port-group": "Port",
      "interface-group": "Interface",
      "mac-group": "MAC Address",
      "domain-group": "Domain",
      "remote-group": "URL",
    };
    return labels[type];
  };

  // Get available group types based on capabilities
  const getAvailableGroupTypes = () => {
    if (!capabilities) return [];

    type CapabilityKey = keyof typeof capabilities.group_types;

    const groupTypeMap: Array<{ value: GroupType; label: string; capKey: CapabilityKey }> = [
      { value: "address-group", label: "IPv4 Address Group", capKey: "address_group" },
      { value: "ipv6-address-group", label: "IPv6 Address Group", capKey: "ipv6_address_group" },
      { value: "network-group", label: "IPv4 Network Group", capKey: "network_group" },
      { value: "ipv6-network-group", label: "IPv6 Network Group", capKey: "ipv6_network_group" },
      { value: "port-group", label: "Port Group", capKey: "port_group" },
      { value: "interface-group", label: "Interface Group", capKey: "interface_group" },
      { value: "mac-group", label: "MAC Address Group", capKey: "mac_group" },
      { value: "domain-group", label: "Domain Group", capKey: "domain_group" },
      { value: "remote-group", label: "Remote Group", capKey: "remote_group" },
    ];

    return groupTypeMap.filter(({ capKey }) =>
      capabilities.group_types[capKey]?.supported === true
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Firewall Group</DialogTitle>
          <DialogDescription>
            Create a new firewall group to organize addresses, networks, ports, or other resources for use in firewall rules.
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

          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="group-name">
              Group Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., INTERNAL_NETS"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Use uppercase with underscores (e.g., WEB_SERVERS, INTERNAL_NETS)
            </p>
          </div>

          {/* Group Type */}
          <div className="space-y-2">
            <Label htmlFor="group-type">
              Group Type <span className="text-destructive">*</span>
            </Label>
            <Select value={groupType} onValueChange={(v) => setGroupType(v as GroupType)}>
              <SelectTrigger id="group-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAvailableGroupTypes().map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {/* Members */}
          <div className="space-y-2">
            <Label htmlFor="new-member">
              {getMemberLabel(groupType)} <span className="text-destructive">*</span>
            </Label>
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
                placeholder={getMemberPlaceholder(groupType)}
                className="font-mono"
              />
              <Button type="button" onClick={addMember} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Current Members */}
            {members.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {members.length} member{members.length !== 1 ? "s" : ""}:
                </p>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-md bg-muted/30">
                  {members.map((member, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1 font-mono text-xs">
                      {member}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeMember(member)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
