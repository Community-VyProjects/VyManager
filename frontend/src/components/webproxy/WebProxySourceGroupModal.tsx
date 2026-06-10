"use client";

import { useState, useEffect } from "react";
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
      setError("Source group name is required");
      return;
    }
    if (!isEdit && existingNames.includes(name)) {
      setError(`Source group "${name}" already exists`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ ...form, name }, isEdit);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit Source Group ${sourceGroup?.name}` : "Add Source Group"}</DialogTitle>
          <DialogDescription>Group clients by address, domain or LDAP membership for use in filter rules.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5 pb-2">
            <div className="space-y-2">
              <Label htmlFor="sgrp-name">Name</Label>
              <Input id="sgrp-name" value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="lan-users" disabled={isEdit} className={isEdit ? "bg-muted font-mono" : "font-mono"} />
              {isEdit && <p className="text-xs text-muted-foreground">Name cannot be changed after creation.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sgrp-desc">Description</Label>
              <Input id="sgrp-desc" value={form.description ?? ""} onChange={(e) => update({ description: e.target.value })} placeholder="Optional description" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sgrp-user">User</Label>
              <Input id="sgrp-user" value={form.user ?? ""} onChange={(e) => update({ user: e.target.value })} placeholder="username" className="font-mono" />
            </div>
            <MultiValueInput label="Addresses" values={form.address} onChange={(v) => update({ address: v })} placeholder="IP, prefix or range" />
            <MultiValueInput label="Domains" values={form.domain} onChange={(v) => update({ domain: v })} placeholder="example.com" />
            <MultiValueInput label="LDAP IP Search" values={form.ldap_ip_search} onChange={(v) => update({ ldap_ip_search: v })} placeholder="LDAP search expression" />
            <MultiValueInput label="LDAP User Search" values={form.ldap_user_search} onChange={(v) => update({ ldap_user_search: v })} placeholder="LDAP search expression" />
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : isEdit ? "Save Changes" : "Add Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
