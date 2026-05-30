"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Server,
  Building2,
  UserCircle,
  Lock,
} from "lucide-react";
import {
  userManagementService,
  UserListItem,
  UserInstanceAssignment,
  SiteRole,
} from "@/lib/api/user-management";
import { sessionService } from "@/lib/api/session";
import {
  InstanceOption,
  SiteOption,
} from "@/components/authentication/GrantEditorDialog";
import { UserGrantDialog } from "./UserGrantDialog";

interface ManageUserAccessViewProps {
  user: UserListItem;
  onBack: () => void;
  /** Called after any change so the parent user list can refresh. */
  onChanged: () => void;
}

export function ManageUserAccessView({ user, onBack, onChanged }: ManageUserAccessViewProps) {
  const [siteRole, setSiteRole] = useState<SiteRole>(user.site_role);
  const [savingSiteRole, setSavingSiteRole] = useState(false);

  const [assignments, setAssignments] = useState<UserInstanceAssignment[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [instances, setInstances] = useState<InstanceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [grantEditor, setGrantEditor] = useState<
    { existing: UserInstanceAssignment | null; bulk?: UserInstanceAssignment[] } | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [asn, siteList] = await Promise.all([
        userManagementService.getUserAssignments(user.id),
        sessionService.listSites(),
      ]);
      setAssignments(asn);
      setSites(siteList.map((s) => ({ id: s.id, name: s.name })));

      const all: InstanceOption[] = [];
      for (const site of siteList) {
        try {
          for (const inst of await sessionService.listInstances(site.id)) {
            all.push({ id: inst.id, name: inst.name, siteId: site.id, siteName: site.name });
          }
        } catch {
          /* skip unreadable sites */
        }
      }
      setInstances(all);
      setSelectedIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load access");
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const changeSiteRole = async (value: string) => {
    const next = value as SiteRole;
    setSiteRole(next);
    setSavingSiteRole(true);
    setError(null);
    try {
      await userManagementService.updateUser(user.id, { site_role: next });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update site role");
      setSiteRole(user.site_role);
    } finally {
      setSavingSiteRole(false);
    }
  };

  // Stable order: whole-site grants first, then by name, id as tiebreaker.
  const rows = useMemo(
    () =>
      [...assignments].sort((a, b) => {
        const la = a.is_site_grant ? `0:${a.site_name}` : `1:${a.instance_name ?? ""}`;
        const lb = b.is_site_grant ? `0:${b.site_name}` : `1:${b.instance_name ?? ""}`;
        return la.localeCompare(lb) || a.id.localeCompare(b.id);
      }),
    [assignments]
  );

  // Grants created by SSO group mapping are read-only here; admins manage them
  // in Role Mapping. Only manual grants can be selected/edited/deleted.
  const isSso = (a: UserInstanceAssignment) => a.assigned_by === "sso";
  const manualRows = useMemo(() => rows.filter((r) => !isSso(r)), [rows]);

  const toggleSel = (id: string) =>
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const deleteGrant = async (id: string) => {
    setError(null);
    try {
      await userManagementService.removeAssignment(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete grant");
    }
  };

  const deleteSelected = async () => {
    setError(null);
    try {
      for (const id of selectedIds) await userManagementService.removeAssignment(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete grants");
    }
  };

  const isAdmin = siteRole === SiteRole.ADMIN;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={onBack} className="h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <UserCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{user.name || user.email}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Site role */}
      <div className="rounded-lg border border-border p-4 flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label>Site role</Label>
          <Select value={siteRole} onValueChange={changeSiteRole} disabled={!!user.sso_role_managed}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SiteRole.VIEWER}>Viewer</SelectItem>
              <SelectItem value={SiteRole.ADMIN}>Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {savingSiteRole && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mb-2" />}
        <p className="text-xs text-muted-foreground mb-2">
          {user.sso_role_managed ? (
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3 w-3" />
              Set by SSO group mapping — change it in Role Mapping.
            </span>
          ) : (
            "Admins have full access to every site and instance."
          )}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isAdmin ? (
        <p className="text-sm text-muted-foreground rounded-lg bg-muted/50 px-4 py-3">
          This user is a site admin and automatically has full access to all instances and
          features — no per-instance configuration needed.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Instance &amp; site access</h3>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setGrantEditor({ existing: null })}
            >
              <Plus className="h-3.5 w-3.5" />
              Add grant
            </Button>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
              <span className="font-medium">{selectedIds.length} selected</span>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setGrantEditor({
                      existing: null,
                      bulk: rows.filter((r) => selectedIds.includes(r.id)),
                    })
                  }
                >
                  Edit selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={deleteSelected}
                >
                  Delete selected
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                  Clear
                </Button>
              </div>
            </div>
          )}

          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">No access granted yet.</p>
          ) : (
            <div className="rounded-lg border border-border divide-y divide-border">
              {manualRows.length > 0 && (
                <label className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={selectedIds.length === manualRows.length && manualRows.length > 0}
                    onCheckedChange={(v) =>
                      setSelectedIds(v === true ? manualRows.map((r) => r.id) : [])
                    }
                  />
                  Select all
                </label>
              )}
              {rows.map((a) => {
                const sso = isSso(a);
                return (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between gap-3 px-3 py-2 ${sso ? "bg-muted/30" : ""}`}
                  >
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      {sso ? (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Checkbox
                          checked={selectedIds.includes(a.id)}
                          onCheckedChange={() => toggleSel(a.id)}
                        />
                      )}
                      {a.is_site_grant ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 font-medium">
                          <Building2 className="h-3.5 w-3.5" />
                          {a.site_name} (whole site)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 font-medium">
                          <Server className="h-3.5 w-3.5" />
                          {a.instance_name}
                        </span>
                      )}
                      <span className="text-muted-foreground">→</span>
                      <span className="text-xs font-medium">{a.role}</span>
                      {a.feature_permissions?.length ? (
                        <span className="text-xs text-muted-foreground">
                          · {a.feature_permissions.length} features
                        </span>
                      ) : null}
                      {sso && (
                        <span className="rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5 text-xs font-medium">
                          via SSO
                        </span>
                      )}
                    </div>
                    {sso ? (
                      <span className="text-xs text-muted-foreground shrink-0">
                        Managed in Role Mapping
                      </span>
                    ) : (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="px-2"
                          onClick={() => setGrantEditor({ existing: a })}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="px-2 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteGrant(a.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {grantEditor && (
        <UserGrantDialog
          open={!!grantEditor}
          onOpenChange={(o) => !o && setGrantEditor(null)}
          userId={user.id}
          existing={grantEditor.existing}
          bulkEdit={grantEditor.bulk}
          sites={sites}
          instances={instances}
          onSaved={load}
        />
      )}
    </div>
  );
}
