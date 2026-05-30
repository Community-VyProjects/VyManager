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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import {
  oauthConfigService,
  RoleMapping,
  InstanceRoleValue,
} from "@/lib/api/oauth";
import { FeaturePermissionTree } from "./FeaturePermissionTree";
import {
  TargetSelector,
  InstanceOption,
  SiteOption,
  TargetType,
} from "./TargetSelector";

export type { InstanceOption, SiteOption };

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBulk = !!bulkEdit && bulkEdit.length > 0;
  const isEditing = !!existing;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
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

  const roleAndFeatures = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Role</Label>
        <Select value={role} onValueChange={(v) => setRole(v as InstanceRoleValue)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Admin (full access)</SelectItem>
            <SelectItem value="OPERATOR">Operator (edit selected)</SelectItem>
            <SelectItem value="VIEWER">Viewer (view selected)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {usesPerms && (
        <div className="space-y-1.5">
          <Label>Feature permissions</Label>
          <FeaturePermissionTree value={perms} onChange={setPerms} />
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isBulk ? `Edit ${bulkEdit!.length} grants` : isEditing ? "Edit grant" : "Add grant"}
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

          {isBulk ? (
            roleAndFeatures
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <TargetSelector
                targetType={targetType}
                onTargetTypeChange={(t) => {
                  setTargetType(t);
                  setSelectedIds([]);
                }}
                selectedIds={selectedIds}
                onToggle={toggleTarget}
                sites={sites}
                instances={instances}
                lockedToId={isEditing ? selectedIds[0] : null}
              />
              {roleAndFeatures}
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
