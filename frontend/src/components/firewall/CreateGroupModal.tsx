"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X, AlertCircle, Search } from "lucide-react";
import { firewallGroupsService, type FirewallGroup } from "@/lib/api/firewall-groups";
import type { GroupType, FirewallGroupsCapabilities, GroupsConfigResponse } from "@/lib/api/types/firewall-groups";

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: FirewallGroupsCapabilities | null;
}

// Message keys for group type labels (the config values stay untranslated).
const GROUP_TYPE_KEYS = {
  "address-group": "addressGroup",
  "ipv6-address-group": "ipv6AddressGroup",
  "network-group": "networkGroup",
  "ipv6-network-group": "ipv6NetworkGroup",
  "port-group": "portGroup",
  "interface-group": "interfaceGroup",
  "mac-group": "macGroup",
  "domain-group": "domainGroup",
  "remote-group": "remoteGroup",
} as const satisfies Record<GroupType, string>;

export function CreateGroupModal({ open, onOpenChange, onSuccess, capabilities }: CreateGroupModalProps) {
  const t = useTranslations("firewallGroups");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [groupName, setGroupName] = useState("");
  const [groupType, setGroupType] = useState<GroupType>("address-group");
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [newMember, setNewMember] = useState("");
  const [includedGroups, setIncludedGroups] = useState<string[]>([]);
  const [availableGroups, setAvailableGroups] = useState<FirewallGroup[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");

  const getGroupsForType = useCallback((config: GroupsConfigResponse, type: GroupType): FirewallGroup[] => {
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
    try {
      const config = await firewallGroupsService.getConfig();
      // Get groups of the same type
      const groupsForType = getGroupsForType(config, groupType);
      setAvailableGroups(groupsForType);
    } catch (err) {
      console.error("Failed to load available groups:", err);
    }
  }, [getGroupsForType, groupType]);

  // Load existing groups for the include dropdown
  useEffect(() => {
    if (open) {
      loadAvailableGroups();
    }
  }, [open, groupType, loadAvailableGroups]);

  // Check if current group type supports include
  const supportsInclude = () => {
    return ["address-group", "ipv6-address-group", "network-group", "ipv6-network-group", "port-group", "interface-group", "mac-group"].includes(groupType);
  };

  const resetForm = () => {
    setGroupName("");
    setGroupType("address-group");
    setDescription("");
    setMembers([]);
    setNewMember("");
    setIncludedGroups([]);
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

  const toggleIncludeGroup = (groupName: string) => {
    if (includedGroups.includes(groupName)) {
      setIncludedGroups(includedGroups.filter((g) => g !== groupName));
    } else {
      setIncludedGroups([...includedGroups, groupName]);
    }
  };

  const selectAllGroups = () => {
    const filtered = getFilteredGroups();
    const allNames = filtered.map(g => g.name);
    setIncludedGroups(allNames);
  };

  const clearAllGroups = () => {
    setIncludedGroups([]);
  };

  const getFilteredGroups = () => {
    if (!groupSearchQuery.trim()) return availableGroups;

    const query = groupSearchQuery.toLowerCase();
    return availableGroups.filter(group =>
      group.name.toLowerCase().includes(query) ||
      group.description?.toLowerCase().includes(query)
    );
  };

  const filteredGroups = getFilteredGroups();
  const selectedGroups = filteredGroups.filter(g => includedGroups.includes(g.name));
  const unselectedGroups = filteredGroups.filter(g => !includedGroups.includes(g.name));

  const handleSubmit = async () => {
    // Validation
    if (!groupName.trim()) {
      setError(t("create.nameRequired"));
      return;
    }

    if (members.length === 0 && includedGroups.length === 0) {
      setError(t("create.memberRequired"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await firewallGroupsService.createGroup(groupName.trim(), groupType, {
        description: description.trim() || undefined,
        members,
        included_groups: includedGroups.length > 0 ? includedGroups : undefined,
      });

      // Refresh config cache
      await firewallGroupsService.refreshConfig();

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("create.createFailed"));
    } finally {
      setLoading(false);
    }
  };


  const getMemberPlaceholder = (type: GroupType) => {
    return t(`memberPlaceholders.${GROUP_TYPE_KEYS[type]}`);
  };

  const getMemberLabel = (type: GroupType) => {
    return t(`memberLabels.${GROUP_TYPE_KEYS[type]}`);
  };

  // Get available group types based on capabilities
  const getAvailableGroupTypes = () => {
    if (!capabilities) return [];

    type CapabilityKey = keyof typeof capabilities.group_types;

    const groupTypeMap: Array<{ value: GroupType; capKey: CapabilityKey }> = [
      { value: "address-group", capKey: "address_group" },
      { value: "ipv6-address-group", capKey: "ipv6_address_group" },
      { value: "network-group", capKey: "network_group" },
      { value: "ipv6-network-group", capKey: "ipv6_network_group" },
      { value: "port-group", capKey: "port_group" },
      { value: "interface-group", capKey: "interface_group" },
      { value: "mac-group", capKey: "mac_group" },
      { value: "domain-group", capKey: "domain_group" },
      { value: "remote-group", capKey: "remote_group" },
    ];

    return groupTypeMap
      .filter(({ capKey }) => capabilities.group_types[capKey]?.supported === true)
      .map(({ value }) => ({ value, label: t(`types.${GROUP_TYPE_KEYS[value]}`) }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("create.title")}</DialogTitle>
          <DialogDescription>
            {t("create.description")}
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
              {t("form.groupName")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t("create.namePlaceholder")}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {t("create.nameHint")}
            </p>
          </div>

          {/* Group Type */}
          <div className="space-y-2">
            <Label htmlFor="group-type">
              {t("form.groupType")} <span className="text-destructive">*</span>
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
            <Label htmlFor="description">{tc("description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("form.descriptionPlaceholder")}
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
                {tc("add")}
              </Button>
            </div>

            {/* Current Members */}
            {members.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t("create.memberCountColon", { count: members.length })}
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

          {/* Include Groups (only for supported types) */}
          {supportsInclude() && availableGroups.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("create.includeOptional")}</Label>
                <span className="text-xs text-muted-foreground">
                  {t("form.selectedOf", { selected: String(includedGroups.length), total: String(availableGroups.length) })}
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
                    disabled={filteredGroups.length === 0 || filteredGroups.every(g => includedGroups.includes(g.name))}
                    className="text-xs h-9"
                  >
                    {t("form.all")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearAllGroups}
                    disabled={includedGroups.length === 0}
                    className="text-xs h-9"
                  >
                    {t("form.clear")}
                  </Button>
                </div>
              </div>

              {/* Checkbox List */}
              <div className="border rounded-md bg-muted/30">
                {filteredGroups.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    {groupSearchQuery ? t("form.noGroupsMatchSearch") : t("create.noGroupsAvailable")}
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {/* Selected Groups First */}
                    {selectedGroups.length > 0 && (
                      <>
                        <div className="sticky top-0 bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">
                          {t("form.selectedCount", { count: String(selectedGroups.length) })}
                        </div>
                        {selectedGroups.map((group) => (
                          <div key={group.name} className="flex items-center space-x-2 px-3 py-2 hover:bg-muted/50 border-b">
                            <input
                              type="checkbox"
                              id={`include-${group.name}`}
                              checked={true}
                              onChange={() => toggleIncludeGroup(group.name)}
                              className="cursor-pointer"
                            />
                            <label htmlFor={`include-${group.name}`} className="text-sm font-mono cursor-pointer flex-1">
                              {group.name}
                              {group.description && (
                                <span className="text-xs text-muted-foreground ml-2">({group.description})</span>
                              )}
                            </label>
                          </div>
                        ))}
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
                        {unselectedGroups.map((group) => (
                          <div key={group.name} className="flex items-center space-x-2 px-3 py-2 hover:bg-muted/50 border-b last:border-b-0">
                            <input
                              type="checkbox"
                              id={`include-${group.name}`}
                              checked={false}
                              onChange={() => toggleIncludeGroup(group.name)}
                              className="cursor-pointer"
                            />
                            <label htmlFor={`include-${group.name}`} className="text-sm font-mono cursor-pointer flex-1">
                              {group.name}
                              {group.description && (
                                <span className="text-xs text-muted-foreground ml-2">({group.description})</span>
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
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? tc("creating") : t("create.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
