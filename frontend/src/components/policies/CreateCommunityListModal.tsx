"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { communityListService } from "@/lib/api/community-list";

interface CreateCommunityListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCommunityListModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateCommunityListModalProps) {
  const t = useTranslations("bgpLists");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [action, setAction] = useState<"permit" | "deny">("permit");
  const [regex, setRegex] = useState("");

  const resetForm = () => {
    setName("");
    setDescription("");
    setRuleDescription("");
    setAction("permit");
    setRegex("");
    setError(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError(t("community.nameRequired"));
      return;
    }

    if (!regex.trim()) {
      setError(t("validation.regexRequired"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await communityListService.createCommunityList(
        name.trim(),
        description.trim() || null,
        {
          rule_number: 100,
          description: ruleDescription.trim() || null,
          action,
          regex: regex.trim(),
        }
      );

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("shared.failedToCreateList", { listType: t("types.community.modalName") }));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("shared.createList", { listType: t("types.community.title") })}</DialogTitle>
          <DialogDescription>
            {t("shared.createDescription", { listType: t("types.community.modalName") })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Community List Fields */}
          <div className="space-y-2">
            <Label htmlFor="name">{t("shared.listNameRequired", { listType: t("types.community.title") })}</Label>
            <Input
              id="name"
              placeholder={t("shared.eg", { value: "ALLOW_AS65000" })}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{tc("description")}</Label>
            <Textarea
              id="description"
              placeholder={tc("optionalDescription")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={2}
            />
          </div>

          {/* Initial Rule */}
          <div className="pt-4 border-t">
            <h3 className="font-semibold text-sm mb-4">{t("shared.initialRule")}</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="action">{t("shared.actionRequired")}</Label>
                <Select value={action} onValueChange={(v) => setAction(v as "permit" | "deny")} disabled={loading}>
                  <SelectTrigger id="action">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permit">{t("shared.permit")}</SelectItem>
                    <SelectItem value="deny">{t("shared.deny")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="regex">{t("shared.regexPatternRequired")}</Label>
                <Input
                  id="regex"
                  placeholder={t("shared.eg", { value: "^65000_" })}
                  value={regex}
                  onChange={(e) => setRegex(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  {t("asPath.regexHelp")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ruleDescription">{t("shared.ruleDescription")}</Label>
                <Input
                  id="ruleDescription"
                  placeholder={t("shared.ruleDescriptionPlaceholder")}
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? tc("creating") : t("shared.createList", { listType: t("types.community.title") })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
