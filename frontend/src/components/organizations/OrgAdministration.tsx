"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
  UserPlus,
  UserMinus,
  Crown,
  Shield,
  Calendar,
} from "lucide-react";
import { Organization, OrgMember, orgService } from "@/lib/api/org";
import { useOrgStore } from "@/store/org-store";
import { isProjectAdmin } from "@/lib/roles";
import { ApiError } from "@/lib/types/api";
import { CreateOrgModal } from "./CreateOrgModal";
import { EditOrgModal } from "./EditOrgModal";
import { DeleteOrgModal } from "./DeleteOrgModal";
import { AddMemberModal } from "./AddMemberModal";

export function OrgAdministration() {
  const { orgs, userRole, loadOrgs } = useOrgStore();
  const canCreateOrg = isProjectAdmin(userRole);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Selected org for member view
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Modals
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [editOrgOpen, setEditOrgOpen] = useState(false);
  const [deleteOrgOpen, setDeleteOrgOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [orgToEdit, setOrgToEdit] = useState<Organization | null>(null);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);

  useEffect(() => {
    refreshOrgs();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      loadMembers(selectedOrg.id);
    } else {
      setMembers([]);
    }
  }, [selectedOrg]);

  // Auto-select first org
  useEffect(() => {
    if (orgs.length > 0 && !selectedOrg) {
      setSelectedOrg(orgs[0]);
    }
  }, [orgs, selectedOrg]);

  const refreshOrgs = async () => {
    setLoading(true);
    setError(null);
    try {
      await loadOrgs();
    } catch (err) {
      setError((err as ApiError).message || "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (orgId: string) => {
    setMembersLoading(true);
    try {
      const data = await orgService.listOrgMembers(orgId);
      setMembers(data);
    } catch (err) {
      console.error("Failed to load members:", err);
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedOrg) return;
    try {
      await orgService.removeOrgMember(selectedOrg.id, userId);
      loadMembers(selectedOrg.id);
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  const handleSuccess = () => {
    refreshOrgs();
    if (selectedOrg) {
      loadMembers(selectedOrg.id);
    }
  };

  const filteredOrgs = orgs.filter((org) => {
    const query = searchQuery.toLowerCase();
    return (
      org.name.toLowerCase().includes(query) ||
      org.slug.toLowerCase().includes(query) ||
      org.description?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Organizations</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage organizations and their members
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={refreshOrgs} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {canCreateOrg && (
              <Button onClick={() => setCreateOrgOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Organization
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={refreshOrgs} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Org Cards */}
            <div className="lg:col-span-1 space-y-3">
              {filteredOrgs.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-lg">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "No organizations found" : "No organizations yet"}
                  </p>
                </div>
              ) : (
                filteredOrgs.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => setSelectedOrg(org)}
                    className={`w-full text-left rounded-lg border p-4 transition-all ${
                      selectedOrg?.id === org.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/30 hover:bg-accent/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`mt-0.5 rounded-md p-2 ${
                          selectedOrg?.id === org.id ? "bg-primary/10" : "bg-muted"
                        }`}>
                          <Building2 className={`h-4 w-4 ${
                            selectedOrg?.id === org.id ? "text-primary" : "text-muted-foreground"
                          }`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate">{org.name}</span>
                            {org.is_demo && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Demo
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{org.slug}</p>
                          {org.description && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {org.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {canCreateOrg && !org.is_demo && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setOrgToEdit(org);
                              setEditOrgOpen(true);
                            }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {org.slug !== "default" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOrgToDelete(org);
                                    setDeleteOrgOpen(true);
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Members Panel */}
            <div className="lg:col-span-2">
              {selectedOrg ? (
                <div className="border border-border rounded-lg">
                  {/* Members Header */}
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-md p-2 bg-primary/10">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{selectedOrg.name} Members</h3>
                          <p className="text-xs text-muted-foreground">
                            {members.length} {members.length === 1 ? "member" : "members"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => loadMembers(selectedOrg.id)}
                          variant="ghost"
                          size="sm"
                          disabled={membersLoading}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${membersLoading ? "animate-spin" : ""}`} />
                        </Button>
                        <Button onClick={() => setAddMemberOpen(true)} size="sm">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Member
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Members List */}
                  <ScrollArea className="max-h-[500px]">
                    {membersLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : members.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No members yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className="p-4 flex items-center gap-4 hover:bg-accent/30 transition-colors"
                          >
                            {/* Avatar */}
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-sm font-semibold text-primary">
                                {member.user_name?.charAt(0).toUpperCase() || member.user_email.charAt(0).toUpperCase()}
                              </span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-foreground truncate">
                                  {member.user_name || "Unnamed User"}
                                </span>
                                {member.org_role === "OWNER" && (
                                  <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{member.user_email}</p>
                            </div>

                            {/* Badges */}
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge
                                variant="secondary"
                                className={`text-[10px] ${
                                  member.org_role === "OWNER"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : ""
                                }`}
                              >
                                {member.org_role}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  member.user_role === "PROJECT_ADMIN"
                                    ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800"
                                    : member.user_role === "ORG_ADMIN"
                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                                    : ""
                                }`}
                              >
                                <Shield className="h-2.5 w-2.5 mr-1" />
                                {member.user_role === "PROJECT_ADMIN" ? "Project Admin" :
                                 member.user_role === "ORG_ADMIN" ? "Org Admin" :
                                 member.user_role === "ADMIN" ? "Admin" : "Viewer"}
                              </Badge>
                            </div>

                            {/* Remove action */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => handleRemoveMember(member.user_id)}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Org Info Footer */}
                  <div className="p-3 border-t border-border bg-muted/30">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        Created {formatDate(selectedOrg.created_at)}
                      </div>
                      {selectedOrg.is_demo && selectedOrg.expires_at && (
                        <div className="flex items-center gap-1.5 text-amber-600">
                          Expires {formatDate(selectedOrg.expires_at)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-border rounded-lg flex items-center justify-center py-16">
                  <div className="text-center">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Select an organization to manage</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateOrgModal
        open={createOrgOpen}
        onOpenChange={setCreateOrgOpen}
        onSuccess={handleSuccess}
      />
      {orgToEdit && (
        <EditOrgModal
          open={editOrgOpen}
          onOpenChange={setEditOrgOpen}
          org={orgToEdit}
          onSuccess={handleSuccess}
        />
      )}
      {orgToDelete && (
        <DeleteOrgModal
          open={deleteOrgOpen}
          onOpenChange={setDeleteOrgOpen}
          org={orgToDelete}
          onSuccess={handleSuccess}
        />
      )}
      {selectedOrg && (
        <AddMemberModal
          open={addMemberOpen}
          onOpenChange={setAddMemberOpen}
          orgId={selectedOrg.id}
          orgName={selectedOrg.name}
          existingMemberIds={members.map((m) => m.user_id)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
