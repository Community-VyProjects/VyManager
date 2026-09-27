"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
  userManagementService,
  UserInstanceAssignment,
  InstanceRole,
  FeaturePermission,
} from "@/lib/api/user-management";
import {
  FeaturePermissionTree,
  FeaturePermsMap,
} from "@/components/authentication/FeaturePermissionTree";
import {
  TargetSelector,
  InstanceOption,
  SiteOption,
  TargetType,
} from "@/components/authentication/TargetSelector";

interface UserGrantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  /** Edit this single grant; otherwise add (multi-target). */
  existing: UserInstanceAssignment | null;
  /** Apply one role/feature set to all of these existing grants. */
  bulkEdit?: UserInstanceAssignment[] | null;
  sites: SiteOption[];
  instances: InstanceOption[];
  onSaved: () => void;
}

function permsToList(perms: FeaturePermsMap): FeaturePermission[] {
  return Object.entries(perms)
    .filter(([, p]) => p.canEdit || p.canView)
    .map(([feature, p]) => ({ feature: feature as FeaturePermission["feature"], can_edit: p.canEdit, can_view: p.canView }));
}

export function UserGrantDialog({
  open,
  onOpenChange,
  userId,
  existing,
  bulkEdit,
  sites,
  instances,
  onSaved,
}: UserGrantDialogProps) {
  const t = useTranslations("userManagement");
  const tc = useTranslations("common");
  const [targetType, setTargetType] = useState<TargetType>("instance");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [role, setRole] = useState<InstanceRole>(InstanceRole.VIEWER);
  const [perms, setPerms] = useState<FeaturePermsMap>({});
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
      setTargetType(seed.is_site_grant ? "site" : "instance");
      setSelectedIds(isBulk ? [] : [seed.is_site_grant ? seed.site_id : seed.instance_id ?? ""]);
      setRole((seed.role as InstanceRole) ?? InstanceRole.VIEWER);
      const p: FeaturePermsMap = {};
      for (const fp of seed.feature_permissions ?? [])
        p[fp.feature] = { canEdit: fp.can_edit, canView: fp.can_view };
      setPerms(p);
    } else {
      setTargetType("instance");
      setSelectedIds([]);
      setRole(InstanceRole.VIEWER);
      setPerms({});
    }
  }, [open, existing, bulkEdit, isBulk]);

  const usesPerms = role === InstanceRole.OPERATOR || role === InstanceRole.VIEWER;

  const toggleTarget = (id: string) =>
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const save = async () => {
    if (!isBulk && selectedIds.length === 0) {
      setError(targetType === "site" ? t("grant.selectSite") : t("grant.selectInstance"));
      return;
    }
    const feature_permissions = usesPerms ? permsToList(perms) : undefined;

    setSaving(true);
    setError(null);
    try {
      // No update endpoint: editing = remove the old row(s), then re-create.
      const reassign = async (a: UserInstanceAssignment) => {
        await userManagementService.removeAssignment(a.id);
        await userManagementService.assignUser({
          user_id: userId,
          instance_ids: a.is_site_grant ? [] : [a.instance_id!],
          site_ids: a.is_site_grant ? [a.site_id] : [],
          role,
          feature_permissions,
        });
      };

      if (isBulk && bulkEdit) {
        for (const a of bulkEdit) await reassign(a);
      } else if (isEditing && existing) {
        await reassign(existing);
      } else {
        await userManagementService.assignUser({
          user_id: userId,
          instance_ids: targetType === "instance" ? selectedIds : [],
          site_ids: targetType === "site" ? selectedIds : [],
          role,
          feature_permissions,
        });
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("grant.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const roleAndFeatures = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t("grant.role")}</Label>
        <Select value={role} onValueChange={(v) => setRole(v as InstanceRole)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={InstanceRole.ADMIN}>{t("grant.roleAdmin")}</SelectItem>
            <SelectItem value={InstanceRole.OPERATOR}>{t("grant.roleOperator")}</SelectItem>
            <SelectItem value={InstanceRole.VIEWER}>{t("grant.roleViewer")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {usesPerms && (
        <div className="space-y-1.5">
          <Label>{t("grant.featurePermissions")}</Label>
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
            {isBulk ? t("grant.editBulkTitle", { count: bulkEdit!.length }) : isEditing ? t("grant.editTitle") : t("grant.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {isBulk
              ? t("grant.bulkDescription")
              : t("grant.description")}
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
              {tc("cancel")}
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("grant.saving")}
                </>
              ) : isBulk || isEditing ? (
                t("grant.save")
              ) : (
                t("grant.addTitle")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
