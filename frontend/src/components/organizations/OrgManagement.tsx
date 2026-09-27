"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Plus, Trash2, Users, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
import {
  orgManagementService,
  Organization,
  OrgMember,
  OrgRole,
} from "@/lib/api/organizations";
import { userManagementService, UserListItem } from "@/lib/api/user-management";
import { cn } from "@/lib/utils";

const ORG_ROLES: OrgRole[] = ["OWNER", "ADMIN", "MEMBER"];

export function OrgManagement() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState<OrgRole>("MEMBER");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [o, u] = await Promise.all([
        orgManagementService.list(),
        userManagementService.listUsers(),
      ]);
      setOrgs(o);
      setUsers(u);
    } catch (e) {
      setError((e as Error).message || t("orgs.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMembers = useCallback(async (id: string) => {
    setMembersLoading(true);
    try {
      setMembers(await orgManagementService.listMembers(id));
    } catch (e) {
      setError((e as Error).message || t("orgs.loadMembersFailed"));
    } finally {
      setMembersLoading(false);
    }
  }, [t]);

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setAddUserId("");
    setAddRole("MEMBER");
    loadMembers(id);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setBusy(true);
    setError("");
    try {
      await orgManagementService.create(newName.trim(), newDesc.trim() || undefined);
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      await load();
    } catch (e) {
      setError((e as Error).message || t("orgs.createFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(org: Organization) {
    if (!confirm(t("orgs.deleteConfirm", { name: org.name }))) return;
    setError("");
    try {
      await orgManagementService.remove(org.id);
      if (expandedId === org.id) setExpandedId(null);
      await load();
    } catch (e) {
      setError((e as Error).message || t("orgs.deleteFailed"));
    }
  }

  async function handleAddMember(orgId: string) {
    if (!addUserId) return;
    setError("");
    try {
      await orgManagementService.addMember(orgId, addUserId, addRole);
      setAddUserId("");
      setAddRole("MEMBER");
      await Promise.all([loadMembers(orgId), load()]);
    } catch (e) {
      setError((e as Error).message || t("orgs.addMemberFailed"));
    }
  }

  async function handleRoleChange(orgId: string, userId: string, role: OrgRole) {
    setError("");
    try {
      await orgManagementService.setMemberRole(orgId, userId, role);
      await loadMembers(orgId);
    } catch (e) {
      setError((e as Error).message || t("orgs.changeRoleFailed"));
    }
  }

  async function handleRemoveMember(orgId: string, userId: string) {
    setError("");
    try {
      await orgManagementService.removeMember(orgId, userId);
      await Promise.all([loadMembers(orgId), load()]);
    } catch (e) {
      setError((e as Error).message || t("orgs.removeMemberFailed"));
    }
  }

  const memberIds = new Set(members.map((m) => m.userId));
  const addable = users.filter((u) => !memberIds.has(u.id));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t("orgs.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("orgs.subtitle")}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> {t("orgs.new")}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("orgs.loading")}</p>
      ) : (
        <div className="space-y-3">
          {orgs.map((org) => (
            <div key={org.id} className="rounded-lg border border-border bg-card">
              <div className="flex items-center gap-3 p-4">
                <button
                  className="flex flex-1 items-center gap-3 text-left"
                  onClick={() => toggleExpand(org.id)}
                >
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      expandedId === org.id && "rotate-90"
                    )}
                  />
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {org.name}
                      <span className="ml-2 text-xs text-muted-foreground">{org.id}</span>
                    </div>
                    {org.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {org.description}
                      </div>
                    )}
                  </div>
                </button>
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" />
                  {org.memberCount}
                </Badge>
                {org.id !== "default" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("orgs.delete")}
                    onClick={() => handleDelete(org)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              {expandedId === org.id && (
                <div className="border-t border-border p-4 space-y-3">
                  {membersLoading ? (
                    <p className="text-sm text-muted-foreground">{t("orgs.loadingMembers")}</p>
                  ) : (
                    <>
                      {members.length === 0 && (
                        <p className="text-sm text-muted-foreground">{t("orgs.noMembers")}</p>
                      )}
                      {members.map((m) => (
                        <div key={m.userId} className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-foreground truncate">{m.email}</div>
                            {m.name && (
                              <div className="text-xs text-muted-foreground truncate">
                                {m.name}
                              </div>
                            )}
                          </div>
                          <Select
                            value={m.orgRole}
                            onValueChange={(v) =>
                              handleRoleChange(org.id, m.userId, v as OrgRole)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ORG_ROLES.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {t(`orgRoles.${r}` as const)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("orgs.removeMember")}
                            onClick={() => handleRemoveMember(org.id, m.userId)}
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}

                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <Select value={addUserId} onValueChange={setAddUserId}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={t("orgs.addUserPlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            {addable.length === 0 ? (
                              <SelectItem value="__none" disabled>
                                {t("orgs.allMembers")}
                              </SelectItem>
                            ) : (
                              addable.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.email}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <Select value={addRole} onValueChange={(v) => setAddRole(v as OrgRole)}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ORG_ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {t(`orgRoles.${r}` as const)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button onClick={() => handleAddMember(org.id)} disabled={!addUserId}>
                          {tc("add")}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("orgs.new")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder={t("orgs.namePlaceholder")}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <Input
              placeholder={t("orgs.descriptionPlaceholder")}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={busy || !newName.trim()}>
              {t("orgs.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
