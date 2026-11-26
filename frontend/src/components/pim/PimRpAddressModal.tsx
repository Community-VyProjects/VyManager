"use client";

import { useState } from "react";
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
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import type { PimRpAddress } from "@/lib/api/pim";
import { pimProblemArgs, pimRpGroupsWithDraft, pimRpProblem, type PimProblem } from "@/lib/api/pim-save-ops";
import type { ApiError } from "@/lib/types/api";

interface PimRpAddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (rp: PimRpAddress) => Promise<void>;
  existingRp?: PimRpAddress | null;
  /** Every configured RP address; Add may not reuse one and a group may not be served twice. */
  configuredRps: PimRpAddress[];
  /** Configured PIM interfaces; an RP cannot be saved while there is none. */
  configuredInterfaces: string[];
}

/** Seeded from props on mount; the page remounts it with a new key on every open. */
export function PimRpAddressModal({
  open,
  onOpenChange,
  onSubmit,
  existingRp,
  configuredRps,
  configuredInterfaces,
}: PimRpAddressModalProps) {
  const t = useTranslations("pim");
  const tc = useTranslations("common");
  const isEditMode = !!existingRp;

  const [address, setAddress] = useState(existingRp?.address ?? "");
  const [groups, setGroups] = useState<string[]>(existingRp ? [...existingRp.groups] : []);
  const [newGroup, setNewGroup] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const problemText = (problem: PimProblem) => t(`validation.${problem.key}`, pimProblemArgs(problem));

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  const handleAddGroup = () => {
    if (loading) return;
    const { groups: next, problem } = pimRpGroupsWithDraft(groups, newGroup);
    if (problem) {
      setError(problemText(problem));
      return;
    }
    setGroups(next);
    setNewGroup("");
    setError(null);
  };

  const handleSubmit = async () => {
    // A typed group that was not added yet is added on save, or blocks it.
    const folded = pimRpGroupsWithDraft(groups, newGroup);
    if (folded.problem) {
      setError(problemText(folded.problem));
      return;
    }
    const rp: PimRpAddress = { address: address.trim(), groups: folded.groups };
    const others = configuredRps.filter((r) => r.address !== existingRp?.address);
    const problem = pimRpProblem(existingRp ?? null, rp, others, configuredInterfaces);
    if (problem) {
      setError(problemText(problem));
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setGroups(folded.groups);
      setNewGroup("");
      await onSubmit(rp);
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("rpModal.editTitle") : t("addRpAddress")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("rpModal.editDescription", { address: existingRp?.address ?? "" })
              : t("rpModal.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-6 pb-2">
            {/* RP Address */}
            <div className="space-y-2">
              <Label htmlFor="pim-rp-address">{t("rpModal.rpAddress")}</Label>
              <Input
                id="pim-rp-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={isEditMode || loading}
                placeholder={t("rpModal.addressPlaceholder")}
                className={isEditMode ? "bg-muted font-mono" : "font-mono"}
              />
              <p className="text-xs text-muted-foreground">
                {t("rpModal.addressHelp")}
              </p>
            </div>

            {/* Multicast Groups */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="pim-rp-group">{t("rpModal.multicastGroups")}</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("rpModal.groupsHelp")}
                </p>
              </div>

              {groups.length > 0 && (
                <div className="space-y-2">
                  {groups.map((group, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 rounded-md border bg-muted font-mono text-sm">
                        {group}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                        aria-label={tc("delete")}
                        disabled={loading}
                        onClick={() => setGroups(groups.filter((_, i) => i !== index))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  id="pim-rp-group"
                  value={newGroup}
                  onChange={(e) => { setNewGroup(e.target.value); setError(null); }}
                  placeholder={t("rpModal.groupPlaceholder")}
                  className="font-mono"
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddGroup();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-label={tc("add")}
                  disabled={loading || !newGroup.trim()}
                  onClick={handleAddGroup}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? tc("saving") : t("adding")}
              </>
            ) : isEditMode ? (
              tc("saveChanges")
            ) : (
              t("addRpAddress")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
