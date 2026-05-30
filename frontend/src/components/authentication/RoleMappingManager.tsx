"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Users,
  Server,
  Building2,
  ShieldAlert,
} from "lucide-react";
import {
  oauthConfigService,
  OAuthProviderConfig,
  RoleMapping,
  SiteRoleValue,
} from "@/lib/api/oauth";
import { sessionService } from "@/lib/api/session";
import {
  GrantEditorDialog,
  InstanceOption,
  SiteOption,
} from "./GrantEditorDialog";

const SITE_ROLE_NONE = "__none__";

interface RoleMappingManagerProps {
  provider: OAuthProviderConfig;
  onBack: () => void;
  /** Called after provider settings change so the parent can refresh. */
  onProviderChanged: () => void;
}

export function RoleMappingManager({
  provider,
  onBack,
  onProviderChanged,
}: RoleMappingManagerProps) {
  const [enabled, setEnabled] = useState(provider.roleMappingEnabled ?? false);
  const [groupsClaim, setGroupsClaim] = useState(provider.groupsClaim ?? "groups");
  const [savingSettings, setSavingSettings] = useState(false);

  const [mappings, setMappings] = useState<RoleMapping[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [instances, setInstances] = useState<InstanceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const [grantEditor, setGrantEditor] = useState<
    { existing: RoleMapping | null; bulk?: RoleMapping[] } | null
  >(null);
  const [selectedGrantIds, setSelectedGrantIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mappingList, siteList] = await Promise.all([
        oauthConfigService.listMappings(provider.providerId),
        sessionService.listSites(),
      ]);
      setMappings(mappingList);
      setSites(siteList.map((s) => ({ id: s.id, name: s.name })));

      const allInstances: InstanceOption[] = [];
      for (const site of siteList) {
        try {
          for (const inst of await sessionService.listInstances(site.id)) {
            allInstances.push({ id: inst.id, name: inst.name, siteId: site.id, siteName: site.name });
          }
        } catch {
          /* skip unreadable sites */
        }
      }
      setInstances(allInstances);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load role mappings");
    } finally {
      setLoading(false);
    }
  }, [provider.providerId]);

  useEffect(() => {
    load();
  }, [load]);

  // Clear grant selection when switching groups.
  useEffect(() => {
    setSelectedGrantIds([]);
  }, [selectedGroup]);

  const siteName = useCallback(
    (id: string) => sites.find((s) => s.id === id)?.name ?? id,
    [sites]
  );
  const instanceName = useCallback(
    (id: string) => instances.find((i) => i.id === id)?.name ?? id,
    [instances]
  );

  // Distinct group names (claim values), plus the in-progress selection.
  const groups = useMemo(() => {
    const set = new Set(mappings.map((m) => m.claimValue));
    if (selectedGroup) set.add(selectedGroup);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [mappings, selectedGroup]);

  const groupRows = useMemo(
    () => (selectedGroup ? mappings.filter((m) => m.claimValue === selectedGroup) : []),
    [mappings, selectedGroup]
  );
  const siteRoleRow = groupRows.find((m) => m.siteRole && !m.instanceId && !m.siteId) ?? null;
  const currentSiteRole: SiteRoleValue | "" = siteRoleRow?.siteRole ?? "";

  // Stable, meaningful order: whole-site grants first, then instances, each by
  // display name (id as final tiebreaker so rows never jump after an edit).
  const grantRows = useMemo(() => {
    const label = (m: RoleMapping) =>
      m.siteId ? `0:${siteName(m.siteId)}` : `1:${instanceName(m.instanceId!)}`;
    return groupRows
      .filter((m) => m.instanceId || m.siteId)
      .sort((a, b) => label(a).localeCompare(label(b)) || a.id.localeCompare(b.id));
  }, [groupRows, siteName, instanceName]);

  const adminGroupExists = mappings.some(
    (m) => m.siteRole === "ADMIN" && !m.instanceId && !m.siteId && m.claimValue !== selectedGroup
  );

  const saveSettings = async () => {
    setSavingSettings(true);
    setError(null);
    try {
      await oauthConfigService.updateProvider(provider.providerId, {
        roleMappingEnabled: enabled,
        groupsClaim: groupsClaim.trim() || "groups",
      });
      onProviderChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const changeSiteRole = async (value: string) => {
    if (!selectedGroup) return;
    setError(null);
    try {
      if (value === SITE_ROLE_NONE) {
        if (siteRoleRow) await oauthConfigService.deleteMapping(provider.providerId, siteRoleRow.id);
      } else if (siteRoleRow) {
        await oauthConfigService.updateMapping(provider.providerId, siteRoleRow.id, {
          claimValue: selectedGroup,
          siteRole: value as SiteRoleValue,
        });
      } else {
        await oauthConfigService.createMapping(provider.providerId, {
          claimValue: selectedGroup,
          siteRole: value as SiteRoleValue,
        });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update site role");
    }
  };

  const deleteGrant = async (id: string) => {
    setError(null);
    try {
      await oauthConfigService.deleteMapping(provider.providerId, id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete grant");
    }
  };

  const deleteSelectedGrants = async () => {
    setError(null);
    try {
      for (const id of selectedGrantIds) {
        await oauthConfigService.deleteMapping(provider.providerId, id);
      }
      setSelectedGrantIds([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete grants");
    }
  };

  const toggleGrantSel = (id: string) =>
    setSelectedGrantIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );

  const deleteGroup = async (group: string) => {
    setError(null);
    try {
      for (const m of mappings.filter((x) => x.claimValue === group)) {
        await oauthConfigService.deleteMapping(provider.providerId, m.id);
      }
      if (selectedGroup === group) setSelectedGroup(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete group");
    }
  };

  const confirmAddGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    setSelectedGroup(name);
    setNewGroupName("");
    setAddingGroup(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={onBack} className="h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Role Mapping — {provider.displayName}
          </h2>
          <p className="text-sm text-muted-foreground">
            Map IdP group claims to site and instance roles. Evaluated on every login.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Provider settings */}
      <div className="rounded-lg border border-border p-4 flex flex-wrap items-end gap-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox checked={enabled} onCheckedChange={(v) => setEnabled(v === true)} className="mt-0.5" />
          <span>
            <span className="text-sm font-medium text-foreground">Enable role mapping</span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Users whose claims match no rule are denied login.
            </span>
          </span>
        </label>
        <div className="space-y-1.5">
          <Label htmlFor="groupsClaim">Claim name</Label>
          <Input
            id="groupsClaim"
            value={groupsClaim}
            onChange={(e) => setGroupsClaim(e.target.value)}
            placeholder="groups"
            className="w-40"
          />
        </div>
        <Button size="sm" onClick={saveSettings} disabled={savingSettings} className="ml-auto">
          {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save settings"}
        </Button>
      </div>

      {enabled && groups.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          Mapping is enabled but no groups are defined — all SSO users will be denied login.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-5">
          {/* Left: groups */}
          <div className="rounded-lg border border-border">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-sm font-semibold">Groups</span>
              <Button size="sm" variant="ghost" className="px-2" onClick={() => setAddingGroup((v) => !v)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {addingGroup && (
              <div className="flex gap-1.5 p-2 border-b border-border">
                <Input
                  autoFocus
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmAddGroup()}
                  placeholder="Group/claim value"
                  className="h-8 text-sm"
                />
                <Button size="sm" className="h-8" onClick={confirmAddGroup}>
                  Add
                </Button>
              </div>
            )}
            <div className="max-h-[28rem] overflow-y-auto">
              {groups.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">No groups yet.</p>
              ) : (
                groups.map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGroup(g)}
                    className={`flex items-center gap-2 w-full text-left px-3 py-2 text-sm border-b border-border/50 hover:bg-muted/50 ${
                      selectedGroup === g ? "bg-muted font-medium" : ""
                    }`}
                  >
                    <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{g}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right: group detail */}
          <div className="rounded-lg border border-border p-4 min-h-[20rem]">
            {!selectedGroup ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16 text-muted-foreground">
                <Users className="h-10 w-10 mb-3" />
                <p className="text-sm">Select a group, or add one, to configure its access.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {selectedGroup}
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive gap-1.5"
                    onClick={() => deleteGroup(selectedGroup)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete group
                  </Button>
                </div>

                {/* Site role */}
                <div className="space-y-1.5 max-w-xs">
                  <Label>Site role</Label>
                  <Select value={currentSiteRole || SITE_ROLE_NONE} onValueChange={changeSiteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SITE_ROLE_NONE}>None</SelectItem>
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                      <SelectItem value="ADMIN" disabled={adminGroupExists}>
                        Admin
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {adminGroupExists && currentSiteRole !== "ADMIN" && (
                    <p className="text-xs text-muted-foreground">A site-admin group already exists.</p>
                  )}
                </div>

                {/* Grants */}
                {currentSiteRole === "ADMIN" ? (
                  <p className="text-sm text-muted-foreground rounded-lg bg-muted/50 px-3 py-2">
                    Site admins automatically have full access to all instances and features.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Instance &amp; site grants</Label>
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
                    {selectedGrantIds.length > 0 && (
                      <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                        <span className="font-medium">{selectedGrantIds.length} selected</span>
                        <div className="ml-auto flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setGrantEditor({
                                existing: null,
                                bulk: grantRows.filter((g) => selectedGrantIds.includes(g.id)),
                              })
                            }
                          >
                            Edit selected
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={deleteSelectedGrants}
                          >
                            Delete selected
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setSelectedGrantIds([])}>
                            Clear
                          </Button>
                        </div>
                      </div>
                    )}
                    {grantRows.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-1">No grants yet.</p>
                    ) : (
                      <div className="rounded-lg border border-border divide-y divide-border">
                        <label className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground cursor-pointer">
                          <Checkbox
                            checked={
                              selectedGrantIds.length === grantRows.length && grantRows.length > 0
                            }
                            onCheckedChange={(v) =>
                              setSelectedGrantIds(v === true ? grantRows.map((g) => g.id) : [])
                            }
                          />
                          Select all
                        </label>
                        {grantRows.map((m) => (
                          <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2">
                            <div className="flex items-center gap-2 text-sm flex-wrap">
                              <Checkbox
                                checked={selectedGrantIds.includes(m.id)}
                                onCheckedChange={() => toggleGrantSel(m.id)}
                              />
                              {m.siteId ? (
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 font-medium">
                                  <Building2 className="h-3.5 w-3.5" />
                                  {siteName(m.siteId)} (whole site)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 font-medium">
                                  <Server className="h-3.5 w-3.5" />
                                  {instanceName(m.instanceId!)}
                                </span>
                              )}
                              <span className="text-muted-foreground">→</span>
                              <span className="text-xs font-medium">{m.instanceRole}</span>
                              {m.featurePermissions?.length ? (
                                <span className="text-xs text-muted-foreground">
                                  · {m.featurePermissions.length} features
                                </span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="px-2"
                                onClick={() => setGrantEditor({ existing: m })}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="px-2 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteGrant(m.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {grantEditor && selectedGroup && (
        <GrantEditorDialog
          open={!!grantEditor}
          onOpenChange={(o) => !o && setGrantEditor(null)}
          providerId={provider.providerId}
          claimValue={selectedGroup}
          existing={grantEditor.existing}
          bulkEdit={grantEditor.bulk}
          sites={sites}
          instances={instances}
          onSaved={() => {
            setSelectedGrantIds([]);
            load();
          }}
        />
      )}
    </div>
  );
}
