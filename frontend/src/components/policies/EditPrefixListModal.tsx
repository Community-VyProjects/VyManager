"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ListFilter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { prefixListService, type PrefixList, type PrefixListCapabilitiesResponse } from "@/lib/api/prefix-list";
import {
  descriptionMaxLength,
  listFormFrom,
  prefixListProblem,
  type PrefixListForm,
} from "@/lib/api/prefix-list-save-ops";
import type { ApiError } from "@/lib/types/api";
import { familyLabel } from "./prefix-list-rule-form";

interface EditPrefixListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  prefixList: PrefixList;
  capabilities: PrefixListCapabilitiesResponse | null;
}

export function EditPrefixListModal({ open, onOpenChange, onSuccess, prefixList, capabilities }: EditPrefixListModalProps) {
  const t = useTranslations("prefixList");
  const tl = useTranslations("prefixList.listErrors");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PrefixListForm>(() => listFormFrom(prefixList));

  const handleSubmit = async () => {
    const problem = prefixListProblem(form, null, capabilities);
    if (problem) {
      setError(tl(problem.key, { max: problem.max ?? "" }));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await prefixListService.updatePrefixList(prefixList, form);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("edit.failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
          <DialogDescription>{t("edit.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-sm font-medium">{prefixList.name}</span>
              <Badge variant="outline">{familyLabel(prefixList.list_type)}</Badge>
              <Badge variant="secondary">{t("ruleCount", { count: prefixList.rules.length })}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prefix-list-edit-description">{tc("description")}</Label>
            <Input
              id="prefix-list-edit-description"
              value={form.description}
              maxLength={descriptionMaxLength(capabilities)}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t("create.descriptionPlaceholder")}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">{t("edit.leaveEmpty")}</p>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t("edit.updating") : t("edit.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
