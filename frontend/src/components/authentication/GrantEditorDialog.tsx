"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loader2, AlertCircle, ChevronRight, Server, Building2 } from "lucide-react";
import {
  oauthConfigService,
  RoleMapping,
  InstanceRoleValue,
} from "@/lib/api/oauth";
import {
  getFlatFeatureCategories,
  getFeatureAndDescendants,
  FEATURE_DISPLAY_NAMES,
} from "@/lib/feature-permissions";
import { FeatureGroup } from "@/lib/api/user-management";

const FEATURE_CATEGORIES_FLAT = getFlatFeatureCategories();

export interface InstanceOption {
  id: string;
  name: string;
  siteId: string;
  siteName: string;
}
export interface SiteOption {
  id: string;
  name: string;
}

type TargetType = "instance" | "site";
type Perms = Record<string, { canEdit: boolean; canView: boolean }>;

interface GrantEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  claimValue: string;
  /** When set, edit this single grant; otherwise add (multi-target). */
  existing: RoleMapping | null;
  /** When set, apply one role/feature set to all of these existing grants. */
  bulkEdit?: RoleMapping[] | null;
  sites: SiteOption[];
  instances: InstanceOption[];
  onSaved: () => void;
}

export function GrantEditorDialog({
  open,
  onOpenChange,
  providerId,
  claimValue,
  existing,
  bulkEdit,
  sites,
  instances,
  onSaved,
}: GrantEditorDialogProps) {
  const [targetType, setTargetType] = useState<TargetType>("instance");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [role, setRole] = useState<InstanceRoleValue>("VIEWER");
  const [perms, setPerms] = useState<Perms>({});
  const [openCats, setOpenCats] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBulk = !!bulkEdit && bulkEdit.length > 0;
  const isEditing = !!existing;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    setOpenCats([]);
    const seed = bulkEdit?.[0] ?? existing;
    if (seed) {
      const tt: TargetType = seed.siteId ? "site" : "instance";
      setTargetType(tt);
      setSelectedIds(isBulk ? [] : [seed.siteId ?? seed.instanceId ?? ""]);
      setRole((seed.instanceRole as InstanceRoleValue) ?? "VIEWER");
      const p: Perms = {};
      for (const fp of seed.featurePermissions ?? [])
        p[fp.feature] = { canEdit: fp.canEdit, canView: fp.canView };
      setPerms(p);
    } else {
      setTargetType("instance");
      setSelectedIds([]);
      setRole("VIEWER");
      setPerms({});
    }
  }, [open, existing, bulkEdit, isBulk]);

  const usesPerms = role === "OPERATOR" || role === "VIEWER";

  const toggleTarget = (id: string) =>
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );

  const togglePerm = (feature: string, key: "canEdit" | "canView") => {
    setPerms((prev) => {
      const newVal = !(prev[feature]?.[key] ?? false);
      const next = { ...prev };
      for (const f of getFeatureAndDescendants(feature as FeatureGroup)) {
        const cur = next[f] ?? { canEdit: false, canView: false };
        const updated = { ...cur, [key]: newVal };
        if (key === "canEdit" && newVal) updated.canView = true;
        if (key === "canView" && !newVal) updated.canEdit = false;
        next[f] = updated;
      }
      return next;
    });
  };

  const toggleBinary = (feature: string) =>
    setPerms((prev) => {
      const allowed = prev[feature]?.canView ?? false;
      return {
        ...prev,
        [feature]: allowed
          ? { canEdit: false, canView: false }
          : { canEdit: true, canView: true },
      };
    });

  const save = async () => {
    if (!isBulk && selectedIds.length === 0) {
      setError(`Select at least one ${targetType}`);
      return;
    }
    const featurePermissions = usesPerms
      ? Object.entries(perms)
          .filter(([, p]) => p.canEdit || p.canView)
          .map(([feature, p]) => ({ feature, canEdit: p.canEdit, canView: p.canView }))
      : null;

    setSaving(true);
    setError(null);
    try {
      if (isBulk && bulkEdit) {
        // Apply the same role/features to each selected grant; keep its target.
        for (const g of bulkEdit) {
          await oauthConfigService.updateMapping(providerId, g.id, {
            claimValue,
            instanceRole: role,
            featurePermissions,
          });
        }
      } else if (isEditing && existing) {
        const id = selectedIds[0];
        await oauthConfigService.updateMapping(providerId, existing.id, {
          claimValue,
          instanceId: targetType === "instance" ? id : null,
          siteId: targetType === "site" ? id : null,
          instanceRole: role,
          featurePermissions,
        });
      } else {
        // One row per selected target.
        for (const id of selectedIds) {
          await oauthConfigService.createMapping(providerId, {
            claimValue,
            instanceId: targetType === "instance" ? id : null,
            siteId: targetType === "site" ? id : null,
            instanceRole: role,
            featurePermissions,
          });
        }
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save grant");
    } finally {
      setSaving(false);
    }
  };

  const targets =
    targetType === "site"
      ? sites.map((s) => ({ id: s.id, label: s.name }))
      : instances.map((i) => ({ id: i.id, label: `${i.siteName} / ${i.name}` }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isBulk
              ? `Edit ${bulkEdit!.length} grants`
              : isEditing
                ? "Edit grant"
                : "Add grant"}
          </DialogTitle>
          <DialogDescription>
            {isBulk ? (
              <>
                Apply one role and feature set to the selected grants for{" "}
                <strong>{claimValue}</strong>.
              </>
            ) : (
              <>
                Grant <strong>{claimValue}</strong> access to instances or whole sites.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {!isBulk && (
            <>
              {/* Target type */}
              <div className="space-y-1.5">
                <Label>Target</Label>
                <div className="flex gap-2">
                  {(["instance", "site"] as TargetType[]).map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant={targetType === t ? "default" : "outline"}
                      size="sm"
                      className="gap-1.5"
                      disabled={isEditing}
                      onClick={() => {
                        setTargetType(t);
                        setSelectedIds([]);
                      }}
                    >
                      {t === "instance" ? (
                        <Server className="h-3.5 w-3.5" />
                      ) : (
                        <Building2 className="h-3.5 w-3.5" />
                      )}
                      {t === "instance" ? "Instances" : "Whole sites"}
                    </Button>
                  ))}
                </div>
                {targetType === "site" && (
                  <p className="text-xs text-muted-foreground">
                    Applies to every instance in the site, including ones added later.
                  </p>
                )}
              </div>

              {/* Target selection */}
              <div className="space-y-1.5">
                <Label>{targetType === "site" ? "Sites" : "Instances"}</Label>
                <div className="rounded-lg border border-border max-h-40 overflow-y-auto divide-y divide-border">
                  {targets.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">None available</p>
                  ) : (
                    targets.map((t) => (
                      <label
                        key={t.id}
                        className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedIds.includes(t.id)}
                          onCheckedChange={() => toggleTarget(t.id)}
                          disabled={isEditing && selectedIds[0] !== t.id}
                        />
                        {t.label}
                      </label>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {/* Role */}
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as InstanceRoleValue)}>
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin (full access)</SelectItem>
                <SelectItem value="OPERATOR">Operator (edit selected)</SelectItem>
                <SelectItem value="VIEWER">Viewer (view selected)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Feature permissions */}
          {usesPerms && (
            <div className="space-y-2">
              <Label>Feature permissions</Label>
              <div className="rounded-lg border border-border divide-y divide-border">
                {FEATURE_CATEGORIES_FLAT.map((cat) => {
                  const isOpen = openCats.includes(cat.name);
                  return (
                    <Collapsible
                      key={cat.name}
                      open={isOpen}
                      onOpenChange={(o) =>
                        setOpenCats((c) =>
                          o ? [...c, cat.name] : c.filter((n) => n !== cat.name)
                        )
                      }
                    >
                      <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium hover:bg-muted/50">
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
                        />
                        {cat.name}
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {cat.items.map((item) => {
                          const key = item.feature as string;
                          const p = perms[key] ?? { canEdit: false, canView: false };
                          return (
                            <div
                              key={key}
                              className="flex items-center justify-between py-1.5 text-sm border-t border-border/50"
                              style={{ paddingLeft: `${28 + item.depth * 16}px`, paddingRight: "12px" }}
                            >
                              <span className="text-foreground">
                                {FEATURE_DISPLAY_NAMES[item.feature] ?? key}
                              </span>
                              {item.binary ? (
                                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground">
                                  <Checkbox
                                    checked={p.canView}
                                    onCheckedChange={() => toggleBinary(key)}
                                  />
                                  Allow
                                </label>
                              ) : (
                                <div className="flex items-center gap-4">
                                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground">
                                    <Checkbox
                                      checked={p.canView}
                                      onCheckedChange={() => togglePerm(key, "canView")}
                                    />
                                    View
                                  </label>
                                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground">
                                    <Checkbox
                                      checked={p.canEdit}
                                      onCheckedChange={() => togglePerm(key, "canEdit")}
                                    />
                                    Edit
                                  </label>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : isEditing ? (
                "Save grant"
              ) : (
                "Add grant"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
