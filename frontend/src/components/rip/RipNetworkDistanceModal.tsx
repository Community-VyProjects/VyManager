"use client";

import { useState } from "react";
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
import { NamedListSelect } from "@/components/ui/named-list-select";
import { useTranslations } from "next-intl";
import { AlertCircle, Loader2 } from "lucide-react";
import type { RipNetworkDistance } from "@/lib/api/rip";
import type { ApiError } from "@/lib/types/api";
import { DISTANCE_RANGE, inRange } from "@/lib/api/rip-ranges";
import { isIPv4Prefix } from "@/lib/validators/ipv4-prefix";

interface RipNetworkDistanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: RipNetworkDistance) => Promise<void>;
  existingEntry?: RipNetworkDistance | null;
  existingPrefixes: string[];
  accessListNames: string[];
}

/** Seeded from props on mount; the page remounts it with a new key on every open. */
export function RipNetworkDistanceModal({
  open,
  onOpenChange,
  onSubmit,
  existingEntry,
  existingPrefixes,
  accessListNames,
}: RipNetworkDistanceModalProps) {
  const t = useTranslations("rip");
  const tc = useTranslations("common");
  const isEditMode = !!existingEntry;

  const [prefix, setPrefix] = useState(existingEntry?.prefix ?? "");
  const [distance, setDistance] = useState(existingEntry?.distance != null ? String(existingEntry.distance) : "");
  const [accessList, setAccessList] = useState(existingEntry?.access_list ?? "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  const validate = (): string | null => {
    const trimmed = prefix.trim();
    if (!trimmed) return t("validation.prefixRequired");
    if (!isEditMode) {
      if (!isIPv4Prefix(trimmed)) return t("validation.prefixInvalid");
      if (existingPrefixes.includes(trimmed)) return t("validation.prefixExists");
    }
    if (!distance.trim()) return t("validation.distanceRequired");
    if (!inRange(distance, DISTANCE_RANGE)) return t("validation.distanceRange", DISTANCE_RANGE);
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const entry: RipNetworkDistance = {
      prefix: prefix.trim(),
      distance: Number(distance.trim()),
      access_list: accessList || null,
    };

    try {
      setLoading(true);
      setError(null);
      await onSubmit(entry);
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("ndModal.editTitle") : t("ndModal.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("ndModal.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Prefix */}
          <div className="space-y-2">
            <Label htmlFor="rip-nd-prefix">{t("filters.networkPrefix")}</Label>
            <Input
              id="rip-nd-prefix"
              placeholder={t("example", { value: "10.0.0.0/8" })}
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              disabled={isEditMode}
              className={isEditMode ? "bg-muted font-mono" : "font-mono"}
            />
          </div>

          {/* Distance */}
          <div className="space-y-2">
            <Label htmlFor="rip-nd-distance">{t("filters.distance")}</Label>
            <Input
              id="rip-nd-distance"
              type="number"
              min={DISTANCE_RANGE.min}
              max={DISTANCE_RANGE.max}
              placeholder={`${DISTANCE_RANGE.min}-${DISTANCE_RANGE.max}`}
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
          </div>

          {/* Access List */}
          <div className="space-y-2">
            <Label htmlFor="rip-nd-acl">{t("filters.accessList")} <span className="text-muted-foreground text-xs">{t("modal.optionalHint")}</span></Label>
            <NamedListSelect
              id="rip-nd-acl"
              value={accessList}
              names={accessListNames}
              onValueChange={setAccessList}
            />
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <pre className="text-sm text-destructive whitespace-pre-wrap flex-1">{error}</pre>
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
                {isEditMode ? tc("saving") : t("modal.adding")}
              </>
            ) : isEditMode ? (
              tc("saveChanges")
            ) : (
              tc("add")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
