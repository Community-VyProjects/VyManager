"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { firewallGroupsService } from "@/lib/api/firewall-groups";
import type { FirewallGroup } from "@/lib/api/types/firewall-groups";

interface DeleteGroupModalProps {
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

export function DeleteGroupModal({ open, onOpenChange, group, onSuccess }: DeleteGroupModalProps) {
  const t = useTranslations("firewallGroups");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!group) return;

    setLoading(true);
    setError(null);

    try {
      await firewallGroupsService.deleteGroup(group.name, group.type);

      // Refresh config cache
      await firewallGroupsService.refreshConfig();

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("delete.deleteFailed"));
    } finally {
      setLoading(false);
    }
  };

  const getGroupTypeLabel = () => {
    if (!group) return "";

    const key = GROUP_TYPE_KEYS[group.type];
    return key ? t(`types.${key}`) : group.type;
  };

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t("delete.title")}
          </DialogTitle>
          <DialogDescription>
            {t("delete.description")}
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

          {/* Warning */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-3">
            <p className="text-sm text-foreground">
              {t("delete.confirm")}
            </p>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground font-semibold min-w-[80px]">{t("delete.nameLabel")}</span>
                <code className="font-mono text-foreground">{group.name}</code>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground font-semibold min-w-[80px]">{t("delete.typeLabel")}</span>
                <span className="text-foreground">{getGroupTypeLabel()}</span>
              </div>
              {group.description && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground font-semibold min-w-[80px]">{t("delete.descriptionLabel")}</span>
                  <span className="text-foreground">{group.description}</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground font-semibold min-w-[80px]">{t("delete.membersLabel")}</span>
                <span className="text-foreground">{group.members.length}</span>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p className="text-sm text-yellow-600 dark:text-yellow-500">
              {t.rich("delete.warning", { strong: (chunks) => <strong>{chunks}</strong> })}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? tc("deleting") : t("delete.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
