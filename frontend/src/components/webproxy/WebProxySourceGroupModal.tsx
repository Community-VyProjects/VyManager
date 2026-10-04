"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import { MultiValueInput } from "./MultiValueInput";
import type { SquidGuardSourceGroup } from "@/lib/api/webproxy";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceGroup: SquidGuardSourceGroup | null;
  existingNames: string[];
  onSubmit: (group: SquidGuardSourceGroup, isEdit: boolean) => Promise<void>;
}

const empty = (): SquidGuardSourceGroup => ({
  name: "",
  address: [],
  domain: [],
  ldap_ip_search: [],
  ldap_user_search: [],
});

export function WebProxySourceGroupModal({ open, onOpenChange, sourceGroup, existingNames, onSubmit }: Props) {
  const t = useTranslations("webproxy");
  const tc = useTranslations("common");
  const isEdit = !!sourceGroup;
  const [form, setForm] = useState<SquidGuardSourceGroup>(empty());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(sourceGroup ? { ...sourceGroup } : empty());
      setError(null);
    }
  }, [open, sourceGroup]);

  const update = (patch: Partial<SquidGuardSourceGroup>) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async () => {
    const name = form.name.trim();
    if (!name) {
      setError(t("group.nameRequired"));
      return;
    }
    if (!isEdit && existingNames.includes(name)) {
      setError(t("group.exists", { name }));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ ...form, name }, isEdit);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("group.editTitle", { name: sourceGroup?.name ?? "" }) : t("group.addTitle")}</DialogTitle>
          <DialogDescription>{t("group.description")}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5 pb-2">
            <div className="space-y-2">
              <Label htmlFor="sgrp-name">{tc("name")}</Label>
              <Input id="sgrp-name" value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="lan-users" disabled={isEdit} className={isEdit ? "bg-muted font-mono" : "font-mono"} />
              {isEdit && <p className="text-xs text-muted-foreground">{t("common.nameImmutable")}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sgrp-desc">{tc("description")}</Label>
              <Input id="sgrp-desc" value={form.description ?? ""} onChange={(e) => update({ description: e.target.value })} placeholder={t("common.optionalDescription")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sgrp-user">{t("group.user")}</Label>
              <Input id="sgrp-user" value={form.user ?? ""} onChange={(e) => update({ user: e.target.value })} placeholder={t("group.usernamePlaceholder")} className="font-mono" />
            </div>
            <MultiValueInput label={t("content.addresses")} values={form.address} onChange={(v) => update({ address: v })} placeholder={t("group.addressesPlaceholder")} />
            <MultiValueInput label={t("content.domains")} values={form.domain} onChange={(v) => update({ domain: v })} placeholder="example.com" />
            <MultiValueInput label={t("group.ldapIpSearch")} values={form.ldap_ip_search} onChange={(v) => update({ ldap_ip_search: v })} placeholder={t("group.ldapSearchPlaceholder")} />
            <MultiValueInput label={t("group.ldapUserSearch")} values={form.ldap_user_search} onChange={(v) => update({ ldap_user_search: v })} placeholder={t("group.ldapSearchPlaceholder")} />
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tc("saving")}</> : isEdit ? t("common.saveChanges") : t("content.addGroup")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
