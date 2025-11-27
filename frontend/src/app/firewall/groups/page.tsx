"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, AlertCircle, Search, Shield, Pencil, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { firewallGroupsService } from "@/lib/api/firewall-groups";
import type { FirewallGroup, GroupsConfigResponse, FirewallGroupsCapabilities, GroupType } from "@/lib/api/types/firewall-groups";
import { CreateGroupModal } from "@/components/firewall/CreateGroupModal";
import { EditGroupModal } from "@/components/firewall/EditGroupModal";
import { DeleteGroupModal } from "@/components/firewall/DeleteGroupModal";

export default function FirewallGroupsPage() {
  const [groups, setGroups] = useState<GroupsConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<FirewallGroupsCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<GroupType | "all">("all");

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<FirewallGroup | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const [configData, capabilitiesData] = await Promise.all([
        firewallGroupsService.getConfig(),
        firewallGroupsService.getCapabilities(),
      ]);
      setGroups(configData);
      setCapabilities(capabilitiesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load firewall groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Modal handlers
  const handleEdit = (group: FirewallGroup) => {
    setSelectedGroup(group);
    setEditModalOpen(true);
  };

  const handleDelete = (group: FirewallGroup) => {
    setSelectedGroup(group);
    setDeleteModalOpen(true);
  };

  const handleModalSuccess = () => {
    loadData(); // Reload data after successful operation
  };

  // Combine all groups for filtering
  const allGroups: FirewallGroup[] = groups
    ? [
        ...groups.address_groups,
        ...groups.ipv6_address_groups,
        ...groups.network_groups,
        ...groups.ipv6_network_groups,
        ...groups.port_groups,
        ...groups.interface_groups,
        ...groups.mac_groups,
        ...groups.domain_groups,
        ...groups.remote_groups,
      ]
    : [];

  // Filter groups
  const filteredGroups = allGroups.filter((group) => {
    const matchesType = typeFilter === "all" || group.type === typeFilter;
    const matchesSearch =
      searchQuery === "" ||
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.members.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesType && matchesSearch;
  });

  const getGroupTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      "address-group": "blue",
      "ipv6-address-group": "cyan",
      "network-group": "green",
      "ipv6-network-group": "teal",
      "port-group": "purple",
      "interface-group": "orange",
      "mac-group": "pink",
      "domain-group": "indigo",
      "remote-group": "amber",
    };
    return colors[type] || "gray";
  };

  const getGroupTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "address-group": "IPv4 Address",
      "ipv6-address-group": "IPv6 Address",
      "network-group": "IPv4 Network",
      "ipv6-network-group": "IPv6 Network",
      "port-group": "Port",
      "interface-group": "Interface",
      "mac-group": "MAC Address",
      "domain-group": "Domain",
      "remote-group": "Remote",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Firewall Groups</h1>
            <p className="text-muted-foreground mt-1">
              Manage firewall groups for use in firewall rules
            </p>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{groups?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Groups</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Shield className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {(groups?.by_type["address-group"] || 0) + (groups?.by_type["ipv6-address-group"] || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Address Groups</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <Shield className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {(groups?.by_type["network-group"] || 0) + (groups?.by_type["ipv6-network-group"] || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Network Groups</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                  <Shield className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{groups?.by_type["port-group"] || 0}</p>
                  <p className="text-xs text-muted-foreground">Port Groups</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive">Failed to load firewall groups</h3>
              <p className="text-sm text-destructive/90 mt-1">{error}</p>
              <Button variant="outline" size="sm" onClick={loadData} className="mt-3">
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Filters and Actions */}
        {!error && (
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, description, or members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto">
              <Button
                variant={typeFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("all")}
              >
                All ({allGroups.length})
              </Button>
              {capabilities && Object.entries(capabilities.group_types).map(([key, info]) => {
                if (!info.supported) return null;
                const type = key.replace(/_/g, "-") as GroupType;
                const count = groups?.by_type[type] || 0;
                return (
                  <Button
                    key={type}
                    variant={typeFilter === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilter(type)}
                  >
                    {getGroupTypeLabel(type)} ({count})
                  </Button>
                );
              })}
            </div>

            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </div>
        )}

        {/* Group Cards */}
        {!error && (
          <div className="space-y-4">
            {filteredGroups.length === 0 ? (
              <Card className="border-border">
                <CardContent className="py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Shield className="h-12 w-12 text-muted-foreground/30" />
                    <p className="text-muted-foreground">
                      {searchQuery || typeFilter !== "all"
                        ? "No groups found matching your filters"
                        : "No firewall groups configured"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredGroups.map((group) => {
                    const color = getGroupTypeColor(group.type);
                    return (
                      <Card key={`${group.type}-${group.name}`} className="border-border hover:border-primary/50 transition-colors group">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-${color}-500/10 flex-shrink-0`}>
                                <Shield className={`h-4 w-4 text-${color}-500`} />
                              </div>
                              <div className="min-w-0">
                                <code className="font-semibold font-mono text-foreground text-base block truncate">
                                  {group.name}
                                </code>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {group.members.length} member(s)
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(group)}
                                className="h-7 w-7 p-0"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(group)}
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            {group.description && (
                              <div className="text-muted-foreground truncate">
                                {group.description}
                              </div>
                            )}

                            <div className="pt-1">
                              <Badge
                                variant="outline"
                                className={`bg-${color}-500/10 text-${color}-500 border-${color}-500/20 text-xs`}
                              >
                                {getGroupTypeLabel(group.type)}
                              </Badge>
                            </div>

                            {group.members.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {group.members.slice(0, 3).map((member, idx) => (
                                  <code
                                    key={idx}
                                    className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground"
                                  >
                                    {member}
                                  </code>
                                ))}
                                {group.members.length > 3 && (
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                    +{group.members.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Showing {filteredGroups.length} of {allGroups.length} group{allGroups.length !== 1 ? "s" : ""}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateGroupModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={handleModalSuccess}
        capabilities={capabilities}
      />
      <EditGroupModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        group={selectedGroup}
        onSuccess={handleModalSuccess}
      />
      <DeleteGroupModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        group={selectedGroup}
        onSuccess={handleModalSuccess}
      />
    </AppLayout>
  );
}
