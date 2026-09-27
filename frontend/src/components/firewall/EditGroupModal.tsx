"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X, AlertCircle, Search } from "lucide-react";
import { firewallGroupsService } from "@/lib/api/firewall-groups";
import type { FirewallGroup, GroupBatchOperation, GroupsConfigResponse } from "@/lib/api/types/firewall-groups";

interface EditGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: FirewallGroup | null;
  onSuccess: () => void;
}

// Message keys for group type labels (the config values stay untranslated).
const GROUP_TYPE_KEYS: Record<string, "addressGroup" | "ipv6AddressGroup" | "networkGroup" | "ipv6NetworkGroup" | "portGroup" | "interfaceGroup" | "macGroup" | "domainGroup"> = {
  "address-group": "addressGroup",
  "ipv6-address-group": "ipv6AddressGroup",
  "network-group": "networkGroup",
  "ipv6-network-group": "ipv6NetworkGroup",
  "port-group": "portGroup",
  "interface-group": "interfaceGroup",
  "mac-group": "macGroup",
  "domain-group": "domainGroup",
};

export function EditGroupModal({ open, onOpenChange, group, onSuccess }: EditGroupModalProps) {
  const t = useTranslations("firewallGroups");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [description, setDescription] = useState("");
  const [currentMembers, setCurrentMembers] = useState<string[]>([]);
  const [newMember, setNewMember] = useState("");
  const [membersToAdd, setMembersToAdd] = useState<string[]>([]);
  const [membersToRemove, setMembersToRemove] = useState<string[]>([]);

  // Include groups state
  const [currentIncludedGroups, setCurrentIncludedGroups] = useState<string[]>([]);
  const [includedGroupsToAdd, setIncludedGroupsToAdd] = useState<string[]>([]);
  const [includedGroupsToRemove, setIncludedGroupsToRemove] = useState<string[]>([]);
  const [availableGroups, setAvailableGroups] = useState<FirewallGroup[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");

  const getGroupsForType = useCallback((config: GroupsConfigResponse, type: string): FirewallGroup[] => {
    switch (type) {
      case "address-group":
        return config.address_groups || [];
      case "ipv6-address-group":
        return config.ipv6_address_groups || [];
      case "network-group":
        return config.network_groups || [];
      case "ipv6-network-group":
        return config.ipv6_network_groups || [];
      case "port-group":
        return config.port_groups || [];
      case "interface-group":
        return config.interface_groups || [];
      case "mac-group":
        return config.mac_groups || [];
      default:
        return [];
    }
  }, []);

  const loadAvailableGroups = useCallback(async () => {
    if (!group) return;

    try {
      const config = await firewallGroupsService.getConfig();
      // Get groups of the same type, excluding the current group
      const groupsForType = getGroupsForType(config, group.type);
      const filtered = groupsForType.filter(g => g.name !== group.name);
      setAvailableGroups(filtered);
    } catch (err) {
      console.error("Failed to load available groups:", err);
    }
  }, [getGroupsForType, group]);

  // Load available groups when modal opens
  useEffect(() => {
    if (open && group) {
      loadAvailableGroups();
    }
  }, [open, group, loadAvailableGroups]);

  // Check if current group type supports include
  const supportsInclude = () => {
    if (!group) return false;
    return ["address-group", "ipv6-address-group", "network-group", "ipv6-network-group", "port-group", "interface-group", "mac-group"].includes(group.type);
  };

  // Initialize form when group changes or modal opens
  useEffect(() => {
    if (group && open) {
      setDescription(group.description || "");
      setCurrentMembers([...group.members]);
      setMembersToAdd([]);
      setMembersToRemove([]);
      setNewMember("");
      setCurrentIncludedGroups([...group.included_groups]);
      setIncludedGroupsToAdd([]);
      setIncludedGroupsToRemove([]);
      setError(null);
    }
  }, [open, group]);

  const resetForm = () => {
    setDescription("");
    setCurrentMembers([]);
    setMembersToAdd([]);
    setMembersToRemove([]);
    setNewMember("");
    setCurrentIncludedGroups([]);
    setIncludedGroupsToAdd([]);
    setIncludedGroupsToRemove([]);
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
      setError(t("edit.memberExists", { member: trimmed }));
      return;
    }

    // Check if already in add queue
    if (membersToAdd.includes(trimmed)) {
      setError(t("edit.memberQueued", { member: trimmed }));
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

  const toggleIncludeGroup = (groupName: string) => {
    if (currentIncludedGroups.includes(groupName)) {
      // Remove from current display
      setCurrentIncludedGroups(currentIncludedGroups.filter((g) => g !== groupName));

      // If it was in the add queue, just remove it from there
      if (includedGroupsToAdd.includes(groupName)) {
        setIncludedGroupsToAdd(includedGroupsToAdd.filter((g) => g !== groupName));
      } else {
        // Otherwise mark for removal
        setIncludedGroupsToRemove([...includedGroupsToRemove, groupName]);
      }
    } else {
      // Add to current display
      setCurrentIncludedGroups([...currentIncludedGroups, groupName]);

      // If it was marked for removal, remove it from that list
      if (includedGroupsToRemove.includes(groupName)) {
        setIncludedGroupsToRemove(includedGroupsToRemove.filter((g) => g !== groupName));
      } else {
        // Otherwise mark for addition
        setIncludedGroupsToAdd([...includedGroupsToAdd, groupName]);
      }
    }
  };

  const selectAllGroups = () => {
    const filtered = getFilteredGroups();
    const allNames = filtered.map(g => g.name);
    setCurrentIncludedGroups(allNames);
    // Mark all as additions (will be cleaned up in handleSubmit)
    setIncludedGroupsToAdd(allNames.filter(name => !group?.included_groups.includes(name)));
    setIncludedGroupsToRemove([]);
  };

  const clearAllGroups = () => {
    if (!group) return;
    setCurrentIncludedGroups([]);
    setIncludedGroupsToAdd([]);
    setIncludedGroupsToRemove([...group.included_groups]);
  };

  const getFilteredGroups = () => {
    if (!groupSearchQuery.trim()) return availableGroups;

    const query = groupSearchQuery.toLowerCase();
    return availableGroups.filter(grp =>
      grp.name.toLowerCase().includes(query) ||
      grp.description?.toLowerCase().includes(query)
    );
  };

  const filteredGroups = getFilteredGroups();
  const selectedGroups = filteredGroups.filter(g => currentIncludedGroups.includes(g.name));
  const unselectedGroups = filteredGroups.filter(g => !currentIncludedGroups.includes(g.name));

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

      const getIncludeOp = (action: "set" | "delete") => {
        const prefix = action === "set" ? "set" : "delete";
        const typeKey = group.type.replace(/-/g, "_");
        return `${prefix}_${typeKey}_include`;
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

      // Handle included group additions
      for (const includedGroup of includedGroupsToAdd) {
        operations.push({ op: getIncludeOp("set"), value: includedGroup });
      }

      // Handle included group removals
      for (const includedGroup of includedGroupsToRemove) {
        operations.push({ op: getIncludeOp("delete"), value: includedGroup });
      }

      // Only submit if there are changes
      if (operations.length === 0) {
        setError(t("edit.noChanges"));
        setLoading(false);
        return;
      }

      await firewallGroupsService.updateGroup(group.name, group.type, operations);

      // Refresh config cache
      await firewallGroupsService.refreshConfig();

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("edit.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  const getMemberPlaceholder = () => {
    if (!group) return "";

    const key = GROUP_TYPE_KEYS[group.type];
    return key ? t(`memberPlaceholders.${key}`) : "";
  };

  const getMemberLabel = () => {
    if (!group) return t("edit.member");

    const key = GROUP_TYPE_KEYS[group.type];
    return key ? t(`memberLabels.${key}`) : t("edit.member");
  };

  const getGroupTypeLabel = () => {
    if (!group) return "";

    const key = GROUP_TYPE_KEYS[group.type];
    return key ? t(`types.${key}`) : group.type;
  };

  if (!group) return null;

  const hasChanges =
    description.trim() !== (group.description || "") ||
    membersToAdd.length > 0 ||
    membersToRemove.length > 0 ||
    includedGroupsToAdd.length > 0 ||
    includedGroupsToRemove.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
          <DialogDescription>
            {t("edit.description")}
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
            <Label>{t("form.groupName")}</Label>
            <Input value={group.name} disabled className="font-mono" />
          </div>

          <div className="space-y-2">
            <Label>{t("form.groupType")}</Label>
            <Input value={getGroupTypeLabel()} disabled />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{tc("description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("form.descriptionPlaceholder")}
              rows={2}
            />
          </div>

          {/* Add Members */}
          <div className="space-y-2">
            <Label htmlFor="new-member">{t("edit.addMember", { label: getMemberLabel() })}</Label>
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
                {tc("add")}
              </Button>
            </div>
          </div>

          {/* Current Members */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("edit.currentMembers")}</Label>
              <span className="text-sm text-muted-foreground">
                {t("memberCount", { count: currentMembers.length, n: String(currentMembers.length) })}
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
                      {isNew && <span className="text-xs">{t("edit.newBadge")}</span>}
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
                {t("edit.noMembers")}
              </p>
            )}
          </div>

          {/* Include Groups (only for supported types) */}
          {supportsInclude() && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("edit.includeOther")}</Label>
                <span className="text-xs text-muted-foreground">
                  {t("form.selectedOf", { selected: String(currentIncludedGroups.length), total: String(availableGroups.length) })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("form.includeHint")}
              </p>

              {/* Search and Quick Actions */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("form.searchGroups")}
                    value={groupSearchQuery}
                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllGroups}
                    disabled={filteredGroups.length === 0 || filteredGroups.every(g => currentIncludedGroups.includes(g.name))}
                    className="text-xs h-9"
                  >
                    {t("form.all")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearAllGroups}
                    disabled={currentIncludedGroups.length === 0}
                    className="text-xs h-9"
                  >
                    {t("form.clear")}
                  </Button>
                </div>
              </div>

              {/* Checkbox List */}
              <div className="border rounded-md bg-muted/30">
                {availableGroups.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    {t("edit.noOtherGroups")}
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    {t("form.noGroupsMatchSearch")}
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {/* Selected Groups First */}
                    {selectedGroups.length > 0 && (
                      <>
                        <div className="sticky top-0 bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">
                          {t("form.selectedCount", { count: String(selectedGroups.length) })}
                        </div>
                        {selectedGroups.map((availGroup) => {
                          const isNew = includedGroupsToAdd.includes(availGroup.name);
                          return (
                            <div key={availGroup.name} className="flex items-center space-x-2 px-3 py-2 hover:bg-muted/50 border-b">
                              <input
                                type="checkbox"
                                id={`include-${availGroup.name}`}
                                checked={true}
                                onChange={() => toggleIncludeGroup(availGroup.name)}
                                className="cursor-pointer"
                              />
                              <label
                                htmlFor={`include-${availGroup.name}`}
                                className="text-sm font-mono cursor-pointer flex-1 flex items-center gap-2"
                              >
                                {availGroup.name}
                                {isNew && (
                                  <Badge variant="default" className="text-xs px-1 py-0">{t("edit.newBadge")}</Badge>
                                )}
                                {availGroup.description && (
                                  <span className="text-xs text-muted-foreground">({availGroup.description})</span>
                                )}
                              </label>
                            </div>
                          );
                        })}
                      </>
                    )}

                    {/* Unselected Groups */}
                    {unselectedGroups.length > 0 && (
                      <>
                        {selectedGroups.length > 0 && (
                          <div className="sticky top-0 bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">
                            {t("form.availableCount", { count: String(unselectedGroups.length) })}
                          </div>
                        )}
                        {unselectedGroups.map((availGroup) => (
                          <div key={availGroup.name} className="flex items-center space-x-2 px-3 py-2 hover:bg-muted/50 border-b last:border-b-0">
                            <input
                              type="checkbox"
                              id={`include-${availGroup.name}`}
                              checked={false}
                              onChange={() => toggleIncludeGroup(availGroup.name)}
                              className="cursor-pointer"
                            />
                            <label
                              htmlFor={`include-${availGroup.name}`}
                              className="text-sm font-mono cursor-pointer flex-1"
                            >
                              {availGroup.name}
                              {availGroup.description && (
                                <span className="text-xs text-muted-foreground ml-2">({availGroup.description})</span>
                              )}
                            </label>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !hasChanges}>
            {loading ? tc("saving") : t("edit.saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
